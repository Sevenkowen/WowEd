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
    "006_calendar_assignees.sql",
    "007_leadership_positions.sql",
    "008_v2_institutional_schema.sql",
    "009_v2_extend_existing_tables.sql",
    "010_v2_sync_legacy_data.sql",
    "011_v2_functions.sql",
    "012_owner.sql",
    "013_structure_fixes.sql",
    "014_representante_legal.sql",
    "015_admin_label.sql",
    "016_user_profile_fields.sql",
    "017_institutional_roles.sql",
    "018_rbac_and_contact_fields.sql",
    "019_user_password_flags.sql",
    "020_role_module_permissions.sql",
    "021_institution_location_fields.sql",
    "022_institution_responsible_and_school_shifts.sql",
    "023_platform_role_display_names.sql",
    "024_profesor_leadership_position.sql",
    "025_user_pending_administrador.sql",
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
