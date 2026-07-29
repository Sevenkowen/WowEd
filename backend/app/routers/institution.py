import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_institution_id
from app.models.user import SchoolMembership, User
from app.routers.auth import get_current_user
from app.schemas.institution import (
    CreateLeadershipMemberBody,
    InstitutionSchoolDto,
    InstitutionUserDto,
    LeadershipMemberDto,
    LeadershipPositionDto,
    UpdateLeadershipMemberBody,
)
from app.schemas.user_profile import UserProfileDto
from app.services.institution_sync import link_user_to_institution, sync_membership_to_unit
from app.services.structure import assert_institution_administrator, assert_institution_manager
from app.services.user_profile import (
    apply_profile_to_user,
    assert_profile_unique,
    create_user_with_profile,
    display_name_from_row,
    find_existing_user_by_profile,
    profile_from_row,
)

router = APIRouter(prefix="/institution", tags=["institution"])

ADMIN_ONLY_ROLES = frozenset({"administrador", "representante_legal"})
_USER_PROFILE_COLS = """
    u.username, u.full_name, u.address, u.phone, u.dni, u.cuil, u.personal_email
"""


def _institution_reader_ctx(
    user: User = Depends(get_current_user),
    institution_id: str | None = None,
    db: Session = Depends(get_db),
) -> tuple[User, uuid.UUID, Session]:
    inst = resolve_institution_id(institution_id)
    assert_institution_manager(db, user, inst)
    return user, inst, db


def _institution_admin_ctx(
    user: User = Depends(get_current_user),
    institution_id: str | None = None,
    db: Session = Depends(get_db),
) -> tuple[User, uuid.UUID, Session]:
    inst = resolve_institution_id(institution_id)
    assert_institution_administrator(db, user, inst)
    return user, inst, db


def _assert_managed_directivo(position_key: str) -> None:
    if position_key in ADMIN_ONLY_ROLES:
        raise HTTPException(400, "Ese cargo solo puede gestionarse desde superadmin")


def _display_name_from_row(row) -> str:
    return display_name_from_row(row)


def _leadership_member_row(db: Session, membership_id: uuid.UUID, institution_id: uuid.UUID):
    return db.execute(
        text(
            f"""
            SELECT u.id,
                   sm.id AS membership_id,
                   u.email,
                   u.first_name,
                   u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key,
                   lp.label AS position_label,
                   s.id AS school_id,
                   s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE sm.id = :membership_id AND s.institution_id = :institution_id
            """
        ),
        {"membership_id": membership_id, "institution_id": institution_id},
    ).mappings().first()


def _row_to_leadership_member(row) -> LeadershipMemberDto:
    profile_data = profile_from_row(row)
    return LeadershipMemberDto(
        id=str(row["id"]),
        membershipId=str(row["membership_id"]),
        email=row["email"],
        firstName=row["first_name"],
        lastName=row["last_name"],
        displayName=_display_name_from_row(row),
        positionKey=row["position_key"],
        positionLabel=row["position_label"],
        schoolId=str(row["school_id"]),
        schoolName=row["school_name"],
        profile=UserProfileDto(**profile_data),
    )


def _assert_position_key(db: Session, position_key: str) -> None:
    exists = db.execute(
        text("SELECT 1 FROM leadership_positions WHERE key = :key"),
        {"key": position_key},
    ).first()
    if not exists:
        raise HTTPException(400, "Cargo inválido")


def _resolve_school_id(
    db: Session,
    institution_id: uuid.UUID,
    school_id: str | None,
) -> uuid.UUID:
    if school_id:
        try:
            school_uuid = uuid.UUID(school_id)
        except ValueError as exc:
            raise HTTPException(400, "schoolId inválido") from exc
        row = db.execute(
            text(
                """
                SELECT id FROM schools
                WHERE id = :school_id AND institution_id = :institution_id
                """
            ),
            {"school_id": school_uuid, "institution_id": institution_id},
        ).first()
        if not row:
            raise HTTPException(404, "Escuela no encontrada en la institución")
        return school_uuid

    row = db.execute(
        text(
            """
            SELECT id FROM schools
            WHERE institution_id = :institution_id
            ORDER BY name NULLS LAST
            LIMIT 1
            """
        ),
        {"institution_id": institution_id},
    ).first()
    if not row:
        raise HTTPException(400, "La institución no tiene escuelas configuradas")
    return row[0]


@router.get("/users", response_model=list[InstitutionUserDto])
def list_institution_users(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_reader_ctx),
) -> list[InstitutionUserDto]:
    _, inst, db = ctx
    rows = db.execute(
        text(
            """
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
            FROM users u
            JOIN school_memberships sm ON sm.user_id = u.id
            JOIN schools s ON s.id = sm.school_id
            WHERE s.institution_id = :institution_id
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            """
        ),
        {"institution_id": inst},
    ).mappings().all()

    return [
        InstitutionUserDto(
            id=str(row["id"]),
            email=row["email"],
            displayName=_display_name_from_row(row),
        )
        for row in rows
    ]


@router.get("/leadership-positions", response_model=list[LeadershipPositionDto])
def list_leadership_positions(db: Session = Depends(get_db)) -> list[LeadershipPositionDto]:
    rows = db.execute(
        text(
            """
            SELECT key, label
            FROM leadership_positions
            ORDER BY sort_order, label
            """
        ),
    ).mappings().all()
    return [LeadershipPositionDto(key=row["key"], label=row["label"]) for row in rows]


