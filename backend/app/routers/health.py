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
    """Verifica migraciones de calendario, catálogos, objetivos y planificador."""
    checks = {
        "tasks_calendar_columns": (
            "tasks",
            "due_date",
        ),
        "event_types_table": ("event_types", "id"),
        "task_types_table": ("task_types", "id"),
        "objectives_table": ("objectives", "id"),
        "weekly_planner_table": ("weekly_planner_weeks", "id"),
    }
    result: dict[str, bool] = {}
    for key, (table, column) in checks.items():
        row = db.execute(
            text(
                """
                SELECT COUNT(*) AS n
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = :table
                  AND column_name = :column
                """
            ),
            {"table": table, "column": column},
        ).one()
        result[key] = row.n > 0
    return {
        **result,
        "hint": "Ejecutá backend/migrations/*.sql en orden si algún valor es false",
    }
