import uuid
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.calendar import CalendarEvent, Task
from app.schemas.calendar import (
    CalEventDto,
    CalTaskDto,
    CreateEventBody,
    CreateTaskBody,
    EventsByDateResponse,
    MoveEventBody,
    MoveTaskBody,
    PatchTaskBody,
    ResizeEventBody,
    ResizeTaskBody,
    TasksByDateResponse,
)
from app.services.mappers import combine_date_time, event_to_dto, parse_hhmm, task_to_dto
from app.services.recurrence import recurrence_from_preset

router = APIRouter(prefix="/calendar", tags=["calendar"])

PAST_DATE_DETAIL = "No se pueden crear eventos o tareas en fechas anteriores a hoy."


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
    raw = body_institution or settings.default_institution_id
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

    por_fecha: dict[str, list[dict]] = {}
    for ev in events:
        if not ev.start_time:
            continue
        ymd = ev.start_time.strftime("%Y-%m-%d")
        if from_date and ymd < from_date:
            continue
        if to_date and ymd > to_date:
            continue
        por_fecha.setdefault(ymd, []).append(event_to_dto(ev))

    for ymd in por_fecha:
        por_fecha[ymd].sort(key=lambda e: e["datetime"])

    return {"por_fecha": por_fecha}


@router.post("/events", response_model=CalEventDto)
def create_event(body: CreateEventBody, db: Session = Depends(get_db)):
    _reject_past_date(body.date)
    inst = _default_institution(body.institution_id)
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
    db.commit()
    db.refresh(ev)
    return event_to_dto(ev)


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
    db.commit()
    db.refresh(ev)
    return event_to_dto(ev)


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
    return event_to_dto(ev)


@router.get("/tasks", response_model=TasksByDateResponse)
def list_tasks(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    try:
        tasks = db.scalars(select(Task)).all()
    except Exception as exc:
        raise HTTPException(
            503,
            "Falta migración de tasks. Ejecutá backend/migrations/001_task_calendar_fields.sql",
        ) from exc

    por_fecha: dict[str, list[dict]] = {}
    for task in tasks:
        if not task.due_date:
            continue
        ymd = task.due_date.isoformat()
        if from_date and ymd < from_date:
            continue
        if to_date and ymd > to_date:
            continue
        por_fecha.setdefault(ymd, []).append(task_to_dto(task))

    return {"por_fecha": por_fecha}


@router.post("/tasks", response_model=CalTaskDto)
def create_task(body: CreateTaskBody, db: Session = Depends(get_db)):
    from datetime import date as date_cls

    _reject_past_date(body.date)
    linked = uuid.UUID(body.event_id) if body.event_id else None
    start_t = parse_hhmm(body.time) if body.time and not body.all_day else None
    end_t = parse_hhmm(body.end_time) if body.end_time and not body.all_day else None
    if start_t and not end_t:
        end_t = (datetime.combine(date_cls.today(), start_t) + timedelta(minutes=30)).time()

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
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dto(task)


@router.patch("/tasks/{task_id}/move", response_model=CalTaskDto)
def move_task(task_id: str, body: MoveTaskBody, db: Session = Depends(get_db)):
    from datetime import date as date_cls

    task = db.get(Task, uuid.UUID(task_id))
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    _reject_past_modify(task.due_date, body.date)
    task.due_date = date_cls.fromisoformat(body.date)
    if body.time:
        task.start_time = parse_hhmm(body.time)
    db.commit()
    db.refresh(task)
    return task_to_dto(task)


@router.patch("/tasks/{task_id}", response_model=CalTaskDto)
def patch_task(task_id: str, body: PatchTaskBody, db: Session = Depends(get_db)):
    task = db.get(Task, uuid.UUID(task_id))
    if not task:
        raise HTTPException(404, "Tarea no encontrada")
    if body.completed is not None:
        task.completed = body.completed
        task.status = "done" if body.completed else "pending"
    db.commit()
    db.refresh(task)
    return task_to_dto(task)


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
    return task_to_dto(task)
