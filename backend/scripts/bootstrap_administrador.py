"""Resetea contraseña de un usuario administrador institucional."""
import os
import sys

import bcrypt
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ADMIN_EMAIL = os.environ.get("WOWED_ADMIN_EMAIL", "admin.demo@wowed.com")
ADMIN_PASSWORD = os.environ.get("WOWED_ADMIN_PASSWORD", "Admin_WowEd2026")


def main() -> None:
    url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
    if not url:
        sys.exit("Falta DATABASE_URL")

    password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id
                FROM users u
                JOIN school_memberships sm ON sm.user_id = u.id
                WHERE lower(u.email) = lower(%s) AND sm.role = 'administrador'
                LIMIT 1
                """,
                (ADMIN_EMAIL,),
            )
            row = cur.fetchone()
            if not row:
                sys.exit(f"No existe administrador con email {ADMIN_EMAIL}")

            cur.execute(
                """
                UPDATE users
                SET password_hash = %s,
                    is_active = true,
                    must_change_password = false
                WHERE id = %s
                """,
                (password_hash, row[0]),
            )
        conn.commit()

    print(f"OK administrador: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


if __name__ == "__main__":
    main()
