import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.models.calendar import CalendarEvent, CalendarEventAssignee, Task, TaskAssignee
from app.models.user import User
from app.schemas.calendar import AssigneeDto


def user_display_name(user: User) -> str:
    parts = [user.first_name or "", user.last_name or ""]
    name = " ".join(p.strip() for p in parts if p and p.strip())
    return name or user.email


def institution_user_ids(db: Session, institution_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT u.id
            FROM users u
            JOIN school_memberships sm ON sm.user_id = u.id
            JOIN schools s ON s.id = sm.school_id
            WHERE s.institution_id = :institution_id
            """
        ),
        {"institution_id": institution_id},
    ).scalars().all()
    return set(rows)


def _members_by_institution(
    db: Session,
    institution_ids: set[uuid.UUID],
) -> dict[uuid.UUID, set[uuid.UUID]]:
    return {inst: institution_user_ids(db, inst) for inst in institution_ids}


def _assignee_dto(
    user: User | None,
    user_id: uuid.UUID,
    institution_id: uuid.UUID | None,
    member_ids: set[uuid.UUID],
) -> AssigneeDto:
    if not user:
        return AssigneeDto(
            id=str(user_id),
            displayName="Usuario no disponible",
            email=None,
            active=False,
        )
    active = institution_id is None or user.id in member_ids
    return AssigneeDto(
        id=str(user.id),
        displayName=user_display_name(user),
        email=user.email,
        active=active,
    )


def validate_assignee_ids(
    db: Session,
    institution_id: uuid.UUID | None,
    user_ids: list[str],
    *,
    allow_existing: set[uuid.UUID] | None = None,
) -> list[uuid.UUID]:
    if not user_ids:
        return []
    if not institution_id:
        raise HTTPException(400, "No se puede asignar usuarios sin institución")

    allowed = institution_user_ids(db, institution_id)
    existing = allow_existing or set()
    parsed: list[uuid.UUID] = []
    for raw in user_ids:
        try:
            uid = uuid.UUID(str(raw))
        except ValueError as exc:
            raise HTTPException(400, f"user_id inválido: {raw}") from exc
        if uid not in allowed and uid not in existing:
            raise HTTPException(400, "Uno o más usuarios no pertenecen a la institución")
        parsed.append(uid)
    return list(dict.fromkeys(parsed))


def existing_event_assignee_ids(db: Session, event_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.scalars(
        select(CalendarEventAssignee.user_id).where(CalendarEventAssignee.event_id == event_id)
    ).all()
    return set(rows)


def existing_task_assignee_ids(db: Session, task_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.scalars(
        select(TaskAssignee.user_id).where(TaskAssignee.task_id == task_id)
    ).all()
    return set(rows)


def _assignee_dtos(
    db: Session,
    user_ids: list[uuid.UUID],
    institution_id: uuid.UUID | None,
) -> list[AssigneeDto]:
    if not user_ids:
        return []
    members = institution_user_ids(db, institution_id) if institution_id else set()
    users = db.scalars(select(User).where(User.id.in_(user_ids))).all()
    by_id = {u.id: u for u in users}
    return [_assignee_dto(by_id.get(uid), uid, institution_id, members) for uid in user_ids]


def load_event_assignees_map(
    db: Session,
    events: list[CalendarEvent],
) -> dict[str, list[AssigneeDto]]:
    if not events:
        return {}
    event_ids = [ev.id for ev in events]
    inst_by_event = {ev.id: ev.institution_id for ev in events}
    institutions = {inst for inst in inst_by_event.values() if inst}
    members_by_inst = _members_by_institution(db, institutions)

    rows = db.scalars(
        select(CalendarEventAssignee)
        .where(CalendarEventAssignee.event_id.in_(event_ids))
        .order_by(CalendarEventAssignee.assigned_at)
    ).all()
    user_ids = list({r.user_id for r in rows})
    users = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    by_id = {u.id: u for u in users}

    result: dict[str, list[AssigneeDto]] = {}
    for row in rows:
        inst = inst_by_event.get(row.event_id)
        members = members_by_inst.get(inst, set()) if inst else set()
        key = str(row.event_id)
        result.setdefault(key, []).append(
            _assignee_dto(by_id.get(row.user_id), row.user_id, inst, members)
        )
    return result


def load_task_assignees_map(
    db: Session,
    tasks: list[Task],
) -> dict[str, list[AssigneeDto]]:
    if not tasks:
        return {}
    task_ids = [task.id for task in tasks]
    inst_by_task = {task.id: task.institution_id for task in tasks}
    institutions = {inst for inst in inst_by_task.values() if inst}
    members_by_inst = _members_by_institution(db, institutions)

    rows = db.scalars(
        select(TaskAssignee)
        .where(TaskAssignee.task_id.in_(task_ids))
        .order_by(TaskAssignee.assigned_at)
    ).all()
    user_ids = list({r.user_id for r in rows})
    users = db.scalars(select(User).where(User.id.in_(user_ids))).all() if user_ids else []
    by_id = {u.id: u for u in users}

    result: dict[str, list[AssigneeDto]] = {}
    for row in rows:
        inst = inst_by_task.get(row.task_id)
        members = members_by_inst.get(inst, set()) if inst else set()
        key = str(row.task_id)
        result.setdefault(key, []).append(
            _assignee_dto(by_id.get(row.user_id), row.user_id, inst, members)
        )
    return result


def sync_event_assignees(
    db: Session,
    event_id: uuid.UUID,
    user_ids: list[uuid.UUID],
    institution_id: uuid.UUID | None = None,
    assigned_by: uuid.UUID | None = None,
) -> list[AssigneeDto]:
    db.execute(delete(CalendarEventAssignee).where(CalendarEventAssignee.event_id == event_id))
    now = datetime.now(timezone.utc)
    for uid in user_ids:
        db.add(
            CalendarEventAssignee(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=uid,
                assigned_at=now,
                assigned_by=assigned_by,
            )
        )
    return _assignee_dtos(db, user_ids, institution_id)


def sync_task_assignees(
    db: Session,
    task_id: uuid.UUID,
    user_ids: list[uuid.UUID],
    institution_id: uuid.UUID | None = None,
    assigned_by: uuid.UUID | None = None,
) -> list[AssigneeDto]:
    db.execute(delete(TaskAssignee).where(TaskAssignee.task_id == task_id))
    now = datetime.now(timezone.utc)
    for uid in user_ids:
        db.add(
            TaskAssignee(
                id=uuid.uuid4(),
                task_id=task_id,
                user_id=uid,
                assigned_at=now,
                assigned_by=assigned_by,
            )
        )
    return _assignee_dtos(db, user_ids, institution_id)
