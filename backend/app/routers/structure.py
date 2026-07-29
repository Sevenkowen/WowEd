import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_institution_id
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.structure import (
    AssignmentDto,
    ClassroomDto,
    CreateAssignmentBody,
    CreateClassroomBody,
    CreateProgramBody,
    CreateTeacherBody,
    ProgramDto,
    TeacherDto,
    UpdateTeacherBody,
)
from app.schemas.user_profile import UserProfileDto
from app.services.institution_sync import link_user_to_institution
from app.services.security import hash_password
from app.services.structure import (
    _display_name,
    assert_institution_administrator,
    assert_institution_manager,
    create_program,
    get_docente_template_id,
    get_program_row,
    resolve_school_id,
)
from app.services.user_profile import (
    apply_profile_to_user,
    assert_profile_unique,
    create_user_with_profile,
    display_name_for_user,
    display_name_from_row,
    profile_from_row,
)

router = APIRouter(prefix="/institution/structure", tags=["structure"])


def _institution_ctx(
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


def _build_teacher_dto(row, classroom_ids: list[str]) -> TeacherDto:
    profile_data = profile_from_row(row)
    return TeacherDto(
        id=str(row["membership_id"]),
        membershipId=str(row["membership_id"]),
        userId=str(row["user_id"]),
        email=row["email"],
        firstName=row["first_name"],
        lastName=row["last_name"],
        displayName=display_name_from_row(row),
        subject=row["teaching_role"],
        classroomIds=classroom_ids,
        profile=UserProfileDto(**profile_data),
    )


@router.get("/programs", response_model=list[ProgramDto])
def list_programs(
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> list[ProgramDto]:
    _, inst, db = ctx
    rows = db.execute(
        text(
            """
            SELECT ip.id, ip.education_level, ip.shift, ip.official_code, ou.id AS level_unit_id,
                   (SELECT COUNT(*)::int FROM organizational_units c
                    WHERE c.type = 'course' AND c.institution_program_id = ip.id) AS classroom_count,
                   (SELECT COUNT(DISTINCT um.user_id)::int
                    FROM unit_memberships um
                    JOIN organizational_units u ON u.id = um.unit_id
                    WHERE u.institution_program_id = ip.id
                      AND um.teaching_role IS NOT NULL) AS teacher_count
            FROM institution_programs ip
            LEFT JOIN organizational_units ou
              ON ou.institution_program_id = ip.id AND ou.type = 'level'
            WHERE ip.institution_id = :institution_id
            ORDER BY ip.education_level, ip.shift
            """
        ),
        {"institution_id": inst},
    ).mappings().all()

    return [
        ProgramDto(
            id=str(row["id"]),
            educationLevel=row["education_level"],
            shift=row["shift"],
            officialCode=row["official_code"],
            levelUnitId=str(row["level_unit_id"]) if row["level_unit_id"] else None,
            classroomCount=row["classroom_count"] or 0,
            teacherCount=row["teacher_count"] or 0,
        )
        for row in rows
    ]


@router.post("/programs", response_model=ProgramDto, status_code=201)
def create_program_endpoint(
    body: CreateProgramBody,
    school_id: str | None = None,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> ProgramDto:
    _, inst, db = ctx
    school_uuid = resolve_school_id(db, inst, school_id)
    program_id = create_program(
        db,
        inst,
        school_uuid,
        body.educationLevel.strip(),
        body.shift.strip(),
        (body.officialCode or "").strip() or None,
    )
    db.commit()

    row = get_program_row(db, program_id, inst)
    if not row:
        raise HTTPException(500, "No se pudo cargar el nivel creado")
    return ProgramDto(
        id=str(row["id"]),
        educationLevel=row["education_level"],
        shift=row["shift"],
        officialCode=row["official_code"],
        levelUnitId=str(row["level_unit_id"]) if row["level_unit_id"] else None,
    )


@router.get("/classrooms", response_model=list[ClassroomDto])
def list_classrooms(
    program_id: str | None = None,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> list[ClassroomDto]:
    _, inst, db = ctx
    params: dict = {"institution_id": inst}
    program_filter = ""
    if program_id:
        try:
            params["program_id"] = uuid.UUID(program_id)
            program_filter = "AND c.institution_program_id = :program_id"
        except ValueError as exc:
            raise HTTPException(400, "programId inválido") from exc

    rows = db.execute(
        text(
            f"""
            SELECT c.id, c.name, c.institution_program_id AS program_id, ip.education_level,
                   (SELECT COUNT(DISTINCT um.user_id)::int
                    FROM unit_memberships um
                    WHERE um.unit_id = c.id) AS teacher_count
            FROM organizational_units c
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            WHERE c.type = 'course' AND ip.institution_id = :institution_id
            {program_filter}
            ORDER BY ip.education_level, c.name
            """
        ),
        params,
    ).mappings().all()

    return [
        ClassroomDto(
            id=str(row["id"]),
            programId=str(row["program_id"]),
            name=row["name"],
            educationLevel=row["education_level"],
            teacherCount=row["teacher_count"] or 0,
        )
        for row in rows
    ]


@router.post("/classrooms", response_model=ClassroomDto, status_code=201)
def create_classroom(
    body: CreateClassroomBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> ClassroomDto:
    _, inst, db = ctx
    try:
        program_uuid = uuid.UUID(body.programId)
    except ValueError as exc:
        raise HTTPException(400, "programId inválido") from exc

    program = get_program_row(db, program_uuid, inst)
    if not program or not program["level_unit_id"]:
        raise HTTPException(404, "Nivel no encontrado")

    classroom_id = uuid.uuid4()
    db.execute(
        text(
            """
            INSERT INTO organizational_units (
              id, institution_id, institution_program_id, name, type, parent_unit_id
            )
            VALUES (:id, :institution_id, :program_id, :name, 'course', :parent_id)
            """
        ),
        {
            "id": classroom_id,
            "institution_id": inst,
            "program_id": program_uuid,
            "name": body.name.strip(),
            "parent_id": program["level_unit_id"],
        },
    )
    db.commit()

    return ClassroomDto(
        id=str(classroom_id),
        programId=str(program_uuid),
        name=body.name.strip(),
        educationLevel=program["education_level"],
        teacherCount=0,
    )


@router.get("/teachers", response_model=list[TeacherDto])
def list_teachers(
    program_id: str | None = None,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> list[TeacherDto]:
    _, inst, db = ctx
    params: dict = {"institution_id": inst}
    program_filter = ""
    if program_id:
        try:
            params["program_id"] = uuid.UUID(program_id)
            program_filter = "AND u.institution_program_id = :program_id"
        except ValueError as exc:
            raise HTTPException(400, "programId inválido") from exc

    rows = db.execute(
        text(
            f"""
            SELECT um.id AS membership_id, um.user_id, um.teaching_role,
                   usr.email, usr.first_name, usr.last_name,
                   usr.username, usr.full_name, usr.address, usr.phone, usr.dni, usr.cuil, usr.personal_email,
                   u.institution_program_id AS program_id
            FROM unit_memberships um
            JOIN users usr ON usr.id = um.user_id
            JOIN organizational_units u ON u.id = um.unit_id
            JOIN institution_programs ip ON ip.id = u.institution_program_id
            WHERE ip.institution_id = :institution_id
              AND u.type = 'level'
              AND um.teaching_role IS NOT NULL
              {program_filter}
            ORDER BY um.teaching_role, usr.first_name, usr.last_name
            """
        ),
        params,
    ).mappings().all()

    teachers: list[TeacherDto] = []
    for row in rows:
        user_id = row["user_id"]
        classroom_rows = db.execute(
            text(
                """
                SELECT um.unit_id
                FROM unit_memberships um
                JOIN organizational_units c ON c.id = um.unit_id
                WHERE um.user_id = :user_id AND c.type = 'course'
                """
            ),
            {"user_id": user_id},
        ).all()
        teachers.append(_build_teacher_dto(row, [str(r[0]) for r in classroom_rows]))
    return teachers


@router.post("/teachers", response_model=TeacherDto, status_code=201)
def create_teacher(
    body: CreateTeacherBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> TeacherDto:
    user, inst, db = ctx
    try:
        program_uuid = uuid.UUID(body.programId)
    except ValueError as exc:
        raise HTTPException(400, "programId inválido") from exc

    program = get_program_row(db, program_uuid, inst)
    if not program or not program["level_unit_id"]:
        raise HTTPException(404, "Nivel no encontrado")

    subject = body.subject.strip()

    teacher_user = create_user_with_profile(db, body, body.password)
    db.flush()

    template_id = get_docente_template_id(db)
    membership_id = uuid.uuid4()
    db.execute(
        text(
            """
            INSERT INTO unit_memberships (
              id, user_id, unit_id, role_template_id, role_in_unit, teaching_role
            )
            VALUES (:id, :user_id, :unit_id, :template_id, 'member', :subject)
            """
        ),
        {
            "id": membership_id,
            "user_id": teacher_user.id,
            "unit_id": program["level_unit_id"],
            "template_id": template_id,
            "subject": subject,
        },
    )
    link_user_to_institution(db, teacher_user.id, inst)
    db.commit()

    row = db.execute(
        text(
            """
            SELECT um.id AS membership_id, um.user_id, um.teaching_role,
                   usr.email, usr.first_name, usr.last_name,
                   usr.username, usr.full_name, usr.address, usr.phone, usr.dni, usr.cuil, usr.personal_email
            FROM unit_memberships um
            JOIN users usr ON usr.id = um.user_id
            WHERE um.id = :membership_id
            """
        ),
        {"membership_id": membership_id},
    ).mappings().first()
    if not row:
        raise HTTPException(500, "No se pudo cargar el docente creado")
    return _build_teacher_dto(row, [])


@router.patch("/teachers/{membership_id}", response_model=TeacherDto)
def update_teacher(
    membership_id: str,
    body: UpdateTeacherBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> TeacherDto:
    _, inst, db = ctx
    try:
        membership_uuid = uuid.UUID(membership_id)
    except ValueError as exc:
        raise HTTPException(400, "membershipId inválido") from exc

    row = db.execute(
        text(
            """
            SELECT um.id AS membership_id, um.user_id, um.teaching_role, um.unit_id,
                   usr.email, usr.first_name, usr.last_name,
                   usr.username, usr.full_name, usr.address, usr.phone, usr.dni, usr.cuil, usr.personal_email
            FROM unit_memberships um
            JOIN users usr ON usr.id = um.user_id
            JOIN organizational_units u ON u.id = um.unit_id
            JOIN institution_programs ip ON ip.id = u.institution_program_id
            WHERE um.id = :membership_id
              AND ip.institution_id = :institution_id
              AND u.type = 'level'
              AND um.teaching_role IS NOT NULL
            """
        ),
        {"membership_id": membership_uuid, "institution_id": inst},
    ).mappings().first()
    if not row:
        raise HTTPException(404, "Docente no encontrado")

    teacher_user = db.get(User, row["user_id"])
    if not teacher_user:
        raise HTTPException(404, "Docente no encontrado")

    assert_profile_unique(db, body, exclude_user_id=teacher_user.id)
    apply_profile_to_user(teacher_user, body)
    if body.password:
        teacher_user.password_hash = hash_password(body.password)

    subject = row["teaching_role"]
    if body.subject is not None:
        subject = body.subject.strip()
        db.execute(
            text("UPDATE unit_memberships SET teaching_role = :subject WHERE id = :id"),
            {"subject": subject, "id": membership_uuid},
        )

    db.commit()

    classroom_rows = db.execute(
        text(
            """
            SELECT um.unit_id
            FROM unit_memberships um
            JOIN organizational_units c ON c.id = um.unit_id
            WHERE um.user_id = :user_id AND c.type = 'course'
            """
        ),
        {"user_id": teacher_user.id},
    ).all()

    updated = db.execute(
        text(
            """
            SELECT um.id AS membership_id, um.user_id, um.teaching_role,
                   usr.email, usr.first_name, usr.last_name,
                   usr.username, usr.full_name, usr.address, usr.phone, usr.dni, usr.cuil, usr.personal_email
            FROM unit_memberships um
            JOIN users usr ON usr.id = um.user_id
            WHERE um.id = :membership_id
            """
        ),
        {"membership_id": membership_uuid},
    ).mappings().first()
    if not updated:
        raise HTTPException(500, "No se pudo cargar el docente actualizado")
    return _build_teacher_dto(updated, [str(r[0]) for r in classroom_rows])


@router.delete("/teachers/{membership_id}", status_code=204)
def delete_teacher(
    membership_id: str,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_admin_ctx),
) -> None:
    _, inst, db = ctx
    try:
        membership_uuid = uuid.UUID(membership_id)
    except ValueError as exc:
        raise HTTPException(400, "membershipId inválido") from exc

    row = db.execute(
        text(
            """
            SELECT um.id, um.user_id
            FROM unit_memberships um
            JOIN organizational_units u ON u.id = um.unit_id
            JOIN institution_programs ip ON ip.id = u.institution_program_id
            WHERE um.id = :membership_id
              AND ip.institution_id = :institution_id
              AND u.type = 'level'
              AND um.teaching_role IS NOT NULL
            """
        ),
        {"membership_id": membership_uuid, "institution_id": inst},
    ).mappings().first()
    if not row:
        raise HTTPException(404, "Docente no encontrado")

    user_id = row["user_id"]
    db.execute(text("DELETE FROM unit_memberships WHERE id = :id"), {"id": membership_uuid})
    db.execute(
        text(
            """
            DELETE FROM unit_memberships um
            USING organizational_units c
            WHERE um.unit_id = c.id AND c.type = 'course' AND um.user_id = :user_id
            """
        ),
        {"user_id": user_id},
    )
    db.commit()


@router.get("/assignments", response_model=list[AssignmentDto])
def list_assignments(
    program_id: str | None = None,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> list[AssignmentDto]:
    _, inst, db = ctx
    params: dict = {"institution_id": inst}
    program_filter = ""
    if program_id:
        try:
            params["program_id"] = uuid.UUID(program_id)
            program_filter = "AND c.institution_program_id = :program_id"
        except ValueError as exc:
            raise HTTPException(400, "programId inválido") from exc

    rows = db.execute(
        text(
            f"""
            SELECT um.id, c.id AS classroom_id, c.name AS classroom_name,
                   u.id AS user_id, u.email, u.first_name, u.last_name, um.teaching_role
            FROM unit_memberships um
            JOIN organizational_units c ON c.id = um.unit_id
            JOIN users u ON u.id = um.user_id
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            WHERE c.type = 'course' AND ip.institution_id = :institution_id
            {program_filter}
            ORDER BY c.name, u.first_name, u.last_name
            """
        ),
        params,
    ).mappings().all()

    return [
        AssignmentDto(
            id=str(row["id"]),
            classroomId=str(row["classroom_id"]),
            classroomName=row["classroom_name"],
            teacherUserId=str(row["user_id"]),
            teacherName=_display_name(row["first_name"], row["last_name"], row["email"]),
            subject=row["teaching_role"],
        )
        for row in rows
    ]


@router.post("/assignments", response_model=AssignmentDto, status_code=201)
def create_assignment(
    body: CreateAssignmentBody,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> AssignmentDto:
    _, inst, db = ctx
    try:
        classroom_uuid = uuid.UUID(body.classroomId)
        teacher_uuid = uuid.UUID(body.teacherUserId)
    except ValueError as exc:
        raise HTTPException(400, "classroomId o teacherUserId inválido") from exc

    classroom = db.execute(
        text(
            """
            SELECT c.id, c.name, c.institution_program_id
            FROM organizational_units c
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            WHERE c.id = :classroom_id AND c.type = 'course' AND ip.institution_id = :institution_id
            """
        ),
        {"classroom_id": classroom_uuid, "institution_id": inst},
    ).mappings().first()
    if not classroom:
        raise HTTPException(404, "Aula no encontrada")

    teacher = db.execute(
        text(
            """
            SELECT u.id, u.email, u.first_name, u.last_name, um.teaching_role
            FROM users u
            JOIN unit_memberships um ON um.user_id = u.id
            JOIN organizational_units ou ON ou.id = um.unit_id
            WHERE u.id = :user_id
              AND ou.institution_program_id = :program_id
              AND ou.type = 'level'
              AND um.teaching_role IS NOT NULL
            LIMIT 1
            """
        ),
        {"user_id": teacher_uuid, "program_id": classroom["institution_program_id"]},
    ).mappings().first()
    if not teacher:
        raise HTTPException(404, "Docente no encontrado en este nivel")

    existing = db.execute(
        text(
            """
            SELECT id FROM unit_memberships
            WHERE user_id = :user_id AND unit_id = :unit_id
            """
        ),
        {"user_id": teacher_uuid, "unit_id": classroom_uuid},
    ).first()
    if existing:
        raise HTTPException(409, "Ese docente ya está asignado a esta aula")

    subject = (body.subject or teacher["teaching_role"] or "").strip() or None
    template_id = get_docente_template_id(db)
    assignment_id = uuid.uuid4()
    db.execute(
        text(
            """
            INSERT INTO unit_memberships (
              id, user_id, unit_id, role_template_id, role_in_unit, teaching_role
            )
            VALUES (:id, :user_id, :unit_id, :template_id, 'member', :subject)
            """
        ),
        {
            "id": assignment_id,
            "user_id": teacher_uuid,
            "unit_id": classroom_uuid,
            "template_id": template_id,
            "subject": subject,
        },
    )
    db.commit()

    return AssignmentDto(
        id=str(assignment_id),
        classroomId=str(classroom_uuid),
        classroomName=classroom["name"],
        teacherUserId=str(teacher_uuid),
        teacherName=_display_name(teacher["first_name"], teacher["last_name"], teacher["email"]),
        subject=subject,
    )


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: str,
    ctx: tuple[User, uuid.UUID, Session] = Depends(_institution_ctx),
) -> None:
    _, inst, db = ctx
    try:
        assignment_uuid = uuid.UUID(assignment_id)
    except ValueError as exc:
        raise HTTPException(400, "assignmentId inválido") from exc

    row = db.execute(
        text(
            """
            SELECT um.id
            FROM unit_memberships um
            JOIN organizational_units c ON c.id = um.unit_id
            JOIN institution_programs ip ON ip.id = c.institution_program_id
            WHERE um.id = :assignment_id
              AND c.type = 'course'
              AND ip.institution_id = :institution_id
            """
        ),
        {"assignment_id": assignment_uuid, "institution_id": inst},
    ).first()
    if not row:
        raise HTTPException(404, "Asignación no encontrada")

    db.execute(text("DELETE FROM unit_memberships WHERE id = :id"), {"id": assignment_uuid})
    db.commit()
