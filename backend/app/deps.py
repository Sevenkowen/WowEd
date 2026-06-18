import uuid

from fastapi import HTTPException

from app.config import DEFAULT_INSTITUTION_UUID, settings


def resolve_institution_id(institution_id: str | None) -> uuid.UUID:
    raw = (institution_id or settings.default_institution_id or DEFAULT_INSTITUTION_UUID).strip()
    if not raw:
        raw = DEFAULT_INSTITUTION_UUID
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise HTTPException(400, "institution_id inválido") from exc


def resolve_institution_id_from(
    body_institution_id: str | None = None,
    query_institution_id: str | None = None,
) -> uuid.UUID:
    return resolve_institution_id(body_institution_id or query_institution_id)
