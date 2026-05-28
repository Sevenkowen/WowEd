from datetime import datetime, time

from app.models.calendar import CalendarEvent, Task

ALL_DAY_LABEL = "Todo el día"


def _fmt_time(t: time) -> str:
    return f"{t.hour:02d}:{t.minute:02d}"


def _fmt_range(start: time, end: time) -> str:
    a, b = _fmt_time(start), _fmt_time(end)
    return a if a == b else f"{a} – {b}"


def event_to_dto(ev: CalendarEvent) -> dict:
    start = ev.start_time
    end = ev.end_time
    all_day = False
    if start and end:
        all_day = (
            start.hour == 0
            and start.minute == 0
            and end.hour in (23, 0)
            and (end.minute >= 59 or end.hour == 23)
        ) or start.date() != end.date()

    if not start:
        return {
            "id": str(ev.id),
            "name": ev.title or "",
            "time": ALL_DAY_LABEL,
            "datetime": "",
            "endDatetime": None,
            "href": "#",
            "description": ev.description,
            "eventType": ev.visibility_scope,
            "allDay": True,
        }

    date_part = start.strftime("%Y-%m-%d")
    start_t = start.time()
    end_t = end.time() if end else None

    if all_day or (start_t == time(0, 0) and end_t and end_t >= time(23, 59)):
        time_label = ALL_DAY_LABEL
        all_day = True
    elif end_t:
        time_label = _fmt_range(start_t, end_t)
    else:
        time_label = _fmt_time(start_t)

    return {
        "id": str(ev.id),
        "name": ev.title or "",
        "time": time_label,
        "datetime": f"{date_part}T{_fmt_time(start_t)}",
        "endDatetime": f"{date_part}T{_fmt_time(end_t)}" if end_t else None,
        "href": "#",
        "description": ev.description,
        "eventType": ev.visibility_scope,
        "allDay": all_day,
    }


def task_to_dto(task: Task) -> dict:
    due = task.due_date
    date_str = due.isoformat() if due else ""
    time_str = _fmt_time(task.start_time) if task.start_time else None
    end_str = _fmt_time(task.end_time) if task.end_time else None
    return {
        "id": str(task.id),
        "date": date_str,
        "title": task.title or "",
        "description": task.description,
        "tipo": task.tipo,
        "cuadrante": task.cuadrante,
        "eventId": str(task.linked_event_id) if task.linked_event_id else None,
        "completed": bool(task.completed),
        "time": time_str,
        "endTime": end_str,
        "allDay": bool(task.all_day),
        "recurrence": task.recurrence_preset,
    }


def parse_hhmm(value: str) -> time:
    h, m = value.split(":")
    return time(int(h), int(m or 0))


def combine_date_time(date_str: str, hhmm: str) -> datetime:
    y, mo, d = map(int, date_str.split("-"))
    t = parse_hhmm(hhmm)
    return datetime(y, mo, d, t.hour, t.minute)
