import uuid

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.user import User


DOCENTE_TEMPLATE_CODE = "docente_titular"


def _display_name(first_name: str | None, last_name: str | None, email: str) -> str:
    parts = [first_name or "", last_name or ""]
    name = " ".join(p.strip() for p in parts if p and p.strip())
    return name or email


def assert_institution_administrator(db: Session, user: User, institution_id: uuid.UUID) -> None:
    from app.routers.auth import _is_superadmin

    if _is_superadmin(user):
        return
    row = db.execute(
        text(
            """
            SELECT 1
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id
              AND s.institution_id = :institution_id
              AND sm.role = 'administrador'
            LIMIT 1
            """
        ),
        {"user_id": user.id, "institution_id": institution_id},
    ).first()
    if not row:
        raise HTTPException(403, "Solo el admin de la institución puede realizar esta acción")


def assert_institution_manager(db: Session, user: User, institution_id: uuid.UUID) -> None:
    from app.routers.auth import _is_superadmin

    if _is_superadmin(user):
        return
    assert_institution_admin(db, user.id, institution_id)


def assert_institution_admin(db: Session, user_id: uuid.UUID, institution_id: uuid.UUID) -> None:
    row = db.execute(
        text(
            """
            SELECT 1
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id
              AND s.institution_id = :institution_id
              AND sm.role IN ('administrador', 'director')
            LIMIT 1
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    ).first()
    if not row:
        raise HTTPException(403, "No tenés permisos de administración en esta institución")


def resolve_school_id(db: Session, institution_id: uuid.UUID, school_id: str | None) -> uuid.UUID:
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
            raise HTTPException(404, "Escuela no encontrada")
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


def ensure_school_unit(db: Session, school_id: uuid.UUID) -> uuid.UUID:
    db.execute(
        text(
            """
            INSERT INTO organizational_units (id, institution_id, source_school_id, name, type)
            SELECT s.id, s.institution_id, s.id, COALESCE(s.name, 'Establecimiento'), 'institution'
            FROM schools s WHERE s.id = :school_id
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"school_id": school_id},
    )
    return school_id


def get_program_row(db: Session, program_id: uuid.UUID, institution_id: uuid.UUID):
    return db.execute(
        text(
            """
            SELECT ip.id, ip.education_level, ip.shift, ip.official_code,
                   ou.id AS level_unit_id
            FROM institution_programs ip
            LEFT JOIN organizational_units ou
              ON ou.institution_program_id = ip.id AND ou.type = 'level'
            WHERE ip.id = :program_id AND ip.institution_id = :institution_id
            """
        ),
        {"program_id": program_id, "institution_id": institution_id},
    ).mappings().first()


def get_docente_template_id(db: Session) -> uuid.UUID:
    row = db.execute(
        text("SELECT id FROM role_templates WHERE code = :code"),
        {"code": DOCENTE_TEMPLATE_CODE},
    ).first()
    if not row:
        raise HTTPException(500, "Plantilla de docente no configurada")
    return row[0]


def assign_school_director(
    db: Session,
    institution_id: uuid.UUID,
    school_id: uuid.UUID,
    director_membership_id: str | None,
) -> None:
    from app.models.user import SchoolMembership
    from app.services.institution_sync import sync_membership_to_unit

    director_user_id: uuid.UUID | None = None
    if director_membership_id:
        try:
            membership_uuid = uuid.UUID(director_membership_id)
        except ValueError as exc:
            raise HTTPException(400, "directorMembershipId inválido") from exc

        row = db.execute(
            text(
                """
                SELECT sm.user_id
                FROM school_memberships sm
                JOIN schools s ON s.id = sm.school_id
                WHERE sm.id = :membership_id
                  AND sm.role = 'director'
                  AND s.institution_id = :institution_id
                """
            ),
            {"membership_id": membership_uuid, "institution_id": institution_id},
        ).mappings().first()
        if not row:
            raise HTTPException(404, "Director no encontrado en la institución")
        director_user_id = row["user_id"]

    removed_ids = db.execute(
        text(
            """
            SELECT sm.id
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.school_id = :school_id
              AND s.institution_id = :institution_id
              AND sm.role = 'director'
            """
        ),
        {"school_id": school_id, "institution_id": institution_id},
    ).scalars().all()

    for membership_id in removed_ids:
        db.execute(
            text("DELETE FROM unit_memberships WHERE source_membership_id = :membership_id"),
            {"membership_id": membership_id},
        )
        db.execute(
            text("DELETE FROM school_memberships WHERE id = :membership_id"),
            {"membership_id": membership_id},
        )

    if not director_user_id:
        return

    existing = db.execute(
        text(
            """
            SELECT 1
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id
              AND sm.school_id = :school_id
              AND sm.role = 'director'
              AND s.institution_id = :institution_id
            """
        ),
        {
            "user_id": director_user_id,
            "school_id": school_id,
            "institution_id": institution_id,
        },
    ).first()
    if existing:
        return

    membership = SchoolMembership(
        id=uuid.uuid4(),
        user_id=director_user_id,
        school_id=school_id,
        role="director",
    )
    db.add(membership)
    db.flush()
    sync_membership_to_unit(db, membership.id, "director")


def create_program(
    db: Session,
    institution_id: uuid.UUID,
    school_id: uuid.UUID,
    education_level: str,
    shift: str,
    official_code: str | None,
) -> uuid.UUID:
    program_id = uuid.uuid4()
    school_unit_id = ensure_school_unit(db, school_id)

    db.execute(
        text(
            """
            INSERT INTO institution_programs (id, institution_id, education_level, shift)
            VALUES (:id, :institution_id, :education_level, :shift)
            """
        ),
        {
            "id": program_id,
            "institution_id": institution_id,
            "education_level": education_level,
            "shift": shift,
        },
    )

    level_unit_id = uuid.uuid4()
    db.execute(
        text(
            """
            INSERT INTO organizational_units (
              id, institution_id, institution_program_id, name, type, parent_unit_id
            )
            VALUES (:id, :institution_id, :program_id, :name, 'level', :parent_id)
            """
        ),
        {
            "id": level_unit_id,
            "institution_id": institution_id,
            "program_id": program_id,
            "name": education_level,
            "parent_id": school_unit_id,
        },
    )
    return program_id
