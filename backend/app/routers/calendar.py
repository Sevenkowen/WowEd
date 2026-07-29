import uuid
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import resolve_institution_id
from app.models.calendar import CalendarEvent, Task
from app.schemas.calendar import (
    CalEventDto,
    CalTaskDto,
    CreateEventBody,
    CreateTaskBody,
    EventsByDateResponse,
    MoveEventBody,
    MoveTaskBody,
    PatchEventBody,
    PatchTaskBody,
    ResizeEventBody,
    ResizeTaskBody,
    TasksByDateResponse,
)
from app.services.calendar_assignees import (
    existing_event_assignee_ids,
    existing_task_assignee_ids,
    load_event_assignees_map,
    load_task_assignees_map,
    sync_event_assignees,
    sync_task_assignees,
    validate_assignee_ids,
)
from app.services.institution_seed import ensure_institution_exists
from app.services.mappers import combine_date_time, event_to_dto, parse_hhmm, task_to_dto
from app.services.recurrence import recurrence_from_preset

router = APIRouter(prefix="/calendar", tags=["calendar"])

PAST_DATE_DETAIL = "No se pueden crear eventos o tareas en fechas anteriores a hoy."


def _sync_linked_tasks_to_event_date(db: Session, event_id: uuid.UUID, new_date) -> None:
    """Las tareas vinculadas siguen al evento cuando cambia de día."""
    linked = db.scalars(select(Task).where(Task.linked_event_id == event_id)).all()
    for task in linked:
        task.due_date = new_date


def _reject_past_date(date_str: str) -> None:
    from datetime import date as date_cls

    if date_cls.fromisoformat(date_str) < date_cls.today():
        raise HTTPException(400, PAST_DATE_DETAIL)


def _reject_past_modify(existing_start_date, new_date_str: str | None = None) -> None:
    """Bloquea mover/redimensionar ítems en fechas pasadas o moverlos al pasado."""
    from datetime import date as date_cls

    today = date_cls.today()
    if existing_start_date and existing_start_date < today:
        raise HTTPException(400, PAST_DATE_DETAIL)
    if new_date_str:
        _reject_past_date(new_date_str)


def _default_institution(body_institution: str | None) -> uuid.UUID | None:
    try:
        return resolve_institution_id(body_institution)
    except HTTPException:
        raw = settings.default_institution_id
        if not raw:
            return None
        try:
            return uuid.UUID(raw)
        except ValueError:
            return None


@router.get("/events", response_model=EventsByDateResponse)
def list_events(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    institution_id: str | None = None,
    db: Session = Depends(get_db),
):
    q = select(CalendarEvent)
    inst = _default_institution(institution_id)
    if inst:
        q = q.where(CalendarEvent.institution_id == inst)
    events = db.scalars(q).all()
    assignees_map = load_event_assignees_map(db, events)

    por_fecha: dict[str, list[dict]] = {}
    for ev in events:
        if not ev.start_time:
            continue
        ymd = ev.start_time.strftime("%Y-%m-%d")
        if from_date and ymd < from_date:
            continue
        if to_date and ymd > to_date:
            continue
        por_fecha.setdefault(ymd, []).append(
            event_to_dto(ev, assignees_map.get(str(ev.id), []))
        )

    for ymd in por_fecha:
        por_fecha[ymd].sort(key=lambda e: e["datetime"])

    return {"por_fecha": por_fecha}


