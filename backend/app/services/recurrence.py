"""Mapeo simple preset del frontend → event_recurrence."""

from datetime import date, timedelta
from uuid import uuid4

from app.models.calendar import EventRecurrence

PRESET_TO_FREQUENCY = {
    "none": None,
    "daily": "daily",
    "weekly": "weekly",
    "monthly-nth-weekday": "monthly",
    "monthly-last-weekday": "monthly",
    "yearly": "yearly",
    "weekdays": "weekly",
}


def recurrence_from_preset(preset: str, start: date) -> EventRecurrence | None:
    freq = PRESET_TO_FREQUENCY.get(preset)
    if not freq:
        return None
    end = start + timedelta(days=365)
    return EventRecurrence(
        id=uuid4(),
        frequency=freq,
        interval=1,
        days_of_week=str(start.weekday()) if preset in ("weekly", "weekdays") else None,
        day_of_month=start.day if freq == "monthly" else None,
        start_date=start,
        end_date=end,
    )
