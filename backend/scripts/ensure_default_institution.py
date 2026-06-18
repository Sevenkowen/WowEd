"""Inserta la institución por defecto si no existe (requerida por FK en calendar_events)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.config import DEFAULT_INSTITUTION_UUID
from app.database import engine

SQL = """
INSERT INTO institutions (id, name)
VALUES (:id, :name)
ON CONFLICT (id) DO NOTHING;
"""


def main() -> None:
    with engine.begin() as conn:
        # institutions puede no tener UNIQUE en id si el esquema es legacy; intentar insert selectivo
        exists = conn.execute(
            text("SELECT 1 FROM institutions WHERE id = :id"),
            {"id": DEFAULT_INSTITUTION_UUID},
        ).first()
        if exists:
            print(f"Institución por defecto ya existe: {DEFAULT_INSTITUTION_UUID}")
            return
        conn.execute(
            text("INSERT INTO institutions (id, name) VALUES (:id, :name)"),
            {"id": DEFAULT_INSTITUTION_UUID, "name": "Institución por defecto"},
        )
        print(f"Institución por defecto creada: {DEFAULT_INSTITUTION_UUID}")


if __name__ == "__main__":
    main()
