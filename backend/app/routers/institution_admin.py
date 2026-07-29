import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import School, SchoolMembership, User
from app.routers.auth import get_current_user, get_token_payload
from app.schemas.superadmin import (
    AdminCreateInstitutionalRoleBody,
    AdminDashboardStatsDto,
    BulkPersonnelImportBody,
    BulkPersonnelImportResultDto,
    CreateInstitutionMemberBody,
    CreateSchoolBody,
    InstitutionSchoolDto,
    SuperadminAcademicStructureDto,
    SuperadminGradeDto,
    PaginatedPersonnelResponseDto,
    SuperadminPersonnelDto,
    SuperadminPersonnelRoleDto,
    SuperadminRoleDto,
    SuperadminSubjectAssignmentDto,
    UpdateInstitutionalRoleBody,
    UpdateSchoolBody,
    UpdateSuperadminPersonnelBody,
)
from app.schemas.user_profile import UserProfileDto
from app.services.institution_sync import (
    apply_personnel_membership_update,
    link_user_to_institution,
    sync_membership_to_unit,
    sync_personnel_role_memberships,
    sync_school_to_organizational_unit,
)
from app.services.security import hash_password
from app.services.structure import assert_institution_administrator, assign_school_director
from app.services.user_profile import (
    apply_profile_to_user,
    assert_profile_unique,
    create_user_with_profile,
    display_name_from_row,
    find_existing_user_by_profile,
    profile_from_row,
)
from app.services.module_permissions import reserved_modules_for_role, sanitize_module_keys
from app.services.personnel_roles import (
    assert_assignable_position,
    build_personnel_role_dtos,
    normalize_role_key,
)
from app.services.personnel_bulk import import_personnel_rows
from app.services.personnel_query import (
    count_admin_personnel_users,
    paginate_admin_personnel_user_ids,
    resolve_page_size,
    total_pages,
)

router = APIRouter(prefix="/institution/admin", tags=["institution-admin"])

ADMIN_ONLY_ROLES = frozenset({"administrador", "representante_legal"})

_USER_PROFILE_COLS = """
    u.username, u.full_name, u.address, u.phone, u.dni, u.cuil, u.personal_email
"""