@router.post("/events", response_model=CalEventDto)
def create_event(body: CreateEventBody, db: Session = Depends(get_db)):
    _reject_past_date(body.date)
    inst = _default_institution(body.institution_id)
    if inst:
        ensure_institution_exists(db, inst)
    recurrence_id = None
    if body.recurrence and body.recurrence != "none":
        from datetime import date as date_cls

        rec = recurrence_from_preset(body.recurrence, date_cls.fromisoformat(body.date))
        if rec:
            db.add(rec)
            db.flush()
            recurrence_id = rec.id

    if body.all_day:
        start = combine_date_time(body.date, "00:00")
        end = combine_date_time(body.date, "23:59")
    else:
        start_h = body.start_time or "09:00"
        end_h = body.end_time or "10:00"
        start = combine_date_time(body.date, start_h)
        end = combine_date_time(body.date, end_h)
        if end <= start:
            end = start + timedelta(hours=1)

    ev = CalendarEvent(
        id=uuid.uuid4(),
        institution_id=inst,
        title=body.title,
        description=body.description,
        start_time=start,
        end_time=end,
        visibility_scope=body.event_type,
        recurrence_id=recurrence_id,
    )
    db.add(ev)
    db.flush()
    assignee_uuids = validate_assignee_ids(db, inst, body.assignee_ids)
    assignees = sync_event_assignees(db, ev.id, assignee_uuids, ev.institution_id)
    db.commit()
    db.refresh(ev)
    return event_to_dto(ev, assignees)


@router.patch("/events/{event_id}/move", response_model=CalEventDto)
def move_event(event_id: str, body: MoveEventBody, db: Session = Depends(get_db)):
    ev = db.get(CalendarEvent, uuid.UUID(event_id))
    if not ev:
        raise HTTPException(404, "Evento no encontrado")
    existing_date = ev.start_time.date() if ev.start_time else None
    _reject_past_modify(existing_date, body.date)
    duration = timedelta(hours=1)
    if ev.start_time and ev.end_time:
        duration = ev.end_time - ev.start_time
    start = combine_date_time(body.date, body.start_time)
    ev.start_time = start
    ev.end_time = start + duration
    _sync_linked_tasks_to_event_date(db, ev.id, start.date())
    db.commit()
    db.refresh(ev)
    assignees_map = load_event_assignees_map(db, [ev])
    return event_to_dto(ev, assignees_map.get(str(ev.id), []))


@router.patch("/events/{event_id}/resize", response_model=CalEventDto)
def resize_event(event_id: str, body: ResizeEventBody, db: Session = Depends(get_db)):
    ev = db.get(CalendarEvent, uuid.UUID(event_id))
    if not ev or not ev.start_time:
        raise HTTPException(404, "Evento no encontrado")
    _reject_past_modify(ev.start_time.date())
    end = combine_date_time(ev.start_time.strftime("%Y-%m-%d"), body.end_time)
    if end <= ev.start_time:
        end = ev.start_time + timedelta(minutes=30)
    ev.end_time = end
    db.commit()
    db.refresh(ev)
    assignees_map = load_event_assignees_map(db, [ev])
    return event_to_dto(ev, assignees_map.get(str(ev.id), []))


@router.patch("/events/{event_id}", response_model=CalEventDto)
def patch_event(event_id: str, body: PatchEventBody, db: Session = Depends(get_db)):
    ev = db.get(CalendarEvent, uuid.UUID(event_id))
    if not ev:
        raise HTTPException(404, "Evento no encontrado")
    existing_date = ev.start_time.date() if ev.start_time else None
    if body.date is not None:
        _reject_past_modify(existing_date, body.date)
    elif existing_date:
        _reject_past_modify(existing_date)

    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(400, "El título no puede estar vacío")
        ev.title = title
    if body.description is not None:
        ev.description = body.description.strip() or None
    if body.event_type is not None:
        ev.visibility_scope = body.event_type

    date_str = body.date or (ev.start_time.strftime("%Y-%m-%d") if ev.start_time else None)
    if not date_str:
        raise HTTPException(400, "Fecha inválida")

    if body.all_day is True:
        ev.start_time = combine_date_time(date_str, "00:00")
        ev.end_time = combine_date_time(date_str, "23:59")
    elif body.all_day is False or body.start_time or body.end_time:
        start_h = body.start_time
        if not start_h and ev.start_time:
            start_h = ev.start_time.strftime("%H:%M")
        start_h = start_h or "09:00"
        end_h = body.end_time
        if not end_h and ev.end_time:
            end_h = ev.end_time.strftime("%H:%M")
        end_h = end_h or "10:00"
        start = combine_date_time(date_str, start_h)
        end = combine_date_time(date_str, end_h)
        if end <= start:
            end = start + timedelta(hours=1)
        ev.start_time = start
        ev.end_time = end
    elif body.date is not None and ev.start_time:
        start_h = ev.start_time.strftime("%H:%M")
        end_h = ev.end_time.strftime("%H:%M") if ev.end_time else start_h
        start = combine_date_time(date_str, start_h)
        end = combine_date_time(date_str, end_h)
        if end <= start:
            end = start + timedelta(hours=1)
        ev.start_time = start
        ev.end_time = end

    assignees = None
    if body.assignee_ids is not None:
        assignee_uuids = validate_assignee_ids(
            db,
            ev.institution_id,
            body.assignee_ids,
            allow_existing=existing_event_assignee_ids(db, ev.id),
        )
        assignees = sync_event_assignees(db, ev.id, assignee_uuids, ev.institution_id)

    if ev.start_time:
        _sync_linked_tasks_to_event_date(db, ev.id, ev.start_time.date())

    db.commit()
    db.refresh(ev)
    if assignees is not None:
        return event_to_dto(ev, assignees)
    assignees_map = load_event_assignees_map(db, [ev])
    return event_to_dto(ev, assignees_map.get(str(ev.id), []))


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    ev = db.get(CalendarEvent, uuid.UUID(event_id))
    if not ev:
        raise HTTPException(404, "Evento no encontrado")
    existing_date = ev.start_time.date() if ev.start_time else None
    _reject_past_modify(existing_date)
    linked = db.scalars(select(Task).where(Task.linked_event_id == ev.id)).all()
    for task in linked:
        task.linked_event_id = None
    db.delete(ev)
    db.commit()


