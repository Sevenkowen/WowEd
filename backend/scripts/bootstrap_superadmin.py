"""Crea o actualiza el usuario superadmin de la plataforma."""
import os
import sys
import uuid

import bcrypt
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPERADMIN_EMAIL = os.environ.get("WOWED_SUPERADMIN_EMAIL", "superadmin@wowed.com")
SUPERADMIN_PASSWORD = os.environ.get("WOWED_SUPERADMIN_PASSWORD", "WowEd_Super2026")
SUPERADMIN_FIRST_NAME = "Super"
SUPERADMIN_LAST_NAME = "Admin"


def main() -> None:
    url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
    if not url:
        sys.exit("Falta DATABASE_URL")

    password_hash = bcrypt.hashpw(SUPERADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE lower(email) = lower(%s)", (SUPERADMIN_EMAIL,))
            row = cur.fetchone()
            if row:
                user_id = row[0]
                cur.execute(
                    """
                    UPDATE users
                    SET password_hash = %s, first_name = %s, last_name = %s, is_owner = true
                    WHERE id = %s
                    """,
                    (password_hash, SUPERADMIN_FIRST_NAME, SUPERADMIN_LAST_NAME, user_id),
                )
            else:
                user_id = uuid.uuid4()
                cur.execute(
                    """
                    INSERT INTO users (id, email, first_name, last_name, password_hash, is_owner)
                    VALUES (%s, %s, %s, %s, %s, true)
                    """,
                    (user_id, SUPERADMIN_EMAIL, SUPERADMIN_FIRST_NAME, SUPERADMIN_LAST_NAME, password_hash),
                )
            # Migrar usuario owner legacy al nuevo email si existe
            cur.execute(
                """
                UPDATE users SET is_owner = false
                WHERE lower(email) = 'owner@wowed.com' AND lower(email) <> lower(%s)
                """,
                (SUPERADMIN_EMAIL,),
            )
        conn.commit()

    print(f"OK superadmin: {SUPERADMIN_EMAIL} / {SUPERADMIN_PASSWORD}")


if __name__ == "__main__":
    main()
