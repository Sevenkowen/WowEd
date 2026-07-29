import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_superadmin
from app.models.user import School, SchoolMembership, User
from app.schemas.superadmin import (
    BulkPersonnelImportBody,
    BulkPersonnelImportResultDto,
    CreateInstitutionMemberBody,
    CreateInstitutionalRoleBody,
    CreatePoolAdministratorBody,
    CreateSchoolBody,
    CreateSuperadminInstitutionBody,
    InstitutionMemberDto,
    InstitutionSchoolDto,
    PaginatedAdministratorsResponseDto,
    SuperadminAdministratorDto,
    UnassignedAdministratorDto,
    SuperadminAcademicStructureDto,
    SuperadminDashboardStatsDto,
    SuperadminGradeDto,
    SuperadminInstitutionDto,
    PaginatedInstitutionsResponseDto,
    PaginatedPersonnelResponseDto,
    SuperadminPersonnelDto,
    SuperadminPersonnelRoleDto,
    SuperadminRoleDto,
    SuperadminSubjectAssignmentDto,
    UpdateInstitutionalRoleBody,
    UpdateSchoolBody,
    UpdateSuperadminInstitutionBody,
    UpdateSuperadminPersonnelBody,
)
from app.schemas.user_profile import UserProfileDto
from app.services.catalog_seed import ensure_catalog_seeded
from app.services.institution_sync import (
    apply_personnel_membership_update,
    delete_institution_cascade,
    link_user_to_institution,
    resolve_school_for_institution,
    sync_membership_to_unit,
    sync_personnel_role_memberships,
    sync_school_to_organizational_unit,
)
from app.services.module_permissions import reserved_modules_for_role, sanitize_module_keys
from app.services.personnel_roles import (
    assert_assignable_position,
    build_personnel_role_dtos,
    normalize_role_key,
    resolve_position_label,
)
from app.services.personnel_bulk import import_personnel_rows
from app.services.structure import assign_school_director
from app.services.institution_query import (
    count_institutions,
    paginate_institution_ids,
    resolve_page_size,
    total_pages,
)
from app.services.personnel_query import (
    count_superadmin_administrators,
    count_superadmin_personnel_users,
    fetch_superadmin_administrator_rows,
    paginate_superadmin_administrator_entries,
    paginate_superadmin_personnel_user_ids,
)
from app.services.security import hash_password
from app.services.user_profile import (
    apply_profile_to_user,
    assert_profile_unique,
    create_user_with_profile,
    display_name_from_row,
    display_name_for_user,
    find_existing_user_by_profile,
    profile_from_row,
)

router = APIRouter(prefix="/superadmin", tags=["superadmin"])

_INSTITUTION_COLS = """
    i.id, i.name, i.responsible_name, i.country, i.province, i.city, i.address, i.cuit, i.phone, i.contact_email, i.is_active
"""

_SCHOOL_DATA_COLS = """
    s.address, s.city, s.province, s.cuit, s.phone, s.contact_email,
    s.shift_morning, s.shift_afternoon, s.shift_night
"""

_USER_PROFILE_COLS = """
    u.username, u.full_name, u.address, u.phone, u.dni, u.cuil, u.personal_email
"""


def _display_name_from_row(row) -> str:
    return display_name_from_row(row)


def _institution_row(db: Session, institution_id: uuid.UUID):
    return db.execute(
        text(
            f"""
            SELECT {_INSTITUTION_COLS},
                   (SELECT COUNT(*)::int FROM schools s WHERE s.institution_id = i.id) AS school_count
            FROM institutions i
            WHERE i.id = :institution_id
            """
        ),
        {"institution_id": institution_id},
    ).mappings().first()


def _row_to_institution(row) -> SuperadminInstitutionDto:
    return SuperadminInstitutionDto(
        id=str(row["id"]),
        name=row["name"],
        responsibleName=row["responsible_name"],
        country=row["country"],
        province=row["province"],
        city=row["city"],
        address=row["address"],
        cuit=row["cuit"],
        phone=row["phone"],
        contactEmail=row["contact_email"],
        isActive=bool(row["is_active"]) if row["is_active"] is not None else True,
        schoolCount=row["school_count"] or 0,
    )


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _platform_role_label(db: Session, code: str, fallback: str) -> str:
    row = db.execute(
        text("SELECT name FROM platform_roles WHERE code = :code"),
        {"code": code},
    ).first()
    return row[0] if row else fallback


def _platform_roles_from_db(db: Session) -> list[SuperadminRoleDto]:
    rows = db.execute(
        text(
            """
            SELECT id, code, name, description
            FROM platform_roles
            ORDER BY sort_order, name
            """
        ),
    ).mappings().all()
    return [
        SuperadminRoleDto(
            id=str(row["id"]),
            name=row["name"],
            description=row["description"],
            scopeLabel="Sistema Global",
            scopeType="system",
            roleCode=row["code"],
            isSystemReserved=True,
            canEdit=False,
            canDelete=False,
            allowedModules=reserved_modules_for_role(row["code"]),
        )
        for row in rows
    ]


def _school_row(db: Session, school_id: uuid.UUID):
    return db.execute(
        text(
            f"""
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   {_SCHOOL_DATA_COLS},
                   dir.membership_id AS director_membership_id,
                   dir.display_name AS director_name
            FROM schools s
            JOIN institutions i ON i.id = s.institution_id
            LEFT JOIN LATERAL (
                SELECT sm.id AS membership_id,
                       COALESCE(NULLIF(trim(COALESCE(u.full_name, '')), ''), u.email) AS display_name
                FROM school_memberships sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.school_id = s.id AND sm.role = 'director'
                ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST
                LIMIT 1
            ) dir ON true
            WHERE s.id = :school_id
            """
        ),
        {"school_id": school_id},
    ).mappings().first()


def _row_to_school(row) -> InstitutionSchoolDto:
    return InstitutionSchoolDto(
        id=str(row["id"]),
        name=row["name"] or "Colegio",
        institutionId=str(row["institution_id"]),
        institutionName=row["institution_name"] or "Institución",
        address=row["address"],
        city=row["city"],
        province=row["province"],
        cuit=row["cuit"],
        phone=row["phone"],
        contactEmail=row["contact_email"],
        directorName=row["director_name"],
        directorMembershipId=str(row["director_membership_id"]) if row["director_membership_id"] else None,
        shiftMorning=bool(row["shift_morning"]),
        shiftAfternoon=bool(row["shift_afternoon"]),
        shiftNight=bool(row["shift_night"]),
    )


def _resolve_school(db: Session, institution_id: uuid.UUID, school_id: str | None) -> uuid.UUID:
    if school_id:
        try:
            school_uuid = uuid.UUID(school_id)
        except ValueError as exc:
            raise HTTPException(400, "schoolId inválido") from exc
        row = db.execute(
            text("SELECT id FROM schools WHERE id = :id AND institution_id = :institution_id"),
            {"id": school_uuid, "institution_id": institution_id},
        ).first()
        if not row:
            raise HTTPException(404, "Colegio no encontrado")
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
        raise HTTPException(400, "La institución no tiene colegios configurados")
    return row[0]


