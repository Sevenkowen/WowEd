import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import DEFAULT_INSTITUTION_UUID


def ensure_institution_exists(db: Session, institution_id: uuid.UUID) -> None:
    """Garantiza que institution_id exista en institutions (FK de calendar_events)."""
    row = db.execute(
        text("SELECT 1 FROM institutions WHERE id = :id"),
        {"id": institution_id},
    ).first()
    if row:
        return
    db.execute(
        text("INSERT INTO institutions (id, name) VALUES (:id, :name)"),
        {"id": institution_id, "name": "Institución por defecto"},
    )
    db.flush()
