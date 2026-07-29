"""Catálogo de roles fijos de plataforma (Super Admin, Administrador, Director, Profesor)."""

from __future__ import annotations

FIXED_PLATFORM_ROLE_CODES: frozenset[str] = frozenset(
    {"superadmin", "administrador", "director", "profesor"}
)

ASSIGNABLE_FIXED_ROLE_CODES: frozenset[str] = frozenset({"administrador", "director", "profesor"})


def resolve_personnel_role_metadata(position_key: str | None) -> tuple[str | None, bool]:
    """Devuelve (role_code, is_system_reserved) para un cargo asignado al personal."""
    if not position_key:
        return None, False

    key = position_key.strip()
    if key == "superadmin":
        return "superadmin", True
    if key.startswith("teacher:"):
        return "profesor", True
    if key in FIXED_PLATFORM_ROLE_CODES:
        return key, True
    return None, False
