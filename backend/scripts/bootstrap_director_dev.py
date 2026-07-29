"""Prepara usuario director de desarrollo: contraseña + escuela en institución por defecto."""
import os
import sys
import uuid

import bcrypt
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DEFAULT_INSTITUTION = "00000000-0000-0000-0000-000000000001"
DEV_EMAIL = os.environ.get("DEV_DIRECTOR_EMAIL", "tito@wow.com")
DEV_PASSWORD = os.environ.get("DEV_DIRECTOR_PASSWORD", "director123")
DEV_SCHOOL_NAME = "Colegio WowEd Dev"


def main() -> None:
    url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
    if not url:
        sys.exit("Falta DATABASE_URL")

    password_hash = bcrypt.hashpw(DEV_PASSWORD.encode(), bcrypt.gensalt()).decode()

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (DEV_EMAIL,))
            row = cur.fetchone()
            if not row:
                sys.exit(f"No existe el usuario {DEV_EMAIL}")
            user_id = row[0]

            cur.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (password_hash, user_id),
            )

            cur.execute(
                "SELECT id FROM schools WHERE institution_id = %s AND name = %s",
                (DEFAULT_INSTITUTION, DEV_SCHOOL_NAME),
            )
            school_row = cur.fetchone()
            if school_row:
                school_id = school_row[0]
            else:
                school_id = uuid.uuid4()
                cur.execute(
                    "INSERT INTO schools (id, institution_id, name) VALUES (%s, %s, %s)",
                    (school_id, DEFAULT_INSTITUTION, DEV_SCHOOL_NAME),
                )

            cur.execute(
                """
                SELECT id FROM school_memberships
                WHERE user_id = %s AND school_id = %s AND role = 'director'
                """,
                (user_id, school_id),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO school_memberships (id, user_id, school_id, role)
                    VALUES (%s, %s, %s, 'director')
                    """,
                    (uuid.uuid4(), user_id, school_id),
                )

        conn.commit()

    print(f"OK: {DEV_EMAIL} / {DEV_PASSWORD}")
    print(f"Escuela dev en institución {DEFAULT_INSTITUTION}: {DEV_SCHOOL_NAME}")


if __name__ == "__main__":
    main()
