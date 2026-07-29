import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.user import SchoolMembership
from app.services.personnel_roles import assert_assignable_position, normalize_role_key


def sync_school_to_organizational_unit(db: Session, school_id: uuid.UUID) -> None:
    db.execute(
        text(
            """
            INSERT INTO organizational_units (id, institution_id, source_school_id, name, type)
            SELECT s.id, s.institution_id, s.id, COALESCE(s.name, 'Establecimiento'), 'institution'
            FROM schools s
            WHERE s.id = :school_id AND s.institution_id IS NOT NULL
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              institution_id = EXCLUDED.institution_id,
              source_school_id = EXCLUDED.source_school_id
            """
        ),
        {"school_id": school_id},
    )


def sync_membership_to_unit(
    db: Session,
    membership_id: uuid.UUID,
    role: str,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO unit_memberships (
              id, user_id, unit_id, role_template_id, role_in_unit, source_membership_id
            )
            SELECT
              gen_random_uuid(),
              sm.user_id,
              sm.school_id,
              rt.id,
              CASE WHEN sm.role = 'director' THEN 'leader' ELSE 'member' END,
              sm.id
            FROM school_memberships sm
            LEFT JOIN role_templates rt ON rt.code = CASE
              WHEN sm.role = 'director' THEN 'director'
              WHEN sm.role IN ('vicedirector_secundario', 'vicedirector_primario') THEN 'vicedirector'
              WHEN sm.role = 'coordinador_pedagogico' THEN 'coordinador_pedagogico'
              WHEN sm.role = 'secretaria_academica' THEN 'secretaria_academica'
              WHEN sm.role = 'administrador' THEN 'administrativo'
              WHEN sm.role = 'representante_legal' THEN 'administrativo'
              ELSE NULL
            END
            WHERE sm.id = :membership_id
              AND NOT EXISTS (
                SELECT 1 FROM unit_memberships um WHERE um.source_membership_id = sm.id
              )
            """
        ),
        {"membership_id": membership_id},
    )


def link_user_to_institution(db: Session, user_id: uuid.UUID, institution_id: uuid.UUID) -> None:
    db.execute(
        text(
            """
            INSERT INTO user_institutions (user_id, institution_id)
            VALUES (:user_id, :institution_id)
            ON CONFLICT DO NOTHING
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    )


def resolve_school_for_institution(
    db: Session,
    institution_id: uuid.UUID,
    school_id: str | None,
) -> uuid.UUID:
    if school_id:
        try:
            school_uuid = uuid.UUID(school_id)
        except ValueError as exc:
            raise ValueError("schoolId invalido") from exc
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
            raise ValueError("Colegio invalido para la institucion")
        return school_uuid

    row = db.execute(
        text(
            """
            SELECT id FROM schools
            WHERE institution_id = :institution_id
            ORDER BY name NULLS LAST, id
            LIMIT 1
            """
        ),
        {"institution_id": institution_id},
    ).first()
    if not row:
        raise ValueError("La institucion no tiene colegios configurados")
    return row[0]


def assert_leadership_position(db: Session, position_key: str, institution_id: uuid.UUID | None = None) -> None:
    if institution_id is not None:
        assert_assignable_position(db, institution_id, position_key)
        return
    row = db.execute(
        text("SELECT 1 FROM leadership_positions WHERE key = :key"),
        {"key": position_key},
    ).first()
    if not row:
        raise ValueError("Cargo invalido")


def apply_personnel_membership_update(
    db: Session,
    *,
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
    membership_id: uuid.UUID | None,
    position_key: str | None,
    school_id: str | None,
) -> None:
    if not position_key and school_id is None:
        return

    if membership_id:
        row = db.execute(
            text(
                """
                SELECT sm.id
                FROM school_memberships sm
                WHERE sm.id = :membership_id AND sm.user_id = :user_id
                """
            ),
            {"membership_id": membership_id, "user_id": user_id},
        ).first()
    else:
        row = db.execute(
            text(
                """
                SELECT sm.id
                FROM school_memberships sm
                JOIN schools s ON s.id = sm.school_id
                WHERE sm.user_id = :user_id
                  AND s.institution_id = :institution_id
                ORDER BY sm.id
                LIMIT 1
                """
            ),
            {"user_id": user_id, "institution_id": institution_id},
        ).first()
    if not row:
        raise ValueError("No hay membresia de colegio editable para este usuario")

    membership_uuid = row[0]
    membership = db.get(SchoolMembership, membership_uuid)
    if not membership:
        raise ValueError("Membresia no encontrada")

    if position_key:
        assert_leadership_position(db, position_key, institution_id)
        membership.role = position_key

    if school_id is not None:
        school_uuid = resolve_school_for_institution(db, institution_id, school_id or None)
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
    sync_membership_to_unit(db, membership_uuid, membership.role)


