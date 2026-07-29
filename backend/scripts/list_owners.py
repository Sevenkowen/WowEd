"""Lista usuarios owner en la DB."""
from sqlalchemy import text

from app.database import SessionLocal

db = SessionLocal()
rows = db.execute(
    text(
        """
        SELECT email, COALESCE(is_active, true) AS is_active, COALESCE(is_owner, false) AS is_owner
        FROM users
        WHERE COALESCE(is_owner, false) = true
        ORDER BY email
        """
    ),
).mappings().all()
for row in rows:
    print(f"{row['email']} | active={row['is_active']} | owner={row['is_owner']}")
db.close()