@router.get("/tasks", response_model=TasksByDateResponse)
def list_tasks(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    try:
        tasks = db.scalars(
            select(Task).order_by(Task.due_date, Task.start_time.asc().nulls_first(), Task.title, Task.id)
        ).all()
    except Exception as exc:
        raise HTTPException(
            503,
            "Falta migración de tasks. Ejecutá backend/migrations/001_task_calendar_fields.sql",
        ) from exc

    assignees_map = load_task_assignees_map(db, tasks)

    por_fecha: dict[str, list[dict]] = {}
    for task in tasks:
        if not task.due_date:
            continue
        ymd = task.due_date.isoformat()
        if from_date and ymd < from_date:
            continue
        if to_date and ymd > to_date:
            continue
        por_fecha.setdefault(ymd, []).append(
            task_to_dto(task, assignees_map.get(str(task.id), []))
        )

    return {"por_fecha": por_fecha}


@router.post("/tasks", response_model=CalTaskDto)
def create_task(body: CreateTaskBody, db: Session = Depends(get_db)):
    from datetime import date as date_cls

    _reject_past_date(body.date)
    linked: uuid.UUID | None = None
    if body.event_id:
        try:
            linked = uuid.UUID(body.event_id)
        except ValueError as exc:
            raise HTTPException(400, "event_id inválido") from exc
        if not db.get(CalendarEvent, linked):
            raise HTTPException(404, "Evento no encontrado para vincular la tarea")
    start_t = parse_hhmm(body.time) if body.time and not body.all_day else None
    end_t = parse_hhmm(body.end_time) if body.end_time and not body.all_day else None
    if start_t and not end_t:
        end_t = (datetime.combine(date_cls.today(), start_t) + timedelta(minutes=30)).time()

    inst = _default_institution(body.institution_id)
    if inst:
        ensure_institution_exists(db, inst)

    task = Task(
        id=uuid.uuid4(),
        title=body.title,
        description=body.description,
        linked_event_id=linked,
        status="pending" if not body.completed else "done",
        due_date=date_cls.fromisoformat(body.date),
        start_time=start_t,
        end_time=end_t,
        all_day=body.all_day,
        tipo=body.tipo,
        cuadrante=body.cuadrante,
        completed=body.completed,
        recurrence_preset=body.recurrence if body.recurrence != "none" else None,
        institution_id=_default_institution(body.institution_id),
    )
    db.add(task)
    db.flush()
    assignee_uuids = validate_assignee_ids(db, inst, body.assignee_ids)
    assignees = sync_task_assignees(db, task.id, assignee_uuids, task.institution_id)
    db.commit()
    db.refresh(task)
    return task_to_dto(task, assignees)


@router.patch("/tasks/{task_id}/move", response_model=CalTaskDto)
def move_task(task_id: str, body: MoveTaskBody, db: Session = Depends(get_db)):
    from datetime import date as date_cls

    task = db.get(Task, uuid.UUID(task_id))
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    _reject_past_modify(task.due_date, body.date)

    duration = timedelta(minutes=30)
    if task.due_date and task.start_time and task.end_time:
        start_dt = datetime.combine(task.due_date, task.start_time)
        end_dt = datetime.combine(task.due_date, task.end_time)
        if end_dt > start_dt:
            duration = end_dt - start_dt

    task.due_date = date_cls.fromisoformat(body.date)
    if body.time:
        task.start_time = parse_hhmm(body.time)
        end_dt = datetime.combine(task.due_date, task.start_time) + duration
        task.end_time = end_dt.time()
    db.commit()
    db.refresh(task)
    assignees_map = load_task_assignees_map(db, [task])
    return task_to_dto(task, assignees_map.get(str(task.id), []))


@router.patch("/tasks/{task_id}", response_model=CalTaskDto)
def patch_task(task_id: str, body: PatchTaskBody, db: Session = Depends(get_db)):
    from datetime import date as date_cls

    task = db.get(Task, uuid.UUID(task_id))
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    if body.date is not None:
        _reject_past_modify(task.due_date, body.date)
        task.due_date = date_cls.fromisoformat(body.date)
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(400, "El título no puede estar vacío")
        task.title = title
    if body.description is not None:
        task.description = body.description.strip() or None
    if body.tipo is not None:
        task.tipo = body.tipo
    if body.cuadrante is not None:
        task.cuadrante = body.cuadrante
    if body.completed is not None:
        task.completed = body.completed
        task.status = "done" if body.completed else "pending"
    if body.all_day is not None:
        task.all_day = body.all_day
        if body.all_day:
            task.start_time = None
            task.end_time = None
    if body.time is not None or body.end_time is not None:
        if body.time:
            task.start_time = parse_hhmm(body.time)
        elif body.time == "":
            task.start_time = None
        if body.end_time:
            task.end_time = parse_hhmm(body.end_time)
        elif body.end_time == "":
            task.end_time = None
        if task.start_time and not task.end_time:
            task.end_time = (
                datetime.combine(task.due_date or datetime.today().date(), task.start_time)
                + timedelta(minutes=30)
            ).time()
    if body.event_id is not None:
        task.linked_event_id = uuid.UUID(body.event_id) if body.event_id else None

    assignees = None
    if body.assignee_ids is not None:
        assignee_uuids = validate_assignee_ids(
            db,
            task.institution_id,
            body.assignee_ids,
            allow_existing=existing_task_assignee_ids(db, task.id),
        )
        assignees = sync_task_assignees(db, task.id, assignee_uuids, task.institution_id)

    db.commit()
    db.refresh(task)
    if assignees is not None:
        return task_to_dto(task, assignees)
    assignees_map = load_task_assignees_map(db, [task])
    return task_to_dto(task, assignees_map.get(str(task.id), []))


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(Task, uuid.UUID(task_id))
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    _reject_past_modify(task.due_date)
    db.delete(task)
    db.commit()


@router.patch("/tasks/{task_id}/resize", response_model=CalTaskDto)
def resize_task(task_id: str, body: ResizeTaskBody, db: Session = Depends(get_db)):
    task = db.get(Task, uuid.UUID(task_id))
    if not task or not task.start_time:
        raise HTTPException(404, "Tarea no encontrada")
    _reject_past_modify(task.due_date)
    end_t = parse_hhmm(body.end_time)
    if end_t <= task.start_time:
        end_t = (datetime.combine(task.due_date or datetime.today().date(), task.start_time) + timedelta(minutes=30)).time()
    task.end_time = end_t
    db.commit()
    db.refresh(task)
    assignees_map = load_task_assignees_map(db, [task])
    return task_to_dto(task, assignees_map.get(str(task.id), []))
