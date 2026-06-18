"""Ejecuta migraciones SQL en orden (idempotentes). Uso: py scripts/run_migrations.py"""

import sys
from pathlib import Path

# Permite importar app.* al ejecutar como script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.database import engine

MIGRATIONS = [
    "001_task_calendar_fields.sql",
    "002_catalog_types.sql",
    "003_objectives.sql",
    "004_weekly_planner.sql",
    "005_default_institution.sql",
]

def main() -> None:
    root = Path(__file__).resolve().parents[1] / "migrations"
    with engine.begin() as conn:
        for name in MIGRATIONS:
            path = root / name
            if not path.is_file():
                print(f"SKIP (no existe): {name}")
                continue
            sql = path.read_text(encoding="utf-8")
            print(f"Ejecutando {name}...")
            conn.execute(text(sql))
            print(f"  OK")
    print("Migraciones completadas.")


if __name__ == "__main__":
    main()
