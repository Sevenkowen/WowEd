"""Crea o actualiza el usuario owner de la plataforma."""
import os
import sys
import uuid

import bcrypt
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

OWNER_EMAIL = os.environ.get("WOWED_OWNER_EMAIL", "owner@wowed.com")
OWNER_PASSWORD = os.environ.get("WOWED_OWNER_PASSWORD", "WowEd_Owner2026")
OWNER_FIRST_NAME = "Owner"
OWNER_LAST_NAME = "WowEd"


def main() -> None:
    url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
    if not url:
        sys.exit("Falta DATABASE_URL")

    password_hash = bcrypt.hashpw(OWNER_PASSWORD.encode(), bcrypt.gensalt()).decode()

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (OWNER_EMAIL,))
            row = cur.fetchone()
            if row:
                user_id = row[0]
                cur.execute(
                    """
                    UPDATE users
                    SET password_hash = %s, first_name = %s, last_name = %s, is_owner = true
                    WHERE id = %s
                    """,
                    (password_hash, OWNER_FIRST_NAME, OWNER_LAST_NAME, user_id),
                )
            else:
                user_id = uuid.uuid4()
                cur.execute(
                    """
                    INSERT INTO users (id, email, first_name, last_name, password_hash, is_owner)
                    VALUES (%s, %s, %s, %s, %s, true)
                    """,
                    (user_id, OWNER_EMAIL, OWNER_FIRST_NAME, OWNER_LAST_NAME, password_hash),
                )
        conn.commit()

    print(f"OK owner: {OWNER_EMAIL} / {OWNER_PASSWORD}")


if __name__ == "__main__":
    main()