def _user_has_teacher_membership_in_institution(
    db: Session,
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
) -> bool:
    row = db.execute(
        text(
            """
            SELECT 1
            FROM unit_memberships um
            JOIN organizational_units c ON c.id = um.unit_id
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            WHERE um.user_id = :user_id
              AND um.teaching_role IS NOT NULL
              AND ip.institution_id = :institution_id
            LIMIT 1
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    ).first()
    return row is not None


def sync_personnel_role_memberships(
    db: Session,
    *,
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
    school_id: str | None,
    role_keys: list[str],
    blocked_roles: frozenset[str] | None = None,
) -> None:
    blocked = blocked_roles or frozenset()
    desired: list[str] = []
    seen: set[str] = set()
    for raw_key in role_keys:
        key = normalize_role_key(raw_key) or (raw_key or "").strip()
        if not key or key.startswith("teacher:") or key in seen:
            continue
        if key in blocked:
            raise ValueError("Ese cargo solo puede gestionarse desde superadmin")
        seen.add(key)
        desired.append(key)

    current_rows = db.execute(
        text(
            """
            SELECT sm.id, sm.role
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            WHERE sm.user_id = :user_id
              AND s.institution_id = :institution_id
            """
        ),
        {"user_id": user_id, "institution_id": institution_id},
    ).mappings().all()

    current_by_role: dict[str, list] = {}
    for row in current_rows:
        role = normalize_role_key(row.get("role")) or (row.get("role") or "").strip()
        if not role:
            continue
        current_by_role.setdefault(role, []).append(row["id"])
    current_roles = set(current_by_role.keys())

    for role in sorted(current_roles & blocked):
        if role not in desired:
            desired.append(role)
            seen.add(role)

    if not desired:
        if _user_has_teacher_membership_in_institution(db, user_id, institution_id):
            desired = []
        else:
            raise ValueError("El usuario debe tener al menos un rol asignado")

    school_uuid = resolve_school_for_institution(db, institution_id, school_id)
    desired_set = set(desired)
    to_remove = current_roles - desired_set
    to_add = desired_set - current_roles

    if to_remove & blocked:
        raise ValueError("No se puede quitar ese rol desde aquí")

    remaining = len(current_roles - to_remove) + len(to_add)
    if remaining < 1 and not _user_has_teacher_membership_in_institution(
        db, user_id, institution_id
    ):
        raise ValueError("El usuario debe tener al menos un rol asignado")

    for role in to_remove:
        for membership_id in current_by_role.get(role, []):
            db.execute(
                text("DELETE FROM unit_memberships WHERE source_membership_id = :membership_id"),
                {"membership_id": membership_id},
            )
            db.execute(
                text("DELETE FROM school_memberships WHERE id = :membership_id"),
                {"membership_id": membership_id},
            )

    for role in to_add:
        assert_assignable_position(db, institution_id, role)
        membership = SchoolMembership(
            id=uuid.uuid4(),
            user_id=user_id,
            school_id=school_uuid,
            role=role,
        )
        db.add(membership)
        db.flush()
        sync_membership_to_unit(db, membership.id, role)

    for role in desired_set & current_roles:
        for membership_id in current_by_role.get(role, []):
            db.execute(
                text(
                    """
                    UPDATE school_memberships
                    SET school_id = :school_id
                    WHERE id = :membership_id
                    """
                ),
                {"school_id": school_uuid, "membership_id": membership_id},
            )
            db.execute(
                text(
                    """
                    UPDATE unit_memberships
                    SET unit_id = :school_id
                    WHERE source_membership_id = :membership_id
                    """
                ),
                {"school_id": school_uuid, "membership_id": membership_id},
            )

def delete_institution_cascade(db: Session, institution_id: uuid.UUID) -> bool:
    """Elimina una institucion y datos relacionados (orden respetando FKs)."""
    params = {"institution_id": institution_id}
    exists = db.execute(
        text("SELECT 1 FROM institutions WHERE id = :institution_id"),
        params,
    ).first()
    if not exists:
        return False

    db.execute(
        text(
            """
            UPDATE users u
            SET pending_administrador = true
            WHERE COALESCE(u.is_owner, false) = false
              AND u.id IN (
                SELECT sm.user_id
                FROM school_memberships sm
                JOIN schools s ON s.id = sm.school_id
                WHERE s.institution_id = :institution_id
                  AND sm.role = 'administrador'
              )
            """
        ),
        params,
    )

    db.execute(
        text(
            """
            DELETE FROM calendar_event_assignees
            WHERE event_id IN (
                SELECT id FROM calendar_events WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM task_assignees
            WHERE task_id IN (
                SELECT id FROM tasks WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM event_assignments
            WHERE assigned_unit_id IN (
                SELECT id FROM organizational_units WHERE institution_id = :institution_id
            )
               OR event_id IN (
                SELECT id FROM calendar_events WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM task_assignments
            WHERE assigned_unit_id IN (
                SELECT id FROM organizational_units WHERE institution_id = :institution_id
            )
               OR task_id IN (
                SELECT id FROM tasks WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM class_schedule_instances
            WHERE schedule_id IN (
                SELECT cs.id FROM class_schedules cs
                JOIN organizational_units ou ON ou.id = cs.unit_id
                WHERE ou.institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM class_schedules
            WHERE unit_id IN (
                SELECT id FROM organizational_units WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM student_unit_enrollments
            WHERE unit_id IN (
                SELECT id FROM organizational_units WHERE institution_id = :institution_id
            )
               OR student_id IN (
                SELECT id FROM students WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM unit_memberships
            WHERE unit_id IN (
                SELECT id FROM organizational_units WHERE institution_id = :institution_id
            )
               OR source_membership_id IN (
                SELECT sm.id FROM school_memberships sm
                JOIN schools s ON s.id = sm.school_id
                WHERE s.institution_id = :institution_id
            )
            """
        ),
        params,
    )
    while True:
        deleted = db.execute(
            text(
                """
                DELETE FROM organizational_units
                WHERE institution_id = :institution_id
                  AND id NOT IN (
                    SELECT parent_unit_id
                    FROM organizational_units
                    WHERE parent_unit_id IS NOT NULL
                      AND institution_id = :institution_id
                  )
                RETURNING id
                """
            ),
            params,
        ).fetchall()
        if not deleted:
            break

    db.execute(text("DELETE FROM students WHERE institution_id = :institution_id"), params)
    db.execute(text("DELETE FROM calendar_events WHERE institution_id = :institution_id"), params)
    db.execute(text("DELETE FROM tasks WHERE institution_id = :institution_id"), params)
    db.execute(
        text("DELETE FROM institution_programs WHERE institution_id = :institution_id"),
        params,
    )
    db.execute(
        text(
            """
            DELETE FROM school_memberships
            WHERE school_id IN (
                SELECT id FROM schools WHERE institution_id = :institution_id
            )
            """
        ),
        params,
    )
    db.execute(
        text("DELETE FROM institution_memberships WHERE institution_id = :institution_id"),
        params,
    )
    db.execute(text("DELETE FROM user_institutions WHERE institution_id = :institution_id"), params)
    db.execute(
        text("DELETE FROM institutional_roles WHERE institution_id = :institution_id"),
        params,
    )
    db.execute(text("DELETE FROM event_types WHERE institution_id = :institution_id"), params)
    db.execute(text("DELETE FROM task_types WHERE institution_id = :institution_id"), params)
    db.execute(text("DELETE FROM objectives WHERE institution_id = :institution_id"), params)
    db.execute(
        text("DELETE FROM weekly_planner_weeks WHERE institution_id = :institution_id"),
        params,
    )
    db.execute(text("DELETE FROM schools WHERE institution_id = :institution_id"), params)
    db.execute(
        text("DELETE FROM institutions WHERE id = :institution_id RETURNING id"),
        params,
    )
    return True