@router.get("/leadership-team", response_model=list[LeadershipMemberDto])
def list_leadership_team(
    directivos_only: bool = False,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_reader_ctx),
) -> list[LeadershipMemberDto]:
    _, inst, db = ctx
    role_filter = ""
    if directivos_only:
        role_filter = "AND sm.role NOT IN ('administrador', 'representante_legal')"
    rows = db.execute(
        text(
            f"""
            SELECT DISTINCT ON (u.id)
                   u.id,
                   sm.id AS membership_id,
                   u.email,
                   u.first_name,
                   u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key,
                   lp.label AS position_label,
                   s.id AS school_id,
                   s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE s.institution_id = :institution_id
              {role_filter}
            ORDER BY u.id, lp.sort_order, u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            """
        ),
        {"institution_id": inst},
    ).mappings().all()

    return [_row_to_leadership_member(row) for row in rows]


@router.get("/schools", response_model=list[InstitutionSchoolDto])
def list_institution_schools(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_reader_ctx),
) -> list[InstitutionSchoolDto]:
    _, inst, db = ctx
    rows = db.execute(
        text(
            """
            SELECT id, name
            FROM schools
            WHERE institution_id = :institution_id
            ORDER BY name NULLS LAST
            """
        ),
        {"institution_id": inst},
    ).mappings().all()
    return [
        InstitutionSchoolDto(id=str(row["id"]), name=row["name"] or "Escuela")
        for row in rows
    ]


@router.post("/leadership-team", response_model=LeadershipMemberDto, status_code=201)
def create_leadership_member(
    body: CreateLeadershipMemberBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> LeadershipMemberDto:
    _, inst, db = ctx
    _assert_managed_directivo(body.positionKey)
    _assert_position_key(db, body.positionKey)
    school_uuid = _resolve_school_id(db, inst, body.schoolId)

    user = find_existing_user_by_profile(db, body)
    if user:
        assert_profile_unique(db, body, exclude_user_id=user.id)
        apply_profile_to_user(user, body)
        membership = db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id,
                SchoolMembership.school_id == school_uuid,
            )
        )
        if membership:
            leadership = db.execute(
                text("SELECT 1 FROM leadership_positions WHERE key = :key"),
                {"key": membership.role or ""},
            ).first()
            if leadership:
                raise HTTPException(
                    409,
                    "Ese usuario ya es miembro del equipo directivo en esta escuela",
                )
            membership.role = body.positionKey
        else:
            membership = SchoolMembership(
                id=uuid.uuid4(),
                user_id=user.id,
                school_id=school_uuid,
                role=body.positionKey,
            )
            db.add(membership)
    else:
        user = create_user_with_profile(db, body, body.password)
        db.flush()
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=user.id,
            school_id=school_uuid,
            role=body.positionKey,
        )
        db.add(membership)

    db.flush()
    link_user_to_institution(db, user.id, inst)
    sync_membership_to_unit(db, membership.id, body.positionKey)
    db.commit()

    created = _leadership_member_row(db, membership.id, inst)
    if not created:
        raise HTTPException(500, "No se pudo cargar el miembro creado")
    return _row_to_leadership_member(created)


@router.patch("/leadership-team/{membership_id}", response_model=LeadershipMemberDto)
def update_leadership_member(
    membership_id: str,
    body: UpdateLeadershipMemberBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> LeadershipMemberDto:
    _, inst, db = ctx
    _assert_managed_directivo(body.positionKey)
    try:
        membership_uuid = uuid.UUID(membership_id)
    except ValueError as exc:
        raise HTTPException(400, "membership_id inválido") from exc

    row = _leadership_member_row(db, membership_uuid, inst)
    if not row:
        raise HTTPException(404, "Miembro no encontrado")

    _assert_position_key(db, body.positionKey)

    user = db.get(User, uuid.UUID(str(row["id"])))
    membership = db.get(SchoolMembership, membership_uuid)
    if not user or not membership:
        raise HTTPException(404, "Miembro no encontrado")

    assert_profile_unique(db, body, exclude_user_id=user.id)
    apply_profile_to_user(user, body)
    if body.password:
        from app.services.security import hash_password

        user.password_hash = hash_password(body.password)
    membership.role = body.positionKey

    if body.schoolId:
        school_uuid = _resolve_school_id(db, inst, body.schoolId)
        membership.school_id = school_uuid
        db.execute(
            text(
                """
                UPDATE unit_memberships
                SET unit_id = :school_id
                WHERE source_membership_id = :membership_id
                """
            ),
            {"school_id": school_uuid, "membership_id": membership_uuid},
        )

    db.flush()
    sync_membership_to_unit(db, membership.id, body.positionKey)
    db.commit()

    updated = _leadership_member_row(db, membership_uuid, inst)
    if not updated:
        raise HTTPException(500, "No se pudo cargar el miembro actualizado")
    return _row_to_leadership_member(updated)


@router.delete("/leadership-team/{membership_id}", status_code=204)
def delete_leadership_member(
    membership_id: str,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> None:
    _, inst, db = ctx
    try:
        membership_uuid = uuid.UUID(membership_id)
    except ValueError as exc:
        raise HTTPException(400, "membership_id inválido") from exc

    row = _leadership_member_row(db, membership_uuid, inst)
    if not row:
        raise HTTPException(404, "Miembro no encontrado")

    membership = db.get(SchoolMembership, membership_uuid)
    if membership:
        if membership.role in ADMIN_ONLY_ROLES:
            raise HTTPException(400, "No se puede eliminar este cargo desde aquí")
        db.execute(
            text("DELETE FROM unit_memberships WHERE source_membership_id = :id"),
            {"id": membership_uuid},
        )
        db.delete(membership)
        db.commit()