def _admin_ctx(
    user: User = Depends(get_current_user),
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> tuple[User, uuid.UUID, Session]:
    institution_raw = payload.get("institution_id")
    if not institution_raw:
        raise HTTPException(403, "Sesión sin institución asignada")
    try:
        institution_id = uuid.UUID(str(institution_raw))
    except ValueError as exc:
        raise HTTPException(400, "institution_id inválido") from exc
    assert_institution_administrator(db, user, institution_id)
    return user, institution_id, db


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _institution_name(db: Session, institution_id: uuid.UUID) -> str:
    row = db.execute(
        text("SELECT name FROM institutions WHERE id = :id"),
        {"id": institution_id},
    ).first()
    return row[0] if row else "Institución"


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


def _school_row(db: Session, school_id: uuid.UUID):
    return db.execute(
        text(
            """
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   s.address, s.city, s.province, s.cuit, s.phone, s.contact_email,
                   s.shift_morning, s.shift_afternoon, s.shift_night,
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


def _assert_position(db: Session, institution_id: uuid.UUID, position_key: str) -> None:
    try:
        assert_assignable_position(db, institution_id, position_key)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


def _personnel_roles_for_user(db: Session, rows: list, *, institution_id: uuid.UUID | None = None) -> list[SuperadminPersonnelRoleDto]:
    return build_personnel_role_dtos(
        db,
        rows,
        institution_scope=institution_id,
        admin_only_roles=ADMIN_ONLY_ROLES,
    )


def _personnel_rows(
    db: Session,
    institution_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
    user_ids: list[uuid.UUID] | None = None,
):
    user_filter = ""
    params: dict = {"institution_id": institution_id}
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
                   {_USER_PROFILE_COLS},
                   COALESCE(u.is_active, true) AS is_active,
                   COALESCE(u.must_change_password, false) AS must_change_password,
                   sm.id AS membership_id,
                   s.id AS school_id,
                   sm.role AS position_key,
                   COALESCE(lp.label, ir.name) AS position_label,
                   um.teaching_role
            FROM users u
            LEFT JOIN school_memberships sm ON sm.user_id = u.id
            LEFT JOIN schools s ON s.id = sm.school_id AND s.institution_id = :institution_id
            LEFT JOIN leadership_positions lp ON lp.key = sm.role
            LEFT JOIN institutional_roles ir
              ON ir.id::text = sm.role AND ir.institution_id = :institution_id
            LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
            LEFT JOIN organizational_units c ON c.id = um.unit_id
            LEFT JOIN institution_programs ip ON ip.id = c.institution_program_id
                AND ip.institution_id = :institution_id
            WHERE COALESCE(u.is_owner, false) = false
              AND (s.id IS NOT NULL OR ip.id IS NOT NULL)
            {user_filter}
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            """
        ),
        params,
    ).mappings().all()


def _personnel_from_group(
    db: Session,
    entry: dict,
    rows: list,
    *,
    institution_id: uuid.UUID,
    current_user_id: uuid.UUID,
) -> SuperadminPersonnelDto:
    user_id = entry["id"]
    role_keys = {row.get("position_key") for row in rows if row.get("position_key")}
    is_self = str(current_user_id) == user_id
    can_edit = "representante_legal" not in role_keys and (is_self or "administrador" not in role_keys)
    can_delete = not is_self and not role_keys.intersection(ADMIN_ONLY_ROLES)
    return SuperadminPersonnelDto(
        id=user_id,
        displayName=display_name_from_row(entry),
        email=entry["email"],
        dni=entry.get("dni"),
        cuil=entry.get("cuil"),
        phone=entry.get("phone"),
        profile=UserProfileDto(**profile_from_row(entry)),
        roles=_personnel_roles_for_user(db, rows, institution_id=institution_id),
        isActive=bool(entry.get("is_active", True)),
        mustChangePassword=bool(entry.get("must_change_password", False)),
        isOwner=False,
        canEdit=can_edit,
        canDelete=can_delete,
        institutionId=str(institution_id),
        schoolId=str(entry["school_id"]) if entry.get("school_id") else None,
        membershipId=str(entry["membership_id"]) if entry.get("membership_id") else None,
        positionKey=entry.get("position_key"),
    )


def _build_personnel_list(
    db: Session,
    institution_id: uuid.UUID,
    rows,
    *,
    current_user_id: uuid.UUID,
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
            }
        if row.get("membership_id") and not grouped[user_id].get("membership_id"):
            grouped[user_id]["membership_id"] = row["membership_id"]
            grouped[user_id]["school_id"] = row.get("school_id")
            grouped[user_id]["position_key"] = row.get("position_key")
    return [
        _personnel_from_group(
            db,
            entry,
            rows_by_user[user_id],
            institution_id=institution_id,
            current_user_id=current_user_id,
        )
        for user_id, entry in grouped.items()
    ]


def _build_personnel_list_ordered(
    db: Session,
    institution_id: uuid.UUID,
    rows,
    *,
    current_user_id: uuid.UUID,
    user_ids: list[uuid.UUID],
) -> list[SuperadminPersonnelDto]:
    items = _build_personnel_list(db, institution_id, rows, current_user_id=current_user_id)
    by_id = {item.id: item for item in items}
    return [by_id[str(user_id)] for user_id in user_ids if str(user_id) in by_id]


def _assert_user_in_institution(db: Session, institution_id: uuid.UUID, user_uuid: uuid.UUID) -> None:
    rows = _personnel_rows(db, institution_id, user_uuid)
    if not rows:
        raise HTTPException(404, "Usuario no encontrado en el personal de la institución")


def _delete_user_cascade(db: Session, user_uuid: uuid.UUID) -> None:
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


@router.get("/dashboard-stats", response_model=AdminDashboardStatsDto)
def dashboard_stats(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> AdminDashboardStatsDto:
    user, institution_id, db = ctx
    counts = db.execute(
        text(
            """
            SELECT
              (SELECT COUNT(DISTINCT u.id)::int
               FROM users u
               JOIN school_memberships sm ON sm.user_id = u.id
               JOIN schools s ON s.id = sm.school_id
               WHERE s.institution_id = :institution_id) AS user_count,
              (SELECT COUNT(*)::int FROM schools WHERE institution_id = :institution_id) AS school_count,
              (SELECT COUNT(*)::int FROM institutional_roles WHERE institution_id = :institution_id) AS custom_role_count,
              (
                SELECT COUNT(*)::int FROM (
                  SELECT DISTINCT u.id
                  FROM users u
                  LEFT JOIN school_memberships sm ON sm.user_id = u.id
                  LEFT JOIN schools s ON s.id = sm.school_id AND s.institution_id = :institution_id
                  LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
                  LEFT JOIN organizational_units c ON c.id = um.unit_id
                  LEFT JOIN institution_programs ip ON ip.id = c.institution_program_id
                      AND ip.institution_id = :institution_id
                  WHERE COALESCE(u.is_owner, false) = false
                    AND (s.id IS NOT NULL OR ip.id IS NOT NULL)
                ) personnel
              ) AS personnel_count
            """
        ),
        {"institution_id": institution_id},
    ).mappings().first()

    return AdminDashboardStatsDto(
        institutionId=str(institution_id),
        institutionName=_institution_name(db, institution_id),
        userCount=counts["user_count"] or 0,
        schoolCount=counts["school_count"] or 0,
        personnelCount=counts["personnel_count"] or 0,
        customRoleCount=counts["custom_role_count"] or 0,
        authMethod="JWT",
        passwordHash="bcrypt",
        multiTenantIsolation=True,
    )


@router.get("/personnel", response_model=PaginatedPersonnelResponseDto)
def list_personnel(
    page: int = Query(1, ge=1),
    page_size: int | None = Query(None, alias="pageSize"),
    limit: int | None = Query(None),
    search: str | None = Query(None),
    q: str | None = Query(None),
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> PaginatedPersonnelResponseDto:
    user, institution_id, db = ctx
    effective_page_size = resolve_page_size(page_size, limit)
    effective_search = search if search is not None else q
    total = count_admin_personnel_users(db, institution_id, effective_search)
    user_ids = paginate_admin_personnel_user_ids(
        db,
        institution_id,
        page=page,
        page_size=effective_page_size,
        search=effective_search,
    )
    rows = _personnel_rows(db, institution_id, user_ids=user_ids)
    items = _build_personnel_list_ordered(
        db,
        institution_id,
        rows,
        current_user_id=user.id,
        user_ids=user_ids,
    )
    return PaginatedPersonnelResponseDto(
        items=items,
        total=total,
        page=page,
        pageSize=effective_page_size,
        totalPages=total_pages(total, effective_page_size),
    )


@router.post("/personnel", response_model=SuperadminPersonnelDto, status_code=201)
def create_personnel(
    body: CreateInstitutionMemberBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> SuperadminPersonnelDto:
    user, institution_id, db = ctx
    if body.positionKey in ADMIN_ONLY_ROLES:
        raise HTTPException(400, "Ese cargo solo puede gestionarse desde superadmin")

    _assert_position(db, institution_id, body.positionKey)
    school_uuid = _resolve_school(db, institution_id, body.schoolId)

    member_user = find_existing_user_by_profile(db, body)
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
    db.commit()

    rows = _personnel_rows(db, institution_id, member_user.id)
    result = _build_personnel_list(db, institution_id, rows, current_user_id=user.id)
    if not result:
        raise HTTPException(500, "No se pudo cargar el usuario creado")
    return result[0]


@router.post("/personnel/bulk", response_model=BulkPersonnelImportResultDto)
def bulk_create_personnel(
    body: BulkPersonnelImportBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> BulkPersonnelImportResultDto:
    _, institution_id, db = ctx
    return import_personnel_rows(
        db,
        institution_id,
        body,
        admin_only_roles=ADMIN_ONLY_ROLES,
        allow_admin_only_roles=False,
    )


@router.patch("/personnel/{user_id}", response_model=SuperadminPersonnelDto)
def update_personnel(
    user_id: str,
    body: UpdateSuperadminPersonnelBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> SuperadminPersonnelDto:
    current_user, institution_id, db = ctx
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(400, "userId inválido") from exc

    _assert_user_in_institution(db, institution_id, user_uuid)
    rows = _personnel_rows(db, institution_id, user_uuid)
    if any(row.get("position_key") == "representante_legal" for row in rows):
        raise HTTPException(400, "No se puede editar al representante legal desde aquí")

    target = db.get(User, user_uuid)
    if not target:
        raise HTTPException(404, "Usuario no encontrado")

    assert_profile_unique(db, body, exclude_user_id=user_uuid)
    apply_profile_to_user(target, body)

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

    if body.institutionId:
        raise HTTPException(400, "No podés cambiar la institución desde admin institucional")

    if body.positionKey in ADMIN_ONLY_ROLES:
        raise HTTPException(400, "Ese cargo solo puede gestionarse desde superadmin")

    if body.roleKeys is not None:
        try:
            sync_personnel_role_memberships(
                db,
                user_id=user_uuid,
                institution_id=institution_id,
                school_id=body.schoolId,
                role_keys=body.roleKeys,
                blocked_roles=ADMIN_ONLY_ROLES,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
    elif body.positionKey is not None or body.schoolId is not None:
        membership_uuid = None
        if body.membershipId:
            try:
                membership_uuid = uuid.UUID(body.membershipId)
            except ValueError as exc:
                raise HTTPException(400, "membershipId inválido") from exc
        try:
            apply_personnel_membership_update(
                db,
                user_id=user_uuid,
                institution_id=institution_id,
                membership_id=membership_uuid,
                position_key=body.positionKey,
                school_id=body.schoolId,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc

    db.commit()
    updated_rows = _personnel_rows(db, institution_id, user_uuid)
    result = _build_personnel_list(db, institution_id, updated_rows, current_user_id=current_user.id)
    if not result:
        raise HTTPException(500, "No se pudo cargar el usuario actualizado")
    return result[0]


@router.delete("/personnel/{user_id}", status_code=204)
def delete_personnel(
    user_id: str,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> None:
    current_user, institution_id, db = ctx
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(400, "userId inválido") from exc

    if user_uuid == current_user.id:
        raise HTTPException(400, "No podés eliminar tu propio usuario")

    _assert_user_in_institution(db, institution_id, user_uuid)
    rows = _personnel_rows(db, institution_id, user_uuid)
    if any(row.get("position_key") in ADMIN_ONLY_ROLES for row in rows):
        raise HTTPException(400, "No se puede eliminar este cargo desde aquí")

    _delete_user_cascade(db, user_uuid)
    db.commit()


@router.get("/roles", response_model=list[SuperadminRoleDto])
def list_roles(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> list[SuperadminRoleDto]:
    _, institution_id, db = ctx
    rows = db.execute(
        text(
            """
            SELECT ir.id, ir.name, ir.description, ir.institution_id, i.name AS institution_name,
                   ir.allowed_modules
            FROM institutional_roles ir
            JOIN institutions i ON i.id = ir.institution_id
            WHERE ir.institution_id = :institution_id
            ORDER BY ir.name NULLS LAST
            """
        ),
        {"institution_id": institution_id},
    ).mappings().all()
    return _platform_roles_from_db(db) + [_row_to_custom_role(row) for row in rows]


@router.post("/roles", response_model=SuperadminRoleDto, status_code=201)
def create_institutional_role(
    body: AdminCreateInstitutionalRoleBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> SuperadminRoleDto:
    _, institution_id, db = ctx
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
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> SuperadminRoleDto:
    _, institution_id, db = ctx
    try:
        role_uuid = uuid.UUID(role_id)
    except ValueError as exc:
        raise HTTPException(400, "roleId inválido") from exc

    row = _custom_role_row(db, role_uuid)
    if not row or row["institution_id"] != institution_id:
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
        {"institution_id": institution_id, "name": name, "role_id": role_uuid},
    ).first()
    if duplicate:
        raise HTTPException(409, "Ya existe un rol con ese nombre en la institución")

    db.execute(
        text(
            """
            UPDATE institutional_roles
            SET name = :name, description = :description, allowed_modules = CAST(:allowed_modules AS jsonb),
                updated_at = now()
            WHERE id = :role_id AND institution_id = :institution_id
            """
        ),
        {
            "role_id": role_uuid,
            "institution_id": institution_id,
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
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> None:
    _, institution_id, db = ctx
    try:
        role_uuid = uuid.UUID(role_id)
    except ValueError as exc:
        raise HTTPException(400, "roleId inválido") from exc

    deleted = db.execute(
        text(
            """
            DELETE FROM institutional_roles
            WHERE id = :role_id AND institution_id = :institution_id
            RETURNING id
            """
        ),
        {"role_id": role_uuid, "institution_id": institution_id},
    ).first()
    if not deleted:
        raise HTTPException(404, "Rol no encontrado")
    db.commit()


@router.get("/schools", response_model=list[InstitutionSchoolDto])
def list_schools(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> list[InstitutionSchoolDto]:
    _, institution_id, db = ctx
    rows = db.execute(
        text(
            """
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   s.address, s.city, s.province, s.cuit, s.phone, s.contact_email,
                   s.shift_morning, s.shift_afternoon, s.shift_night,
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
        {"institution_id": institution_id},
    ).mappings().all()
    return [_row_to_school(row) for row in rows]


@router.post("/schools", response_model=InstitutionSchoolDto, status_code=201)
def create_school(
    body: CreateSchoolBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> InstitutionSchoolDto:
    _, institution_id, db = ctx
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
            "institution_id": institution_id,
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
    assign_school_director(db, institution_id, school_id, body.directorMembershipId)
    db.commit()
    row = _school_row(db, school_id)
    if not row:
        raise HTTPException(500, "No se pudo cargar el colegio creado")
    return _row_to_school(row)


@router.patch("/schools/{school_id}", response_model=InstitutionSchoolDto)
def update_school(
    school_id: str,
    body: UpdateSchoolBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> InstitutionSchoolDto:
    _, institution_id, db = ctx
    try:
        school_uuid = uuid.UUID(school_id)
    except ValueError as exc:
        raise HTTPException(400, "schoolId inválido") from exc

    existing = db.execute(
        text("SELECT id FROM schools WHERE id = :id AND institution_id = :institution_id"),
        {"id": school_uuid, "institution_id": institution_id},
    ).first()
    if not existing:
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
            "institution_id": institution_id,
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
    assign_school_director(db, institution_id, school_uuid, body.directorMembershipId)
    db.commit()
    row = _school_row(db, school_uuid)
    if not row:
        raise HTTPException(500, "No se pudo cargar el colegio actualizado")
    return _row_to_school(row)


@router.delete("/schools/{school_id}", status_code=204)
def delete_school(
    school_id: str,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> None:
    _, institution_id, db = ctx
    try:
        school_uuid = uuid.UUID(school_id)
    except ValueError as exc:
        raise HTTPException(400, "schoolId inválido") from exc

    deleted = db.execute(
        text(
            """
            DELETE FROM schools
            WHERE id = :school_id AND institution_id = :institution_id
            RETURNING id
            """
        ),
        {"school_id": school_uuid, "institution_id": institution_id},
    ).first()
    if not deleted:
        raise HTTPException(404, "Colegio no encontrado")
    db.commit()


@router.get("/academic-structure", response_model=SuperadminAcademicStructureDto)
def academic_structure(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_admin_ctx),
) -> SuperadminAcademicStructureDto:
    _, institution_id, db = ctx
    school_rows = db.execute(
        text(
            """
            SELECT s.id, s.name, s.institution_id, i.name AS institution_name,
                   s.address, s.city, s.province, s.cuit, s.phone, s.contact_email,
                   s.shift_morning, s.shift_afternoon, s.shift_night,
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
        {"institution_id": institution_id},
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
            WHERE c.type = 'course' AND ip.institution_id = :institution_id
            ORDER BY s.name NULLS LAST, c.name NULLS LAST
            """
        ),
        {"institution_id": institution_id},
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
            WHERE ip.institution_id = :institution_id
            ORDER BY s.name NULLS LAST, c.name NULLS LAST
            """
        ),
        {"institution_id": institution_id},
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
