"""Lista administradores (school_memberships.role = administrador) en la DB."""
from sqlalchemy import text

from app.database import SessionLocal

db = SessionLocal()
rows = db.execute(
    text(
        """
        SELECT u.email, u.username, u.personal_email,
               COALESCE(u.is_active, true) AS is_active,
               s.name AS school_name, i.name AS institution_name
        FROM school_memberships sm
        JOIN users u ON u.id = sm.user_id
        JOIN schools s ON s.id = sm.school_id
        JOIN institutions i ON i.id = s.institution_id
        WHERE sm.role = 'administrador'
        ORDER BY i.name, u.email
        """
    ),
).mappings().all()
if not rows:
    print("Sin administradores")
else:
    for row in rows:
        print(
            f"{row['email']} | active={row['is_active']} | "
            f"{row['institution_name']} / {row['school_name']}"
        )
db.close()