def _assert_position(db: Session, institution_id: uuid.UUID, position_key: str) -> str:
    try:
        assert_assignable_position(db, institution_id, position_key)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return resolve_position_label(db, institution_id, position_key)


def _member_row(db: Session, membership_id: uuid.UUID, institution_id: uuid.UUID):
    return db.execute(
        text(
            f"""
            SELECT u.id, sm.id AS membership_id, u.email, u.first_name, u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key, lp.label AS position_label,
                   s.id AS school_id, s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE sm.id = :membership_id AND s.institution_id = :institution_id
            """
        ),
        {"membership_id": membership_id, "institution_id": institution_id},
    ).mappings().first()


def _row_to_member(row) -> InstitutionMemberDto:
    profile_data = profile_from_row(row)
    return InstitutionMemberDto(
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


def _row_to_administrator(row) -> SuperadminAdministratorDto:
    profile_data = profile_from_row(row)
    is_unassigned = bool(row.get("is_unassigned"))
    return SuperadminAdministratorDto(
        id=str(row["user_id"]),
        membershipId=str(row["membership_id"]) if row.get("membership_id") else None,
        email=row["email"],
        firstName=row["first_name"],
        lastName=row["last_name"],
        displayName=_display_name_from_row(row),
        positionKey=row["position_key"],
        positionLabel=row["position_label"],
        schoolId=str(row["school_id"]) if row.get("school_id") else None,
        schoolName=row.get("school_name"),
        profile=UserProfileDto(**profile_data),
        institutionId=str(row["institution_id"]) if row.get("institution_id") else None,
        institutionName=row.get("institution_name") if not is_unassigned else "Sin asignar",
        isUnassigned=is_unassigned,
    )


def _administrator_rows_by_membership_ids(db: Session, membership_ids: list[uuid.UUID]):
    if not membership_ids:
        return []
    rows = db.execute(
        text(
            f"""
            SELECT u.id, sm.id AS membership_id, u.email, u.first_name, u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key, lp.label AS position_label,
                   s.id AS school_id, s.name AS school_name,
                   i.id AS institution_id, i.name AS institution_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN institutions i ON i.id = s.institution_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE sm.id = ANY(:membership_ids)
            """
        ),
        {"membership_ids": membership_ids},
    ).mappings().all()
    by_id = {row["membership_id"]: row for row in rows}
    return [by_id[membership_id] for membership_id in membership_ids if membership_id in by_id]


def _row_to_unassigned_administrator(row) -> UnassignedAdministratorDto:
    return UnassignedAdministratorDto(
        id=str(row["id"]),
        displayName=display_name_from_row(row),
        email=row["email"],
        username=row.get("username"),
    )


def _assert_unassigned_administrator(db: Session, user_uuid: uuid.UUID) -> User:
    user = db.get(User, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(404, "Administrador no encontrado")
    if user.is_owner:
        raise HTTPException(400, "No se puede asignar ese usuario como administrador")
    assigned = db.execute(
        text(
            """
            SELECT 1
            FROM school_memberships sm
            WHERE sm.user_id = :user_id AND sm.role = 'administrador'
            LIMIT 1
            """
        ),
        {"user_id": user_uuid},
    ).first()
    if assigned:
        raise HTTPException(400, "Ese administrador ya está asignado a una institución")
    return user


def _ensure_school_for_administrator(db: Session, institution_id: uuid.UUID) -> uuid.UUID:
    try:
        return resolve_school_for_institution(db, institution_id, None)
    except ValueError:
        inst_row = db.execute(
            text("SELECT name FROM institutions WHERE id = :id"),
            {"id": institution_id},
        ).first()
        if not inst_row:
            raise HTTPException(404, "Institución no encontrada")
        school_id = uuid.uuid4()
        school_name = f"{inst_row[0].strip()} - Sede principal"
        ensure_catalog_seeded(db, institution_id)
        db.execute(
            text(
                """
                INSERT INTO schools (
                  id, institution_id, name, shift_morning, shift_afternoon, shift_night
                )
                VALUES (:id, :institution_id, :name, true, true, false)
                """
            ),
            {
                "id": school_id,
                "institution_id": institution_id,
                "name": school_name,
            },
        )
        db.flush()
        sync_school_to_organizational_unit(db, school_id)
        return school_id


def _assign_administrator_to_institution(
    db: Session,
    institution_id: uuid.UUID,
    school_id: uuid.UUID,
    user: User,
) -> SchoolMembership:
    membership = SchoolMembership(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school_id,
        role="administrador",
    )
    db.add(membership)
    db.flush()
    link_user_to_institution(db, user.id, institution_id)
    sync_membership_to_unit(db, membership.id, "administrador")
    user.pending_administrador = False
    return membership


def _institution_administrator_user_ids(db: Session, institution_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT u.id
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            WHERE s.institution_id = :institution_id AND sm.role = 'administrador'
            """
        ),
        {"institution_id": institution_id},
    ).fetchall()
    return {row[0] for row in rows}


def _release_administrator_to_pool(
    db: Session,
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
) -> None:
    membership_rows = db.execute(
        text(
            """
            SELECT sm.id
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id
              AND s.institution_id = :institution_id
              AND sm.role = 'administrador'
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    ).fetchall()
    for row in membership_rows:
        membership_id = row[0]
        db.execute(
            text("DELETE FROM unit_memberships WHERE source_membership_id = :membership_id"),
            {"membership_id": membership_id},
        )
        db.execute(
            text("DELETE FROM school_memberships WHERE id = :membership_id"),
            {"membership_id": membership_id},
        )

    remaining = db.execute(
        text(
            """
            SELECT 1
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id AND s.institution_id = :institution_id
            LIMIT 1
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    ).first()
    if not remaining:
        db.execute(
            text(
                """
                DELETE FROM user_institutions
                WHERE user_id = :user_id AND institution_id = :institution_id
                """
            ),
            {"user_id": user_id, "institution_id": institution_id},
        )
        db.execute(
            text(
                """
                DELETE FROM institution_memberships
                WHERE user_id = :user_id AND institution_id = :institution_id
                """
            ),
            {"user_id": user_id, "institution_id": institution_id},
        )

    user = db.get(User, user_id)
    if user and not user.is_owner:
        user.pending_administrador = True


def _replace_institution_administrator(
    db: Session,
    institution_id: uuid.UUID,
    new_admin_uuid: uuid.UUID,
) -> None:
    current_ids = _institution_administrator_user_ids(db, institution_id)
    if new_admin_uuid in current_ids and len(current_ids) == 1:
        return

    for user_id in current_ids:
        if user_id != new_admin_uuid:
            _release_administrator_to_pool(db, user_id, institution_id)

    if new_admin_uuid in current_ids:
        return

    school_id = _ensure_school_for_administrator(db, institution_id)
    admin_user = _assert_unassigned_administrator(db, new_admin_uuid)
    _assign_administrator_to_institution(db, institution_id, school_id, admin_user)
    db.execute(
        text(
            """
            UPDATE institutions
            SET responsible_name = :responsible_name
            WHERE id = :institution_id
            """
        ),
        {
            "institution_id": institution_id,
            "responsible_name": admin_user.full_name or display_name_for_user(admin_user),
        },
    )


def _personnel_roles_for_user(db: Session, user_id: uuid.UUID, rows: list) -> list[SuperadminPersonnelRoleDto]:
    roles = build_personnel_role_dtos(db, rows)
    is_owner = any(bool(row.get("is_owner")) for row in rows)

    if is_owner and not any(role.key == "superadmin" for role in roles):
        roles.insert(
            0,
            SuperadminPersonnelRoleDto(
                key="superadmin",
                label=_platform_role_label(db, "superadmin", "Super Admin"),
                removable=False,
                roleCode="superadmin",
                isSystemReserved=True,
            ),
        )
    return roles


def _personnel_from_group(db: Session, entry: dict, rows: list) -> SuperadminPersonnelDto:
    user_id = entry["id"]
    is_owner = bool(entry.get("is_owner"))
    return SuperadminPersonnelDto(
        id=user_id,
        displayName=_display_name_from_row(entry),
        email=entry["email"],
        dni=entry.get("dni"),
        cuil=entry.get("cuil"),
        phone=entry.get("phone"),
        profile=UserProfileDto(**profile_from_row(entry)),
        roles=_personnel_roles_for_user(db, uuid.UUID(user_id), rows),
        isActive=bool(entry.get("is_active", True)),
        mustChangePassword=bool(entry.get("must_change_password", False)),
        isOwner=is_owner,
        canEdit=True,
        canDelete=not is_owner,
        institutionId=str(entry["institution_id"]) if entry.get("institution_id") else None,
        schoolId=str(entry["school_id"]) if entry.get("school_id") else None,
        membershipId=str(entry["membership_id"]) if entry.get("membership_id") else None,
        positionKey=entry.get("position_key"),
    )


def _personnel_rows(
    db: Session,
    user_id: uuid.UUID | None = None,
    user_ids: list[uuid.UUID] | None = None,
):
    user_filter = ""
    params: dict = {}
    if user_id:
        user_filter = "AND u.id = :user_id"
        params["user_id"] = user_id
    elif user_ids is not None:
        if not user_ids:
            return []
        user_filter = "AND u.id = ANY(:user_ids)"
        params["user_ids"] = user_ids
    return db.execute(
        text(
            f"""
            SELECT u.id, u.email, u.first_name, u.last_name, u.dni, u.cuil, u.phone,
                   u.username, u.full_name, u.address, u.personal_email,
                   COALESCE(u.is_active, true) AS is_active,
                   COALESCE(u.must_change_password, false) AS must_change_password,
                   COALESCE(u.is_owner, false) AS is_owner,
                   sm.id AS membership_id,
                   s.id AS school_id,
                   s.institution_id AS institution_id,
                   sm.role AS position_key,
                   COALESCE(lp.label, ir.name) AS position_label,
                   um.teaching_role
            FROM users u
            LEFT JOIN school_memberships sm ON sm.user_id = u.id
            LEFT JOIN schools s ON s.id = sm.school_id
            LEFT JOIN leadership_positions lp ON lp.key = sm.role
            LEFT JOIN institutional_roles ir
              ON ir.id::text = sm.role AND ir.institution_id = s.institution_id
            LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
            WHERE (COALESCE(u.is_owner, false) = true
               OR sm.id IS NOT NULL
               OR um.id IS NOT NULL)
            {user_filter}
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            """
        ),
        params,
    ).mappings().all()


def _build_personnel_list(
    db: Session,
    rows,
    *,
    institution_scope: uuid.UUID | None = None,
) -> list[SuperadminPersonnelDto]:
    grouped: dict[str, dict] = {}
    rows_by_user: dict[str, list] = {}
    for row in rows:
        user_id = str(row["id"])
        rows_by_user.setdefault(user_id, []).append(row)
        if user_id not in grouped:
            grouped[user_id] = {
                "id": user_id,
                "email": row["email"],
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "dni": row["dni"],
                "cuil": row["cuil"],
                "phone": row["phone"],
                "username": row["username"],
                "full_name": row["full_name"],
                "address": row["address"],
                "personal_email": row["personal_email"],
                "is_active": bool(row["is_active"]),
                "must_change_password": bool(row["must_change_password"]),
                "is_owner": bool(row["is_owner"]),
            }
        if row.get("membership_id"):
            row_institution_id = row.get("institution_id")
            current_institution_id = grouped[user_id].get("institution_id")
            prefer_membership = not grouped[user_id].get("membership_id")
            if institution_scope is not None:
                if row_institution_id == institution_scope:
                    prefer_membership = True
                elif current_institution_id == institution_scope:
                    prefer_membership = False
            if prefer_membership:
                grouped[user_id]["membership_id"] = row["membership_id"]
                grouped[user_id]["school_id"] = row.get("school_id")
                grouped[user_id]["institution_id"] = row_institution_id
                grouped[user_id]["position_key"] = row.get("position_key")
    return [
        _personnel_from_group(db, entry, rows_by_user[user_id])
        for user_id, entry in grouped.items()
    ]


def _build_personnel_list_ordered(
    db: Session,
    rows,
    user_ids: list[uuid.UUID],
    *,
    institution_scope: uuid.UUID | None = None,
) -> list[SuperadminPersonnelDto]:
    items = _build_personnel_list(db, rows, institution_scope=institution_scope)
    by_id = {item.id: item for item in items}
    return [by_id[str(user_id)] for user_id in user_ids if str(user_id) in by_id]


@router.get("/personnel", response_model=PaginatedPersonnelResponseDto)
def list_personnel(
    page: int = Query(1, ge=1),
    page_size: int | None = Query(None, alias="pageSize"),
    limit: int | None = Query(None),
    search: str | None = Query(None),
    q: str | None = Query(None),
    institution_id: str | None = Query(None, alias="institutionId"),
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> PaginatedPersonnelResponseDto:
    effective_page_size = resolve_page_size(page_size, limit)
    effective_search = search if search is not None else q
    institution_uuid = None
    if institution_id:
        try:
            institution_uuid = uuid.UUID(institution_id)
        except ValueError as exc:
            raise HTTPException(400, "institutionId inválido") from exc
        if not _institution_row(db, institution_uuid):
            raise HTTPException(404, "Institución no encontrada")

    total = count_superadmin_personnel_users(
        db,
        effective_search,
        institution_id=institution_uuid,
    )
    user_ids = paginate_superadmin_personnel_user_ids(
        db,
        page=page,
        page_size=effective_page_size,
        search=effective_search,
        institution_id=institution_uuid,
    )
    rows = _personnel_rows(db, user_ids=user_ids)
    items = _build_personnel_list_ordered(db, rows, user_ids, institution_scope=institution_uuid)
    return PaginatedPersonnelResponseDto(
        items=items,
        total=total,
        page=page,
        pageSize=effective_page_size,
        totalPages=total_pages(total, effective_page_size),
    )


@router.get("/administradores", response_model=PaginatedAdministratorsResponseDto)
def list_all_administradores(
    page: int = Query(1, ge=1),
    page_size: int | None = Query(None, alias="pageSize"),
    limit: int | None = Query(None),
    search: str | None = Query(None),
    q: str | None = Query(None),
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> PaginatedAdministratorsResponseDto:
    effective_page_size = resolve_page_size(page_size, limit)
    effective_search = search if search is not None else q

    total = count_superadmin_administrators(db, effective_search)
    entries = paginate_superadmin_administrator_entries(
        db,
        page=page,
        page_size=effective_page_size,
        search=effective_search,
    )
    rows = fetch_superadmin_administrator_rows(db, entries)
    items = [_row_to_administrator(row) for row in rows]
    return PaginatedAdministratorsResponseDto(
        items=items,
        total=total,
        page=page,
        pageSize=effective_page_size,
        totalPages=total_pages(total, effective_page_size),
    )


@router.get("/administradores/unassigned", response_model=list[UnassignedAdministratorDto])
def list_unassigned_administradores(
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[UnassignedAdministratorDto]:
    rows = db.execute(
        text(
            """
            SELECT u.id, u.email, u.first_name, u.last_name, u.username, u.full_name, u.personal_email
            FROM users u
            WHERE COALESCE(u.pending_administrador, false) = true
              AND COALESCE(u.is_owner, false) = false
              AND COALESCE(u.is_active, true) = true
              AND NOT EXISTS (
                SELECT 1
                FROM school_memberships sm
                WHERE sm.user_id = u.id AND sm.role = 'administrador'
              )
            ORDER BY u.full_name NULLS LAST, u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            """
        ),
    ).mappings().all()
    return [_row_to_unassigned_administrator(row) for row in rows]


@router.post("/administradores/pool", response_model=UnassignedAdministratorDto, status_code=201)
def create_pool_administrador(
    body: CreatePoolAdministratorBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> UnassignedAdministratorDto:
    user = create_user_with_profile(db, body, body.password)
    user.pending_administrador = True
    db.flush()
    db.commit()
    db.refresh(user)
    return UnassignedAdministratorDto(
        id=str(user.id),
        displayName=display_name_for_user(user),
        email=user.email,
        username=user.username,
    )


@router.patch("/personnel/{user_id}", response_model=SuperadminPersonnelDto)
def update_personnel(
    user_id: str,
    body: UpdateSuperadminPersonnelBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminPersonnelDto:
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(400, "userId inválido") from exc

    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    rows = _personnel_rows(db, user_uuid)
    if not rows:
        raise HTTPException(404, "Usuario no encontrado en el personal")

    assert_profile_unique(db, body, exclude_user_id=user_uuid)
    apply_profile_to_user(user, body)

    if body.isActive is not None:
        db.execute(
            text("UPDATE users SET is_active = :is_active WHERE id = :user_id"),
            {"is_active": body.isActive, "user_id": user_uuid},
        )
    if body.mustChangePassword is not None:
        db.execute(
            text("UPDATE users SET must_change_password = :flag WHERE id = :user_id"),
            {"flag": body.mustChangePassword, "user_id": user_uuid},
        )
    if body.password:
        db.execute(
            text("UPDATE users SET password_hash = :password_hash WHERE id = :user_id"),
            {"password_hash": hash_password(body.password), "user_id": user_uuid},
        )

    target_institution_id = None
    if body.institutionId:
        try:
            target_institution_id = uuid.UUID(body.institutionId)
        except ValueError as exc:
            raise HTTPException(400, "institutionId inválido") from exc
        link_user_to_institution(db, user_uuid, target_institution_id)

    institution_for_membership = target_institution_id
    if institution_for_membership is None:
        inst_row = db.execute(
            text(
                """
                SELECT s.institution_id
                FROM school_memberships sm
                JOIN schools s ON s.id = sm.school_id
                WHERE sm.user_id = :user_id
                ORDER BY sm.id
                LIMIT 1
                """
            ),
            {"user_id": user_uuid},
        ).first()
        if inst_row:
            institution_for_membership = inst_row[0]
    if institution_for_membership is None and body.schoolId:
        try:
            school_uuid = uuid.UUID(body.schoolId)
        except ValueError as exc:
            raise HTTPException(400, "schoolId inválido") from exc
        inst_row = db.execute(
            text("SELECT institution_id FROM schools WHERE id = :school_id"),
            {"school_id": school_uuid},
        ).first()
        if inst_row:
            institution_for_membership = inst_row[0]

    if body.roleKeys is not None:
        if institution_for_membership is None:
            raise HTTPException(400, "Seleccioná una institución para actualizar roles")
        school_for_apply = body.schoolId
        if target_institution_id is not None and school_for_apply is None:
            school_for_apply = ""
        try:
            sync_personnel_role_memberships(
                db,
                user_id=user_uuid,
                institution_id=institution_for_membership,
                school_id=school_for_apply,
                role_keys=body.roleKeys,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
    elif body.positionKey is not None or body.schoolId is not None or target_institution_id is not None:
        membership_uuid = None
        if body.membershipId:
            try:
                membership_uuid = uuid.UUID(body.membershipId)
            except ValueError as exc:
                raise HTTPException(400, "membershipId inválido") from exc
        school_for_apply = body.schoolId
        if target_institution_id is not None and school_for_apply is None:
            school_for_apply = ""
        if institution_for_membership is None:
            raise HTTPException(400, "Seleccioná una institución para actualizar colegio o rol")
        try:
            apply_personnel_membership_update(
                db,
                user_id=user_uuid,
                institution_id=institution_for_membership,
                membership_id=membership_uuid,
                position_key=body.positionKey,
                school_id=school_for_apply,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc

    db.commit()
    updated_rows = _personnel_rows(db, user_uuid)
    result = _build_personnel_list(db, updated_rows, institution_scope=institution_for_membership)
    if not result:
        raise HTTPException(500, "No se pudo cargar el usuario actualizado")
    return result[0]


@router.delete("/personnel/{user_id}", status_code=204)
def delete_personnel(
    user_id: str,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> None:
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(400, "userId inválido") from exc

    if user_uuid == current_user.id:
        raise HTTPException(400, "No podés eliminar tu propio usuario")

    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    if user.is_owner:
        raise HTTPException(400, "No se puede eliminar un usuario SuperAdmin/Owner")

    rows = _personnel_rows(db, user_uuid)
    if not rows:
        raise HTTPException(404, "Usuario no encontrado en el personal")

    db.execute(text("DELETE FROM calendar_event_assignees WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(text("DELETE FROM task_assignees WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(
        text(
            """
            DELETE FROM unit_memberships
            WHERE user_id = :user_id
               OR source_membership_id IN (
                    SELECT id FROM school_memberships WHERE user_id = :user_id
               )
            """
        ),
        {"user_id": user_uuid},
    )
    db.execute(text("DELETE FROM school_memberships WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(text("DELETE FROM institution_memberships WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(text("DELETE FROM user_institutions WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(text("DELETE FROM company_memberships WHERE user_id = :user_id"), {"user_id": user_uuid})
    db.execute(
        text("DELETE FROM class_schedule_instances WHERE teacher_user_id = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(text("DELETE FROM class_schedules WHERE teacher_user_id = :user_id"), {"user_id": user_uuid})
    db.execute(
        text("DELETE FROM event_assignments WHERE assigned_user_id = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("DELETE FROM task_assignments WHERE assigned_user_id = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE event_activity_logs SET performed_by = NULL WHERE performed_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE task_activity_logs SET performed_by = NULL WHERE performed_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE event_attachments SET uploaded_by = NULL WHERE uploaded_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE task_attachments SET uploaded_by = NULL WHERE uploaded_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE audit_logs SET user_id = NULL WHERE user_id = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE calendar_events SET created_by = NULL WHERE created_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE tasks SET created_by = NULL WHERE created_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE calendar_event_assignees SET assigned_by = NULL WHERE assigned_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(
        text("UPDATE task_assignees SET assigned_by = NULL WHERE assigned_by = :user_id"),
        {"user_id": user_uuid},
    )
    db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_uuid})
    db.commit()


def _custom_role_row(db: Session, role_id: uuid.UUID):
    return db.execute(
        text(
            """
            SELECT ir.id, ir.name, ir.description, ir.institution_id, i.name AS institution_name,
                   ir.allowed_modules
            FROM institutional_roles ir
            JOIN institutions i ON i.id = ir.institution_id
            WHERE ir.id = :role_id
            """
        ),
        {"role_id": role_id},
    ).mappings().first()


def _parse_allowed_modules(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return sanitize_module_keys(raw)
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return sanitize_module_keys(parsed if isinstance(parsed, list) else [])
        except json.JSONDecodeError:
            return []
    return sanitize_module_keys(list(raw) if hasattr(raw, "__iter__") else [])


def _row_to_custom_role(row) -> SuperadminRoleDto:
    return SuperadminRoleDto(
        id=str(row["id"]),
        name=row["name"],
        description=row["description"] or f"Rol institucional: {row['name']}",
        scopeLabel=row["institution_name"] or "Institución",
        scopeType="institution",
        institutionId=str(row["institution_id"]),
        isSystemReserved=False,
        canEdit=True,
        canDelete=True,
        allowedModules=_parse_allowed_modules(row.get("allowed_modules")),
    )


@router.get("/roles", response_model=list[SuperadminRoleDto])
def list_roles(
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[SuperadminRoleDto]:
    rows = db.execute(
        text(
            """
            SELECT ir.id, ir.name, ir.description, ir.institution_id, i.name AS institution_name,
                   ir.allowed_modules
            FROM institutional_roles ir
            JOIN institutions i ON i.id = ir.institution_id
            ORDER BY i.name NULLS LAST, ir.name NULLS LAST
            """
        ),
    ).mappings().all()
    return _platform_roles_from_db(db) + [_row_to_custom_role(row) for row in rows]


@router.post("/roles", response_model=SuperadminRoleDto, status_code=201)
def create_institutional_role(
    body: CreateInstitutionalRoleBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminRoleDto:
    try:
        institution_id = uuid.UUID(body.institutionId)
    except ValueError as exc:
        raise HTTPException(400, "institutionId inválido") from exc

    if not _institution_row(db, institution_id):
        raise HTTPException(404, "Institución no encontrada")

    name = body.name.strip()
    description = (body.description or f"Rol institucional: {name}").strip()
    allowed_modules = sanitize_module_keys(body.allowedModules)
    role_id = uuid.uuid4()

    existing = db.execute(
        text(
            """
            SELECT 1 FROM institutional_roles
            WHERE institution_id = :institution_id AND lower(trim(name)) = lower(trim(:name))
            """
        ),
        {"institution_id": institution_id, "name": name},
    ).first()
    if existing:
        raise HTTPException(409, "Ya existe un rol con ese nombre en la institución")

    db.execute(
        text(
            """
            INSERT INTO institutional_roles (id, institution_id, name, description, allowed_modules)
            VALUES (:id, :institution_id, :name, :description, CAST(:allowed_modules AS jsonb))
            """
        ),
        {
            "id": role_id,
            "institution_id": institution_id,
            "name": name,
            "description": description,
            "allowed_modules": json.dumps(allowed_modules),
        },
    )
    db.commit()

    row = _custom_role_row(db, role_id)
    if not row:
        raise HTTPException(500, "No se pudo cargar el rol creado")
    return _row_to_custom_role(row)


@router.patch("/roles/{role_id}", response_model=SuperadminRoleDto)
def update_institutional_role(
    role_id: str,
    body: UpdateInstitutionalRoleBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminRoleDto:
    try:
        role_uuid = uuid.UUID(role_id)
    except ValueError as exc:
        raise HTTPException(400, "roleId inválido") from exc

    row = _custom_role_row(db, role_uuid)
    if not row:
        raise HTTPException(404, "Rol no encontrado")

    name = body.name.strip()
    description = (body.description or f"Rol institucional: {name}").strip()
    allowed_modules = (
        sanitize_module_keys(body.allowedModules)
        if body.allowedModules is not None
        else _parse_allowed_modules(row.get("allowed_modules"))
    )

    duplicate = db.execute(
        text(
            """
            SELECT 1 FROM institutional_roles
            WHERE institution_id = :institution_id
              AND lower(trim(name)) = lower(trim(:name))
              AND id <> :role_id
            """
        ),
        {
            "institution_id": row["institution_id"],
            "name": name,
            "role_id": role_uuid,
        },
    ).first()
    if duplicate:
        raise HTTPException(409, "Ya existe un rol con ese nombre en la institución")

    db.execute(
        text(
            """
            UPDATE institutional_roles
            SET name = :name, description = :description, allowed_modules = CAST(:allowed_modules AS jsonb),
                updated_at = now()
            WHERE id = :role_id
            """
        ),
        {
            "role_id": role_uuid,
            "name": name,
            "description": description,
            "allowed_modules": json.dumps(allowed_modules),
        },
    )
    db.commit()

    updated = _custom_role_row(db, role_uuid)
    if not updated:
        raise HTTPException(500, "No se pudo cargar el rol actualizado")
    return _row_to_custom_role(updated)


@router.delete("/roles/{role_id}", status_code=204)
def delete_institutional_role(
    role_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> None:
    try:
        role_uuid = uuid.UUID(role_id)
    except ValueError as exc:
        raise HTTPException(400, "roleId inválido") from exc

    deleted = db.execute(
        text("DELETE FROM institutional_roles WHERE id = :role_id RETURNING id"),
        {"role_id": role_uuid},
    ).first()
    if not deleted:
        raise HTTPException(404, "Rol no encontrado")
    db.commit()


def _create_member(
    db: Session,
    institution_id: uuid.UUID,
    school_id: uuid.UUID,
    body: CreateInstitutionMemberBody,
) -> SchoolMembership:
    _assert_position(db, institution_id, body.positionKey)

    user = find_existing_user_by_profile(db, body)
    if user:
        assert_profile_unique(db, body, exclude_user_id=user.id)
        existing = db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id,
                SchoolMembership.school_id == school_id,
                SchoolMembership.role == body.positionKey,
            )
        )
        if existing:
            raise HTTPException(409, "Ese usuario ya tiene ese cargo en este colegio")
        apply_profile_to_user(user, body)
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=user.id,
            school_id=school_id,
            role=body.positionKey,
        )
        db.add(membership)
    else:
        user = create_user_with_profile(db, body, body.password)
        db.flush()
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=user.id,
            school_id=school_id,
            role=body.positionKey,
        )
        db.add(membership)

    db.flush()
    link_user_to_institution(db, user.id, institution_id)
    sync_membership_to_unit(db, membership.id, body.positionKey)
    return membership


def _institution_rows_by_ids(db: Session, institution_ids: list[uuid.UUID]):
    if not institution_ids:
        return []
    rows = db.execute(
        text(
            f"""
            SELECT {_INSTITUTION_COLS},
                   (SELECT COUNT(*)::int FROM schools s WHERE s.institution_id = i.id) AS school_count
            FROM institutions i
            WHERE i.id = ANY(:institution_ids)
            """
        ),
        {"institution_ids": institution_ids},
    ).mappings().all()
    by_id = {row["id"]: row for row in rows}
    return [by_id[institution_id] for institution_id in institution_ids if institution_id in by_id]


@router.get("/institutions", response_model=PaginatedInstitutionsResponseDto)
def list_institutions(
    page: int = Query(1, ge=1),
    page_size: int | None = Query(None, alias="pageSize"),
    limit: int | None = Query(None),
    search: str | None = Query(None),
    q: str | None = Query(None),
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> PaginatedInstitutionsResponseDto:
    effective_page_size = resolve_page_size(page_size, limit)
    effective_search = search if search is not None else q
    total = count_institutions(db, effective_search)
    institution_ids = paginate_institution_ids(
        db,
        page=page,
        page_size=effective_page_size,
        search=effective_search,
    )
    rows = _institution_rows_by_ids(db, institution_ids)
    items = [_row_to_institution(row) for row in rows]
    return PaginatedInstitutionsResponseDto(
        items=items,
        total=total,
        page=page,
        pageSize=effective_page_size,
        totalPages=total_pages(total, effective_page_size),
    )


@router.post("/institutions", response_model=SuperadminInstitutionDto, status_code=201)
def create_institution(
    body: CreateSuperadminInstitutionBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminInstitutionDto:
    institution_id = uuid.uuid4()
    school_id = uuid.uuid4()
    school_name = (body.defaultSchoolName or f"{body.name.strip()} - Sede principal").strip()

    try:
        admin_uuid = uuid.UUID(body.administratorUserId)
    except ValueError as exc:
        raise HTTPException(400, "administratorUserId inválido") from exc

    admin_user = _assert_unassigned_administrator(db, admin_uuid)

    try:
        db.execute(
            text(
                """
                INSERT INTO institutions (
                  id, name, responsible_name, country, province, city, address, cuit, phone, contact_email, is_active
                )
                VALUES (
                  :id, :name, :responsible_name, :country, :province, :city, :address, :cuit, :phone, :contact_email, true
                )
                """
            ),
            {
                "id": institution_id,
                "name": body.name.strip(),
                "responsible_name": admin_user.full_name or display_name_for_user(admin_user),
                "country": _optional_text(body.country),
                "province": _optional_text(body.province),
                "city": _optional_text(body.city),
                "address": _optional_text(body.address),
                "cuit": _optional_text(body.cuit),
                "phone": _optional_text(body.phone),
                "contact_email": _optional_text(body.contactEmail),
            },
        )
        ensure_catalog_seeded(db, institution_id)

        db.execute(
            text(
                """
                INSERT INTO schools (
                  id, institution_id, name, shift_morning, shift_afternoon, shift_night
                )
                VALUES (
                  :id, :institution_id, :name, true, true, false
                )
                """
            ),
            {
                "id": school_id,
                "institution_id": institution_id,
                "name": school_name,
            },
        )
        db.flush()
        sync_school_to_organizational_unit(db, school_id)
        _assign_administrator_to_institution(db, institution_id, school_id, admin_user)
        db.commit()
    except Exception:
        db.rollback()
        raise

    row = _institution_row(db, institution_id)
    if not row:
        raise HTTPException(500, "No se pudo cargar la institución creada")
    return _row_to_institution(row)


@router.get("/institutions/{institution_id}/schools", response_model=list[InstitutionSchoolDto])
def list_schools(
    institution_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[InstitutionSchoolDto]:
    inst_uuid = uuid.UUID(institution_id)
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    rows = db.execute(
        text(
            f"""
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   {_SCHOOL_DATA_COLS},
                   dir.membership_id AS director_membership_id,
                   dir.display_name AS director_name
            FROM schools s
            JOIN institutions i ON i.id = s.institution_id
            LEFT JOIN LATERAL (
                SELECT sm.id AS membership_id,
                       COALESCE(NULLIF(trim(COALESCE(u.full_name, '')), ''), u.email) AS display_name
                FROM school_memberships sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.school_id = s.id AND sm.role = 'director'
                ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST
                LIMIT 1
            ) dir ON true
            WHERE s.institution_id = :institution_id
            ORDER BY s.name NULLS LAST
            """
        ),
        {"institution_id": inst_uuid},
    ).mappings().all()
    return [_row_to_school(row) for row in rows]


@router.post("/institutions/{institution_id}/schools", response_model=InstitutionSchoolDto, status_code=201)
def create_school(
    institution_id: str,
    body: CreateSchoolBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionSchoolDto:
    inst_uuid = uuid.UUID(institution_id)
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    school_id = uuid.uuid4()
    name = body.name.strip()
    db.execute(
        text(
            """
            INSERT INTO schools (
              id, institution_id, name, address, city, province, cuit, phone, contact_email,
              shift_morning, shift_afternoon, shift_night
            )
            VALUES (
              :id, :institution_id, :name, :address, :city, :province, :cuit, :phone, :contact_email,
              :shift_morning, :shift_afternoon, :shift_night
            )
            """
        ),
        {
            "id": school_id,
            "institution_id": inst_uuid,
            "name": name,
            "address": _optional_text(body.address),
            "city": _optional_text(body.city),
            "province": _optional_text(body.province),
            "cuit": _optional_text(body.cuit),
            "phone": _optional_text(body.phone),
            "contact_email": _optional_text(body.contactEmail),
            "shift_morning": body.shiftMorning,
            "shift_afternoon": body.shiftAfternoon,
            "shift_night": body.shiftNight,
        },
    )
    db.flush()
    sync_school_to_organizational_unit(db, school_id)
    assign_school_director(db, inst_uuid, school_id, body.directorMembershipId)
    db.commit()
    row = _school_row(db, school_id)
    if not row:
        raise HTTPException(500, "No se pudo cargar el colegio creado")
    return _row_to_school(row)


@router.get("/institutions/{institution_id}/representante-legal", response_model=InstitutionMemberDto | None)
def get_representante_legal(
    institution_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionMemberDto | None:
    inst_uuid = uuid.UUID(institution_id)
    row = db.execute(
        text(
            f"""
            SELECT u.id, sm.id AS membership_id, u.email, u.first_name, u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key, lp.label AS position_label,
                   s.id AS school_id, s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE s.institution_id = :institution_id AND sm.role = 'representante_legal'
            ORDER BY u.first_name NULLS LAST
            LIMIT 1
            """
        ),
        {"institution_id": inst_uuid},
    ).mappings().first()
    return _row_to_member(row) if row else None


@router.post(
    "/institutions/{institution_id}/personnel/bulk",
    response_model=BulkPersonnelImportResultDto,
)
def bulk_create_institution_personnel(
    institution_id: str,
    body: BulkPersonnelImportBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> BulkPersonnelImportResultDto:
    try:
        inst_uuid = uuid.UUID(institution_id)
    except ValueError as exc:
        raise HTTPException(400, "institutionId inválido") from exc
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")
    return import_personnel_rows(
        db,
        inst_uuid,
        body,
        admin_only_roles=frozenset({"administrador", "representante_legal", "superadmin"}),
        allow_admin_only_roles=False,
    )


@router.post(
    "/institutions/{institution_id}/representante-legal",
    response_model=InstitutionMemberDto,
    status_code=201,
)
def create_representante_legal(
    institution_id: str,
    body: CreateInstitutionMemberBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionMemberDto:
    inst_uuid = uuid.UUID(institution_id)
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    existing = db.execute(
        text(
            """
            SELECT 1 FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE s.institution_id = :institution_id AND sm.role = 'representante_legal'
            """
        ),
        {"institution_id": inst_uuid},
    ).first()
    if existing:
        raise HTTPException(409, "Esta institución ya tiene representante legal")

    school_uuid = _resolve_school(db, inst_uuid, body.schoolId)
    body.positionKey = "representante_legal"
    membership = _create_member(db, inst_uuid, school_uuid, body)
    db.commit()

    created = _member_row(db, membership.id, inst_uuid)
    if not created:
        raise HTTPException(500, "No se pudo cargar el representante legal")
    return _row_to_member(created)


@router.get("/institutions/{institution_id}/leadership-team", response_model=list[InstitutionMemberDto])
def list_leadership_team(
    institution_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[InstitutionMemberDto]:
    inst_uuid = uuid.UUID(institution_id)
    rows = db.execute(
        text(
            f"""
            SELECT u.id, sm.id AS membership_id, u.email, u.first_name, u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key, lp.label AS position_label,
                   s.id AS school_id, s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE s.institution_id = :institution_id
              AND sm.role NOT IN ('representante_legal', 'administrador')
            ORDER BY lp.sort_order, u.first_name NULLS LAST, u.last_name NULLS LAST
            """
        ),
        {"institution_id": inst_uuid},
    ).mappings().all()
    return [_row_to_member(row) for row in rows]


@router.post(
    "/institutions/{institution_id}/leadership-team",
    response_model=InstitutionMemberDto,
    status_code=201,
)
def create_leadership_member(
    institution_id: str,
    body: CreateInstitutionMemberBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionMemberDto:
    inst_uuid = uuid.UUID(institution_id)
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    if body.positionKey in ("representante_legal", "administrador"):
        raise HTTPException(400, "Usá las secciones específicas para ese cargo")

    school_uuid = _resolve_school(db, inst_uuid, body.schoolId)
    membership = _create_member(db, inst_uuid, school_uuid, body)
    db.commit()

    created = _member_row(db, membership.id, inst_uuid)
    if not created:
        raise HTTPException(500, "No se pudo cargar el miembro del equipo directivo")
    return _row_to_member(created)


@router.get("/institutions/{institution_id}/administradores", response_model=list[InstitutionMemberDto])
def list_administradores(
    institution_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[InstitutionMemberDto]:
    inst_uuid = uuid.UUID(institution_id)
    rows = db.execute(
        text(
            f"""
            SELECT u.id, sm.id AS membership_id, u.email, u.first_name, u.last_name,
                   {_USER_PROFILE_COLS},
                   sm.role AS position_key, lp.label AS position_label,
                   s.id AS school_id, s.name AS school_name
            FROM school_memberships sm
            JOIN users u ON u.id = sm.user_id
            JOIN schools s ON s.id = sm.school_id
            JOIN leadership_positions lp ON lp.key = sm.role
            WHERE s.institution_id = :institution_id AND sm.role = 'administrador'
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST
            """
        ),
        {"institution_id": inst_uuid},
    ).mappings().all()
    return [_row_to_member(row) for row in rows]


@router.post(
    "/institutions/{institution_id}/administradores",
    response_model=InstitutionMemberDto,
    status_code=201,
)
def create_administrador(
    institution_id: str,
    body: CreateInstitutionMemberBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionMemberDto:
    inst_uuid = uuid.UUID(institution_id)
    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    school_uuid = _resolve_school(db, inst_uuid, body.schoolId)
    body.positionKey = "administrador"
    membership = _create_member(db, inst_uuid, school_uuid, body)
    db.commit()

    created = _member_row(db, membership.id, inst_uuid)
    if not created:
        raise HTTPException(500, "No se pudo cargar el administrador")
    return _row_to_member(created)


@router.patch("/institutions/{institution_id}", response_model=SuperadminInstitutionDto)
def update_institution(
    institution_id: str,
    body: UpdateSuperadminInstitutionBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminInstitutionDto:
    try:
        inst_uuid = uuid.UUID(institution_id)
    except ValueError as exc:
        raise HTTPException(400, "institutionId inválido") from exc

    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    db.execute(
        text(
            """
            UPDATE institutions
            SET name = :name,
                country = :country,
                province = :province,
                city = :city,
                address = :address,
                cuit = :cuit,
                phone = :phone,
                contact_email = :contact_email
            WHERE id = :institution_id
            """
        ),
        {
            "institution_id": inst_uuid,
            "name": body.name.strip(),
            "country": _optional_text(body.country),
            "province": _optional_text(body.province),
            "city": _optional_text(body.city),
            "address": _optional_text(body.address),
            "cuit": _optional_text(body.cuit),
            "phone": _optional_text(body.phone),
            "contact_email": _optional_text(body.contactEmail),
        },
    )

    if body.administratorUserId is not None:
        if not body.administratorUserId.strip():
            for user_id in _institution_administrator_user_ids(db, inst_uuid):
                _release_administrator_to_pool(db, user_id, inst_uuid)
        else:
            try:
                new_admin_uuid = uuid.UUID(body.administratorUserId)
            except ValueError as exc:
                raise HTTPException(400, "administratorUserId inválido") from exc
            _replace_institution_administrator(db, inst_uuid, new_admin_uuid)

    db.commit()
    row = _institution_row(db, inst_uuid)
    if not row:
        raise HTTPException(500, "No se pudo cargar la institución actualizada")
    return _row_to_institution(row)


@router.delete("/institutions/{institution_id}", status_code=204)
def delete_institution(
    institution_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> None:
    try:
        inst_uuid = uuid.UUID(institution_id)
    except ValueError as exc:
        raise HTTPException(400, "institutionId inválido") from exc

    if inst_uuid == uuid.UUID("00000000-0000-0000-0000-000000000001"):
        raise HTTPException(400, "No se puede eliminar la institución por defecto")

    if not delete_institution_cascade(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")
    db.commit()


@router.patch("/institutions/{institution_id}/schools/{school_id}", response_model=InstitutionSchoolDto)
def update_school(
    institution_id: str,
    school_id: str,
    body: UpdateSchoolBody,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> InstitutionSchoolDto:
    try:
        inst_uuid = uuid.UUID(institution_id)
        school_uuid = uuid.UUID(school_id)
    except ValueError as exc:
        raise HTTPException(400, "Id inválido") from exc

    if not _institution_row(db, inst_uuid):
        raise HTTPException(404, "Institución no encontrada")

    existing = _school_row(db, school_uuid)
    if not existing or existing["institution_id"] != inst_uuid:
        raise HTTPException(404, "Colegio no encontrado")

    db.execute(
        text(
            """
            UPDATE schools
            SET name = :name,
                address = :address,
                city = :city,
                province = :province,
                cuit = :cuit,
                phone = :phone,
                contact_email = :contact_email,
                shift_morning = :shift_morning,
                shift_afternoon = :shift_afternoon,
                shift_night = :shift_night
            WHERE id = :school_id AND institution_id = :institution_id
            """
        ),
        {
            "school_id": school_uuid,
            "institution_id": inst_uuid,
            "name": body.name.strip(),
            "address": _optional_text(body.address),
            "city": _optional_text(body.city),
            "province": _optional_text(body.province),
            "cuit": _optional_text(body.cuit),
            "phone": _optional_text(body.phone),
            "contact_email": _optional_text(body.contactEmail),
            "shift_morning": body.shiftMorning,
            "shift_afternoon": body.shiftAfternoon,
            "shift_night": body.shiftNight,
        },
    )
    assign_school_director(db, inst_uuid, school_uuid, body.directorMembershipId)
    db.commit()
    row = _school_row(db, school_uuid)
    if not row:
        raise HTTPException(500, "No se pudo cargar el colegio actualizado")
    return _row_to_school(row)


@router.delete("/institutions/{institution_id}/schools/{school_id}", status_code=204)
def delete_school(
    institution_id: str,
    school_id: str,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> None:
    try:
        inst_uuid = uuid.UUID(institution_id)
        school_uuid = uuid.UUID(school_id)
    except ValueError as exc:
        raise HTTPException(400, "Id inválido") from exc

    deleted = db.execute(
        text(
            """
            DELETE FROM schools
            WHERE id = :school_id AND institution_id = :institution_id
            RETURNING id
            """
        ),
        {"school_id": school_uuid, "institution_id": inst_uuid},
    ).first()
    if not deleted:
        raise HTTPException(404, "Colegio no encontrado")
    db.commit()


@router.get("/dashboard-stats", response_model=SuperadminDashboardStatsDto)
def dashboard_stats(
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminDashboardStatsDto:
    counts = db.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*)::int FROM institutions) AS institution_count,
              (SELECT COUNT(*)::int FROM users) AS user_count,
              (SELECT COUNT(*)::int FROM schools) AS school_count,
              (SELECT COUNT(*)::int FROM institutional_roles) AS custom_role_count,
              (
                SELECT COUNT(*)::int FROM (
                  SELECT DISTINCT u.id
                  FROM users u
                  LEFT JOIN school_memberships sm ON sm.user_id = u.id
                  LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
                  WHERE COALESCE(u.is_owner, false) = true
                     OR sm.id IS NOT NULL
                     OR um.id IS NOT NULL
                ) personnel
              ) AS personnel_count
            """
        ),
    ).mappings().first()

    return SuperadminDashboardStatsDto(
        institutionCount=counts["institution_count"] or 0,
        userCount=counts["user_count"] or 0,
        schoolCount=counts["school_count"] or 0,
        personnelCount=counts["personnel_count"] or 0,
        customRoleCount=counts["custom_role_count"] or 0,
        authMethod="JWT",
        passwordHash="bcrypt",
        multiTenantIsolation=True,
    )


@router.get("/academic-structure", response_model=SuperadminAcademicStructureDto)
def academic_structure(
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminAcademicStructureDto:
    school_rows = db.execute(
        text(
            f"""
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   {_SCHOOL_DATA_COLS},
                   dir.membership_id AS director_membership_id,
                   dir.display_name AS director_name
            FROM schools s
            JOIN institutions i ON i.id = s.institution_id
            LEFT JOIN LATERAL (
                SELECT sm.id AS membership_id,
                       COALESCE(NULLIF(trim(COALESCE(u.full_name, '')), ''), u.email) AS display_name
                FROM school_memberships sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.school_id = s.id AND sm.role = 'director'
                ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST
                LIMIT 1
            ) dir ON true
            ORDER BY i.name NULLS LAST, s.name NULLS LAST
            """
        ),
    ).mappings().all()

    grade_rows = db.execute(
        text(
            """
            SELECT c.id, c.name, ip.institution_id, i.name AS institution_name,
                   s.id AS school_id, s.name AS school_name,
                   (SELECT COUNT(*)::int FROM unit_memberships um WHERE um.unit_id = c.id) AS subject_count
            FROM organizational_units c
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            JOIN institutions i ON i.id = ip.institution_id
            JOIN organizational_units level
              ON level.institution_program_id = ip.id AND level.type = 'level'
            JOIN schools s ON s.id = level.parent_unit_id
            WHERE c.type = 'course'
            ORDER BY i.name NULLS LAST, s.name NULLS LAST, c.name NULLS LAST
            """
        ),
    ).mappings().all()

    assignment_rows = db.execute(
        text(
            """
            SELECT um.id, um.teaching_role AS subject,
                   c.name AS grade_name,
                   s.name AS school_name, ip.institution_id, i.name AS institution_name,
                   COALESCE(NULLIF(trim(COALESCE(u.full_name, '')), ''), u.email) AS teacher_name
            FROM unit_memberships um
            JOIN organizational_units c ON c.id = um.unit_id AND c.type = 'course'
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            JOIN institutions i ON i.id = ip.institution_id
            JOIN organizational_units level
              ON level.institution_program_id = ip.id AND level.type = 'level'
            JOIN schools s ON s.id = level.parent_unit_id
            JOIN users u ON u.id = um.user_id
            ORDER BY i.name NULLS LAST, s.name NULLS LAST, c.name NULLS LAST
            """
        ),
    ).mappings().all()

    return SuperadminAcademicStructureDto(
        schools=[_row_to_school(row) for row in school_rows],
        grades=[
            SuperadminGradeDto(
                id=str(row["id"]),
                name=row["name"],
                institutionId=str(row["institution_id"]),
                institutionName=row["institution_name"] or "Institución",
                schoolId=str(row["school_id"]) if row["school_id"] else None,
                schoolName=row["school_name"] or "Colegio",
                subjectCount=row["subject_count"] or 0,
            )
            for row in grade_rows
        ],
        subjectAssignments=[
            SuperadminSubjectAssignmentDto(
                id=str(row["id"]),
                subject=row["subject"] or "Materia",
                gradeName=row["grade_name"],
                schoolName=row["school_name"] or "Colegio",
                institutionName=row["institution_name"] or "Institución",
                institutionId=str(row["institution_id"]),
                teacherName=row["teacher_name"],
            )
            for row in assignment_rows
        ],
    )
