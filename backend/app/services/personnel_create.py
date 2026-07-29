import uuid

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.user import SchoolMembership
from app.schemas.superadmin import CreateInstitutionMemberBody
from app.services.institution_sync import link_user_to_institution, sync_membership_to_unit
from app.services.personnel_roles import assert_assignable_position
from app.services.user_profile import (
    apply_profile_to_user,
    assert_profile_unique,
    create_user_with_profile,
    find_existing_user_by_profile,
)


def assert_position(db: Session, institution_id: uuid.UUID, position_key: str) -> None:
    try:
        assert_assignable_position(db, institution_id, position_key)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


def resolve_school_id(
    db: Session,
    institution_id: uuid.UUID,
    *,
    school_id: str | None = None,
    school_name: str | None = None,
) -> uuid.UUID:
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

    cleaned_name = (school_name or "").strip()
    if cleaned_name:
        row = db.execute(
            text(
                """
                SELECT id FROM schools
                WHERE institution_id = :institution_id
                  AND lower(trim(name)) = lower(trim(:school_name))
                ORDER BY name NULLS LAST
                LIMIT 1
                """
            ),
            {"institution_id": institution_id, "school_name": cleaned_name},
        ).first()
        if not row:
            raise HTTPException(404, f"Colegio no encontrado: {cleaned_name}")
        return row[0]

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


def create_institution_member(
    db: Session,
    institution_id: uuid.UUID,
    body: CreateInstitutionMemberBody,
    *,
    admin_only_roles: frozenset[str],
    allow_admin_only_roles: bool = False,
) -> tuple[uuid.UUID, str]:
    if body.positionKey in admin_only_roles and not allow_admin_only_roles:
        raise HTTPException(400, "Ese cargo solo puede gestionarse desde superadmin")

    assert_position(db, institution_id, body.positionKey)
    school_uuid = resolve_school_id(db, institution_id, school_id=body.schoolId)

    member_user = find_existing_user_by_profile(db, body)
    status = "created"
    if member_user:
        assert_profile_unique(db, body, exclude_user_id=member_user.id)
        existing = db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == member_user.id,
                SchoolMembership.school_id == school_uuid,
                SchoolMembership.role == body.positionKey,
            )
        )
        if existing:
            raise HTTPException(409, "Ese usuario ya tiene ese cargo en este colegio")
        apply_profile_to_user(member_user, body)
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=member_user.id,
            school_id=school_uuid,
            role=body.positionKey,
        )
        db.add(membership)
        status = "linked"
    else:
        member_user = create_user_with_profile(db, body, body.password)
        db.flush()
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=member_user.id,
            school_id=school_uuid,
            role=body.positionKey,
        )
        db.add(membership)

    db.flush()
    link_user_to_institution(db, member_user.id, institution_id)
    sync_membership_to_unit(db, membership.id, body.positionKey)
    return member_user.id, status
