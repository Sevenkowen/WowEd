import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { ROUTE_TO_MODULE_KEY } from '@/data/moduleAccessRegistry'

export function useModuleAccess() {
  const { user } = useAuth()

  const allowedModules = computed(() => user.value?.allowedModules)

  /** Sin lista en sesión (legacy) → acceso completo hasta re-login */
  const hasUnrestrictedAccess = computed(() => allowedModules.value === undefined)

  function hasModule(moduleKey: string): boolean {
    if (hasUnrestrictedAccess.value) return true
    return (allowedModules.value ?? []).includes(moduleKey)
  }

  function filterLinksByModule<T extends { to: string }>(links: T[]): T[] {
    if (hasUnrestrictedAccess.value) return links
    return links.filter((link) => {
      const key = ROUTE_TO_MODULE_KEY[link.to]
      return !key || hasModule(key)
    })
  }

  return {
    allowedModules,
    hasUnrestrictedAccess,
    hasModule,
    filterLinksByModule,
  }
}
