from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.personnel_query import normalize_search, resolve_page_size, search_pattern, total_pages

_INSTITUTION_FROM = """
    FROM institutions i
    WHERE 1=1
"""


def _search_clause(search: str | None) -> tuple[str, bool]:
    if not normalize_search(search):
        return "", False
    return """
      AND (
        COALESCE(i.name, '') ILIKE :search_pattern
        OR COALESCE(i.cuit, '') ILIKE :search_pattern
        OR COALESCE(i.contact_email, '') ILIKE :search_pattern
      )
    """, True


def count_institutions(db: Session, search: str | None = None) -> int:
    search_sql, has_search = _search_clause(search)
    params: dict = {}
    if has_search:
        params["search_pattern"] = search_pattern(search)
    row = db.execute(
        text(
            f"""
            SELECT COUNT(*)::int AS total
            {_INSTITUTION_FROM}
            {search_sql}
            """
        ),
        params,
    ).mappings().first()
    return int(row["total"] or 0) if row else 0


def paginate_institution_ids(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
) -> list:
    search_sql, has_search = _search_clause(search)
    params: dict = {
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if has_search:
        params["search_pattern"] = search_pattern(search)
    rows = db.execute(
        text(
            f"""
            SELECT i.id
            {_INSTITUTION_FROM}
            {search_sql}
            ORDER BY i.name NULLS LAST, i.created_at NULLS LAST
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [row["id"] for row in rows]


__all__ = [
    "count_institutions",
    "paginate_institution_ids",
    "resolve_page_size",
    "total_pages",
]
