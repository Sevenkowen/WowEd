from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/health/db-schema")
def db_schema_check(db: Session = Depends(get_db)):
    """Verifica columnas de calendario en tasks (migración 001)."""
    row = db.execute(
        text(
            """
            SELECT COUNT(*) AS n
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tasks'
              AND column_name = 'due_date'
            """
        )
    ).one()
    return {
        "tasks_calendar_columns": row.n > 0,
        "hint": "Ejecutá backend/migrations/001_task_calendar_fields.sql si tasks_calendar_columns es false",
    }
