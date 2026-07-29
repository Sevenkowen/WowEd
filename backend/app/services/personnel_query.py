import math
import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

ADMIN_PERSONNEL_FROM = """
    FROM users u
    LEFT JOIN school_memberships sm ON sm.user_id = u.id
    LEFT JOIN schools s ON s.id = sm.school_id AND s.institution_id = :institution_id
    LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
    LEFT JOIN organizational_units c ON c.id = um.unit_id
    LEFT JOIN institution_programs ip ON ip.id = c.institution_program_id
        AND ip.institution_id = :institution_id
    WHERE COALESCE(u.is_owner, false) = false
      AND (s.id IS NOT NULL OR ip.id IS NOT NULL)
"""

SUPERADMIN_PERSONNEL_FROM = """
    FROM users u
    LEFT JOIN school_memberships sm ON sm.user_id = u.id
    LEFT JOIN schools s ON s.id = sm.school_id
    LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
    WHERE (COALESCE(u.is_owner, false) = true
       OR sm.id IS NOT NULL
       OR um.id IS NOT NULL)
"""


def normalize_search(search: str | None) -> str:
    return (search or "").strip()


def search_pattern(search: str | None) -> str:
    term = normalize_search(search)
    return f"%{term}%" if term else ""


def _search_clause(search: str | None) -> tuple[str, bool]:
    if not normalize_search(search):
        return "", False
    return """
      AND (
        COALESCE(u.email, '') ILIKE :search_pattern
        OR COALESCE(u.personal_email, '') ILIKE :search_pattern
        OR COALESCE(u.username, '') ILIKE :search_pattern
        OR COALESCE(u.full_name, '') ILIKE :search_pattern
        OR COALESCE(u.first_name, '') ILIKE :search_pattern
        OR COALESCE(u.last_name, '') ILIKE :search_pattern
        OR COALESCE(u.dni, '') ILIKE :search_pattern
      )
    """, True


def resolve_page_size(page_size: int | None, limit: int | None, default: int = 20) -> int:
    size = page_size if page_size is not None else limit
    if size is None:
        return default
    return max(1, min(size, 100))


def total_pages(total: int, page_size: int) -> int:
    if total <= 0:
        return 0
    return math.ceil(total / page_size)


def count_admin_personnel_users(
    db: Session,
    institution_id: uuid.UUID,
    search: str | None = None,
) -> int:
    search_sql, has_search = _search_clause(search)
    params: dict = {"institution_id": institution_id}
    if has_search:
        params["search_pattern"] = search_pattern(search)
    row = db.execute(
        text(
            f"""
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT u.id
                {ADMIN_PERSONNEL_FROM}
                {search_sql}
                GROUP BY u.id
            ) personnel
            """
        ),
        params,
    ).mappings().first()
    return int(row["total"] or 0) if row else 0


