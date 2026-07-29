"""Validación y resolución de cargos del personal (leadership + roles institucionales)."""

from __future__ import annotations

import json
import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.module_permissions import resolve_user_allowed_modules, sanitize_module_keys
from app.services.platform_roles_catalog import resolve_personnel_role_metadata


def try_parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def is_institutional_role_key(position_key: str) -> bool:
    return try_parse_uuid(position_key) is not None


def normalize_role_key(position_key: str | None) -> str | None:
    if not position_key:
        return position_key
    parsed = try_parse_uuid(position_key)
    if parsed:
        return str(parsed)
    return position_key


def _parse_allowed_modules(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return sanitize_module_keys(raw)
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return sanitize_module_keys(parsed if isinstance(parsed, list) else [])
        except json.JSONDecodeError:
            return []
    return sanitize_module_keys(list(raw) if hasattr(raw, "__iter__") else [])


def get_institutional_role(db: Session, institution_id: uuid.UUID, position_key: str):
    role_uuid = try_parse_uuid(position_key)
    if not role_uuid:
        return None
    return db.execute(
        text(
            """
            SELECT id, name, allowed_modules
            FROM institutional_roles
            WHERE id = :role_id AND institution_id = :institution_id
            """
        ),
        {"role_id": role_uuid, "institution_id": institution_id},
    ).mappings().first()


def assert_assignable_position(db: Session, institution_id: uuid.UUID, position_key: str) -> None:
    if is_institutional_role_key(position_key):
        if not get_institutional_role(db, institution_id, position_key):
            raise ValueError("Rol institucional inválido para esta institución")
        return

    row = db.execute(
        text("SELECT 1 FROM leadership_positions WHERE key = :key"),
        {"key": position_key},
    ).first()
    if not row:
        raise ValueError("Cargo inválido")


def resolve_position_label(db: Session, institution_id: uuid.UUID, position_key: str) -> str:
    custom = get_institutional_role(db, institution_id, position_key)
    if custom:
        return custom["name"]
    row = db.execute(
        text("SELECT label FROM leadership_positions WHERE key = :key"),
        {"key": position_key},
    ).first()
    return row[0] if row else position_key


def resolve_role_allowed_modules(
    db: Session,
    institution_id: uuid.UUID,
    role_code: str,
) -> list[str]:
    custom = get_institutional_role(db, institution_id, role_code)
    if custom:
        return _parse_allowed_modules(custom.get("allowed_modules"))
    return resolve_user_allowed_modules(role_code)


def get_platform_role_label(db: Session, code: str, fallback: str) -> str:
    row = db.execute(
        text("SELECT name FROM platform_roles WHERE code = :code"),
        {"code": code},
    ).first()
    return row[0] if row else fallback


def canonical_personnel_role_bucket(
    position_key: str | None,
    *,
    teaching_role: str | None = None,
) -> str | None:
    if teaching_role:
        return "profesor"
    if not position_key:
        return None
    key = normalize_role_key(position_key)
    if not key:
        return None
    if key.startswith("teacher:"):
        return "profesor"
    role_code, is_system = resolve_personnel_role_metadata(key)
    if is_system and role_code:
        return role_code
    return key


def _personnel_row_institution_id(row, institution_scope: uuid.UUID | None) -> str | None:
    if row.get("institution_id"):
        return str(row["institution_id"])
    if institution_scope:
        return str(institution_scope)
    return None


def build_personnel_role_dtos(
    db: Session,
    rows: list,
    *,
    institution_scope: uuid.UUID | None = None,
    admin_only_roles: frozenset[str] | set[str] | None = None,
):
    """Agrupa membresías/cátedras duplicadas en un badge por rol lógico e institución."""
    from app.schemas.superadmin import SuperadminPersonnelRoleDto

    admin_only = frozenset(admin_only_roles or ())
    aggregated: dict[tuple[str, str | None], dict] = {}

    for row in rows:
        institution_id = _personnel_row_institution_id(row, institution_scope)
        position_key = normalize_role_key(row.get("position_key"))
        membership_id = str(row["membership_id"]) if row.get("membership_id") else None

        if position_key:
            bucket = canonical_personnel_role_bucket(position_key)
            if bucket:
                agg_key = (bucket, institution_id)
                entry = aggregated.get(agg_key)
                role_code, is_system = resolve_personnel_role_metadata(position_key)
                label = row.get("position_label") or position_key
                if is_system and role_code and not is_institutional_role_key(position_key):
                    label = get_platform_role_label(db, role_code, label)
                display_key = role_code if is_system and role_code else position_key

                if entry is None:
                    aggregated[agg_key] = {
                        "display_key": display_key,
                        "label": label,
                        "membership_id": membership_id,
                        "institution_id": institution_id,
                        "role_code": role_code,
                        "is_system": is_system,
                        "from_membership": True,
                        "from_teaching": False,
                        "position_key": position_key,
                        "bucket": bucket,
                    }
                else:
                    entry["from_membership"] = True
                    if membership_id and not entry.get("membership_id"):
                        entry["membership_id"] = membership_id
                    if is_system and role_code:
                        entry["display_key"] = role_code
                        entry["role_code"] = role_code
                        entry["is_system"] = True
                        entry["label"] = label

        teaching_role = row.get("teaching_role")
        if teaching_role:
            bucket = "profesor"
            label = get_platform_role_label(db, "profesor", "Profesor")
            agg_key = (bucket, institution_id)
            entry = aggregated.get(agg_key)
            if entry is None:
                aggregated[agg_key] = {
                    "display_key": "profesor",
                    "label": label,
                    "membership_id": None,
                    "institution_id": institution_id,
                    "role_code": "profesor",
                    "is_system": True,
                    "from_membership": False,
                    "from_teaching": True,
                    "position_key": "profesor",
                    "bucket": bucket,
                }
            else:
                entry["from_teaching"] = True
                entry["display_key"] = "profesor"
                entry["role_code"] = "profesor"
                entry["is_system"] = True
                entry["label"] = label
                entry["bucket"] = bucket

    roles: list[SuperadminPersonnelRoleDto] = []
    for entry in aggregated.values():
        position_key = entry["position_key"]
        removable = position_key not in admin_only
        if entry.get("from_teaching"):
            removable = False

        roles.append(
            SuperadminPersonnelRoleDto(
                key=entry["display_key"],
                label=entry["label"],
                membershipId=entry["membership_id"],
                removable=removable,
                institutionId=entry["institution_id"],
                roleCode=entry["role_code"],
                isSystemReserved=bool(entry["is_system"]),
            )
        )

    roles.sort(key=lambda role: (role.label or "", role.key or ""))
    return roles
