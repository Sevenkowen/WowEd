"""Catálogo de módulos y permisos fijos por rol reservado del sistema."""

from __future__ import annotations

# Claves estables — mantener alineadas con frontend/src/data/moduleAccessRegistry.ts
ALL_MODULE_KEYS: frozenset[str] = frozenset(
    {
        # Principal (escuela)
        "dashboard",
        "calendario",
        "objetivos",
        "agenda",
        # Dimensiones
        "dimension_pedagogico",
        "dimension_dta",
        "dimension_socio",
        "dimension_gpe",
        "dimension_pemi",
        "dimension_reflexion",
        # Gestión escolar
        "equipo_directivo",
        "orientacion_escolar",
        "informes",
        "analisis_tiempo",
        # Multigestión
        "multigestion_colaboracion",
        "multigestion_proyectos",
        "multigestion_documental",
        "multigestion_mir",
        "multigestion_personal",
        "multigestion_desarrollo",
        "multigestion_familias",
        "multigestion_cpa",
        "multigestion_esi",
        "multigestion_pulso",
        # Institución (escuela)
        "centro_gestion",
        "estructura_escolar",
        # RBAC plataforma / institución
        "institutions",
        "administradores",
        "personnel",
        "roles",
        "estructura",
    }
)

_SCHOOL_MODULES: list[str] = [
    "dashboard",
    "calendario",
    "objetivos",
    "agenda",
    "dimension_pedagogico",
    "dimension_dta",
    "dimension_socio",
    "dimension_gpe",
    "dimension_pemi",
    "dimension_reflexion",
    "equipo_directivo",
    "orientacion_escolar",
    "informes",
    "analisis_tiempo",
    "multigestion_colaboracion",
    "multigestion_proyectos",
    "multigestion_documental",
    "multigestion_mir",
    "multigestion_personal",
    "multigestion_desarrollo",
    "multigestion_familias",
    "multigestion_cpa",
    "multigestion_esi",
    "multigestion_pulso",
    "centro_gestion",
    "estructura_escolar",
]

_PLATFORM_MODULES: list[str] = [
    "dashboard",
    "institutions",
    "administradores",
    "personnel",
    "roles",
    "estructura",
]

_INSTITUTION_ADMIN_MODULES: list[str] = [
    "dashboard",
    "personnel",
    "roles",
    "estructura",
]

_PROFESOR_MODULES: list[str] = [
    "calendario",
    "objetivos",
    "agenda",
    "equipo_directivo",
]

_REPRESENTANTE_LEGAL_MODULES: list[str] = [
    "dashboard",
    "calendario",
    "objetivos",
    "informes",
    "centro_gestion",
    "estructura_escolar",
]

# Rol reservado → módulos fijos (no editables vía API)
RESERVED_ROLE_MODULES: dict[str, list[str]] = {
    "superadmin": _PLATFORM_MODULES.copy(),
    "owner": _PLATFORM_MODULES.copy(),
    "administrador": _INSTITUTION_ADMIN_MODULES.copy(),
    "director": _SCHOOL_MODULES.copy(),
    "profesor": _PROFESOR_MODULES.copy(),
    "representante_legal": _REPRESENTANTE_LEGAL_MODULES.copy(),
}


def sanitize_module_keys(keys: list[str] | None) -> list[str]:
    if not keys:
        return []
    seen: set[str] = set()
    result: list[str] = []
    for key in keys:
        normalized = key.strip()
        if normalized in ALL_MODULE_KEYS and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def reserved_modules_for_role(role_code: str) -> list[str]:
    return RESERVED_ROLE_MODULES.get(role_code, []).copy()


def resolve_user_allowed_modules(role_code: str, custom_modules: list[str] | None = None) -> list[str]:
    if role_code in RESERVED_ROLE_MODULES:
        return reserved_modules_for_role(role_code)
    if custom_modules:
        return sanitize_module_keys(custom_modules)
    return []