def paginate_admin_personnel_user_ids(
    db: Session,
    institution_id: uuid.UUID,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
) -> list[uuid.UUID]:
    search_sql, has_search = _search_clause(search)
    params: dict = {
        "institution_id": institution_id,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if has_search:
        params["search_pattern"] = search_pattern(search)
    rows = db.execute(
        text(
            f"""
            SELECT u.id
            {ADMIN_PERSONNEL_FROM}
            {search_sql}
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [row["id"] for row in rows]


def count_superadmin_personnel_users(
    db: Session,
    search: str | None = None,
    institution_id: uuid.UUID | None = None,
) -> int:
    search_sql, has_search = _search_clause(search)
    params: dict = {}
    if has_search:
        params["search_pattern"] = search_pattern(search)

    if institution_id is not None:
        params["institution_id"] = institution_id
        from_clause = """
            FROM users u
            LEFT JOIN school_memberships sm ON sm.user_id = u.id
            LEFT JOIN schools s ON s.id = sm.school_id AND s.institution_id = :institution_id
            LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
            LEFT JOIN organizational_units c ON c.id = um.unit_id
            LEFT JOIN institution_programs ip ON ip.id = c.institution_program_id
                AND ip.institution_id = :institution_id
            WHERE COALESCE(u.is_owner, false) = false
              AND (s.id IS NOT NULL OR ip.id IS NOT NULL)
        """
    else:
        from_clause = SUPERADMIN_PERSONNEL_FROM

    row = db.execute(
        text(
            f"""
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT u.id
                {from_clause}
                {search_sql}
                GROUP BY u.id
            ) personnel
            """
        ),
        params,
    ).mappings().first()
    return int(row["total"] or 0) if row else 0


def paginate_superadmin_personnel_user_ids(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    institution_id: uuid.UUID | None = None,
) -> list[uuid.UUID]:
    search_sql, has_search = _search_clause(search)
    params: dict = {
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if has_search:
        params["search_pattern"] = search_pattern(search)

    if institution_id is not None:
        params["institution_id"] = institution_id
        from_clause = """
            FROM users u
            LEFT JOIN school_memberships sm ON sm.user_id = u.id
            LEFT JOIN schools s ON s.id = sm.school_id AND s.institution_id = :institution_id
            LEFT JOIN unit_memberships um ON um.user_id = u.id AND um.teaching_role IS NOT NULL
            LEFT JOIN organizational_units c ON c.id = um.unit_id
            LEFT JOIN institution_programs ip ON ip.id = c.institution_program_id
                AND ip.institution_id = :institution_id
            WHERE COALESCE(u.is_owner, false) = false
              AND (s.id IS NOT NULL OR ip.id IS NOT NULL)
        """
    else:
        from_clause = SUPERADMIN_PERSONNEL_FROM

    rows = db.execute(
        text(
            f"""
            SELECT u.id
            {from_clause}
            {search_sql}
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST, u.email
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [row["id"] for row in rows]


ADMINISTRADORES_FROM = """
    FROM school_memberships sm
    JOIN users u ON u.id = sm.user_id
    JOIN schools s ON s.id = sm.school_id
    JOIN institutions i ON i.id = s.institution_id
    WHERE sm.role = 'administrador'
"""


def _administradores_search_clause(search: str | None) -> tuple[str, bool]:
    if not normalize_search(search):
        return "", False
    return """
      AND (
        COALESCE(u.email, '') ILIKE :search_pattern
        OR COALESCE(u.personal_email, '') ILIKE :search_pattern
        OR COALESCE(u.username, '') ILIKE :search_pattern
        OR COALESCE(u.full_name, '') ILIKE :search_pattern
        OR COALESCE(u.first_name, '') ILIKE :search_pattern
        OR COALESCE(u.last_name, '') ILIKE :search_pattern
        OR COALESCE(u.dni, '') ILIKE :search_pattern
        OR COALESCE(i.name, '') ILIKE :search_pattern
      )
    """, True


ADMINISTRADORES_UNIFIED_SUBQUERY = """
    SELECT
      'assigned'::text AS entry_kind,
      sm.id::text AS entry_id,
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.username,
      u.full_name,
      u.address,
      u.phone,
      u.dni,
      u.cuil,
      u.personal_email,
      sm.role AS position_key,
      lp.label AS position_label,
      s.id AS school_id,
      s.name AS school_name,
      i.id AS institution_id,
      i.name AS institution_name,
      false AS is_unassigned
    FROM school_memberships sm
    JOIN users u ON u.id = sm.user_id
    JOIN schools s ON s.id = sm.school_id
    JOIN institutions i ON i.id = s.institution_id
    JOIN leadership_positions lp ON lp.key = sm.role
    WHERE sm.role = 'administrador'

    UNION ALL

    SELECT
      'pool'::text AS entry_kind,
      u.id::text AS entry_id,
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.username,
      u.full_name,
      u.address,
      u.phone,
      u.dni,
      u.cuil,
      u.personal_email,
      'administrador'::text AS position_key,
      'Administrador'::text AS position_label,
      NULL::uuid AS school_id,
      NULL::text AS school_name,
      NULL::uuid AS institution_id,
      NULL::text AS institution_name,
      true AS is_unassigned
    FROM users u
    WHERE COALESCE(u.pending_administrador, false) = true
      AND COALESCE(u.is_owner, false) = false
      AND COALESCE(u.is_active, true) = true
      AND NOT EXISTS (
        SELECT 1
        FROM school_memberships sm2
        WHERE sm2.user_id = u.id AND sm2.role = 'administrador'
      )
"""


def _administradores_unified_search_clause(search: str | None) -> tuple[str, bool]:
    if not normalize_search(search):
        return "", False
    return """
      AND (
        COALESCE(email, '') ILIKE :search_pattern
        OR COALESCE(personal_email, '') ILIKE :search_pattern
        OR COALESCE(username, '') ILIKE :search_pattern
        OR COALESCE(full_name, '') ILIKE :search_pattern
        OR COALESCE(first_name, '') ILIKE :search_pattern
        OR COALESCE(last_name, '') ILIKE :search_pattern
        OR COALESCE(dni, '') ILIKE :search_pattern
        OR COALESCE(institution_name, '') ILIKE :search_pattern
      )
    """, True


def count_superadmin_administrators(
    db: Session,
    search: str | None = None,
    institution_id: uuid.UUID | None = None,
) -> int:
    del institution_id
    search_sql, has_search = _administradores_unified_search_clause(search)
    params: dict = {}
    if has_search:
        params["search_pattern"] = search_pattern(search)
    row = db.execute(
        text(
            f"""
            SELECT COUNT(*)::int AS total
            FROM (
              {ADMINISTRADORES_UNIFIED_SUBQUERY}
            ) administrators
            WHERE 1=1
            {search_sql}
            """
        ),
        params,
    ).mappings().first()
    return row["total"] if row else 0


def paginate_superadmin_administrator_entries(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    institution_id: uuid.UUID | None = None,
) -> list[dict[str, str]]:
    del institution_id
    search_sql, has_search = _administradores_unified_search_clause(search)
    params: dict = {
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if has_search:
        params["search_pattern"] = search_pattern(search)
    rows = db.execute(
        text(
            f"""
            SELECT entry_kind, entry_id
            FROM (
              {ADMINISTRADORES_UNIFIED_SUBQUERY}
            ) administrators
            WHERE 1=1
            {search_sql}
            ORDER BY is_unassigned DESC,
                     institution_name NULLS LAST,
                     full_name NULLS LAST,
                     first_name NULLS LAST,
                     last_name NULLS LAST,
                     email
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [{"entry_kind": row["entry_kind"], "entry_id": row["entry_id"]} for row in rows]


def fetch_superadmin_administrator_rows(db: Session, entries: list[dict[str, str]]):
    if not entries:
        return []
    assigned_ids = [entry["entry_id"] for entry in entries if entry["entry_kind"] == "assigned"]
    pool_ids = [entry["entry_id"] for entry in entries if entry["entry_kind"] == "pool"]
    rows_by_key: dict[str, object] = {}

    if assigned_ids:
        assigned_rows = db.execute(
            text(
                f"""
                SELECT 'assigned'::text AS entry_kind,
                       sm.id::text AS entry_id,
                       u.id AS user_id,
                       sm.id AS membership_id,
                       u.email,
                       u.first_name,
                       u.last_name,
                       u.username,
                       u.full_name,
                       u.address,
                       u.phone,
                       u.dni,
                       u.cuil,
                       u.personal_email,
                       sm.role AS position_key,
                       lp.label AS position_label,
                       s.id AS school_id,
                       s.name AS school_name,
                       i.id AS institution_id,
                       i.name AS institution_name,
                       false AS is_unassigned
                FROM school_memberships sm
                JOIN users u ON u.id = sm.user_id
                JOIN schools s ON s.id = sm.school_id
                JOIN institutions i ON i.id = s.institution_id
                JOIN leadership_positions lp ON lp.key = sm.role
                WHERE sm.id::text = ANY(:entry_ids)
                """
            ),
            {"entry_ids": assigned_ids},
        ).mappings().all()
        for row in assigned_rows:
            rows_by_key[f"assigned:{row['entry_id']}"] = row

    if pool_ids:
        pool_rows = db.execute(
            text(
                """
                SELECT 'pool'::text AS entry_kind,
                       u.id::text AS entry_id,
                       u.id AS user_id,
                       NULL::uuid AS membership_id,
                       u.email,
                       u.first_name,
                       u.last_name,
                       u.username,
                       u.full_name,
                       u.address,
                       u.phone,
                       u.dni,
                       u.cuil,
                       u.personal_email,
                       'administrador'::text AS position_key,
                       'Administrador'::text AS position_label,
                       NULL::uuid AS school_id,
                       NULL::text AS school_name,
                       NULL::uuid AS institution_id,
                       NULL::text AS institution_name,
                       true AS is_unassigned
                FROM users u
                WHERE u.id::text = ANY(:entry_ids)
                """
            ),
            {"entry_ids": pool_ids},
        ).mappings().all()
        for row in pool_rows:
            rows_by_key[f"pool:{row['entry_id']}"] = row

    ordered: list = []
    for entry in entries:
        key = f"{entry['entry_kind']}:{entry['entry_id']}"
        if key in rows_by_key:
            ordered.append(rows_by_key[key])
    return ordered
