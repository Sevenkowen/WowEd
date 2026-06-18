import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import EventType, TaskType

DEFAULT_EVENT_TYPES = [
    ("Evento Escolar", "#F4511E"),
    ("Jornada Institucional", "#039BE5"),
    ("Fecha Administrativa", "#3F51B5"),
    ("Otro", "#616161"),
]

DEFAULT_TASK_TYPES = [
    "Pedagógico",
    "Administrativo",
    "Socio-comunicativo",
    "Flexible",
    "Personal",
]


def ensure_catalog_seeded(db: Session, institution_id: uuid.UUID) -> None:
    event_count = db.scalar(
        select(EventType.id).where(EventType.institution_id == institution_id).limit(1)
    )
    if not event_count:
        for i, (name, color) in enumerate(DEFAULT_EVENT_TYPES):
            db.add(
                EventType(
                    id=uuid.uuid4(),
                    institution_id=institution_id,
                    name=name,
                    color=color,
                    sort_order=i,
                )
            )

    task_count = db.scalar(
        select(TaskType.id).where(TaskType.institution_id == institution_id).limit(1)
    )
    if not task_count:
        for i, name in enumerate(DEFAULT_TASK_TYPES):
            db.add(
                TaskType(
                    id=uuid.uuid4(),
                    institution_id=institution_id,
                    name=name,
                    sort_order=i,
                )
            )

    db.commit()
