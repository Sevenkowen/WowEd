import type { RbacModuleDefinition, RbacScopeKind } from '@/types/rbac'
import { MODULE_ACCESS_REGISTRY, type ModuleScopeKind } from '@/data/moduleAccessRegistry'

/**
 * Subconjunto RBAC del catálogo global — menús admin/superadmin.
 * @see moduleAccessRegistry.ts para el catálogo completo.
 */
const RBAC_KEYS = ['dashboard', 'institutions', 'administradores', 'personnel', 'roles', 'estructura'] as const

const INSTITUTION_ROUTES: Record<string, string> = {
  dashboard: '/admin/dashboard',
  personnel: '/admin/usuarios',
  roles: '/admin/roles',
  estructura: '/admin/estructura/colegios',
}

const PLATFORM_ROUTES: Record<string, string> = {
  dashboard: '/superadmin/dashboard',
  institutions: '/superadmin/instituciones',
  administradores: '/superadmin/administradores',
  personnel: '/superadmin/usuarios',
  roles: '/superadmin/roles',
  estructura: '/superadmin/estructura/colegios',
}

function toRbacScope(scope: ModuleScopeKind): RbacScopeKind | null {
  if (scope === 'platform' || scope === 'institution') return scope
  return null
}

export const RBAC_MODULE_REGISTRY: RbacModuleDefinition[] = RBAC_KEYS.map((key) => {
  const mod = MODULE_ACCESS_REGISTRY.find((m) => m.key === key)!
  const scopes = mod.scopes.map(toRbacScope).filter((s): s is RbacScopeKind => s !== null)
  const routes: Partial<Record<RbacScopeKind, string>> = {}
  if (scopes.includes('platform')) routes.platform = PLATFORM_ROUTES[key]
  if (scopes.includes('institution')) routes.institution = INSTITUTION_ROUTES[key]
  return {
    key: key as RbacModuleDefinition['key'],
    label: mod.label,
    scopes,
    routes,
    defaultPlatformRoles:
      key === 'institutions' || key === 'administradores'
        ? ['superadmin', 'owner']
        : ['superadmin', 'owner', 'administrador'],
  }
})

export function rbacModulesForScope(scope: RbacScopeKind): RbacModuleDefinition[] {
  return RBAC_MODULE_REGISTRY.filter((module) => module.scopes.includes(scope))
}

export function rbacModuleRoute(
  key: RbacModuleDefinition['key'],
  scope: RbacScopeKind,
): string | undefined {
  return RBAC_MODULE_REGISTRY.find((m) => m.key === key)?.routes[scope]
}
