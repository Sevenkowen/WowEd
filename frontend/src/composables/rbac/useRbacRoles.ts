import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { SuperadminRole } from '@/api/superadminApi'
import type { RbacRolesModuleConfig } from '@/types/rbac'
import type { ModuleScopeKind } from '@/data/moduleAccessRegistry'

function normalizeInstitutionId(institutionId: string | null | undefined): string {
  return institutionId?.trim().toLowerCase() ?? ''
}

export function useRbacRoles(configSource: MaybeRefOrGetter<RbacRolesModuleConfig>) {
  const config = computed(() => toValue(configSource))
  const error = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const roles = ref<SuperadminRole[]>([])
  const institutions = ref<{ id: string; name: string }[]>([])
  const selectedInstitutionId = ref('')
  const showCreateModal = ref(false)
  const showModulesModal = ref(false)
  const viewingRole = ref<SuperadminRole | null>(null)
  const editingRole = ref<SuperadminRole | null>(null)
  const customRoleSearchQuery = ref('')

  const moduleScopeFilter = computed((): ModuleScopeKind[] => {
    if (config.value.scope === 'platform') return ['platform', 'school', 'institution']
    return ['school', 'institution']
  })

  const roleForm = ref({
    name: '',
    description: '',
    allowedModules: [] as string[],
  })

  const systemRoles = computed(() => roles.value.filter((role) => role.scopeType === 'system'))

  const filteredCustomRoles = computed(() => {
    const custom = roles.value.filter((role) => role.scopeType === 'institution')
    if (!config.value.showInstitutionPicker) return custom

    const scopeId = normalizeInstitutionId(selectedInstitutionId.value)
    if (!scopeId) return []
    return custom.filter(
      (role) => normalizeInstitutionId(role.institutionId) === scopeId,
    )
  })

  const visibleCustomRoles = computed(() => {
    const query = customRoleSearchQuery.value.trim().toLowerCase()
    if (!query) return filteredCustomRoles.value

    return filteredCustomRoles.value.filter((role) => {
      const haystack = [role.name, role.description, role.scopeLabel].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  })

  const totalRoles = computed(() => systemRoles.value.length + filteredCustomRoles.value.length)

  const selectedInstitutionName = computed(
    () => institutions.value.find((inst) => inst.id === selectedInstitutionId.value)?.name ?? '',
  )

  const canCreateRole = computed(
    () => !config.value.showInstitutionPicker || Boolean(normalizeInstitutionId(selectedInstitutionId.value)),
  )

  async function loadRoles() {
    loading.value = true
    error.value = null
    try {
      roles.value = await config.value.api.fetchRoles()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudieron cargar los roles'
    } finally {
      loading.value = false
    }
  }

  function resetForm() {
    roleForm.value = {
      name: '',
      description: '',
      allowedModules: [],
    }
  }

  function openCreateModal() {
    if (!canCreateRole.value) {
      error.value = 'Seleccioná una institución para crear un rol personalizado'
      return
    }
    resetForm()
    editingRole.value = null
    showCreateModal.value = true
  }

  function openEditModal(role: SuperadminRole) {
    editingRole.value = role
    roleForm.value = {
      name: role.name,
      description: role.description.replace(/^Rol institucional:\s*/i, ''),
      allowedModules: [...(role.allowedModules ?? [])],
    }
    showCreateModal.value = true
  }

  function openModulesModal(role: SuperadminRole) {
    viewingRole.value = role
    showModulesModal.value = true
  }

  function closeModal() {
    showCreateModal.value = false
    editingRole.value = null
  }

  function closeModulesModal() {
    showModulesModal.value = false
    viewingRole.value = null
  }

  async function submitRole() {
    saving.value = true
    error.value = null
    try {
      const payload = {
        name: roleForm.value.name.trim(),
        description: roleForm.value.description.trim() || undefined,
        allowedModules: roleForm.value.allowedModules,
      }

      if (editingRole.value) {
        await config.value.api.updateRole(editingRole.value.id, payload)
      } else {
        const institutionId = config.value.showInstitutionPicker
          ? selectedInstitutionId.value
          : config.value.getDefaultInstitutionId?.()

        if (config.value.showInstitutionPicker && !normalizeInstitutionId(institutionId)) {
          error.value = 'Seleccioná una institución'
          return
        }

        await config.value.api.createRole({
          ...payload,
          institutionId: institutionId || undefined,
        })
      }

      closeModal()
      await loadRoles()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo guardar el rol'
    } finally {
      saving.value = false
    }
  }

  async function removeRole(role: SuperadminRole) {
    if (!confirm(`¿Eliminar el rol "${role.name}" de ${role.scopeLabel}?`)) return
    error.value = null
    try {
      await config.value.api.deleteRole(role.id)
      await loadRoles()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo eliminar el rol'
    }
  }

  async function bootstrap() {
    if (config.value.getInstitutions) {
      institutions.value = await config.value.getInstitutions()
    }
    selectedInstitutionId.value =
      config.value.getDefaultInstitutionId?.() ?? institutions.value[0]?.id ?? ''
    await loadRoles()
  }

  watch(selectedInstitutionId, (institutionId) => {
    if (!config.value.showInstitutionPicker || !institutionId) return
    config.value.onInstitutionChange?.(institutionId)
    customRoleSearchQuery.value = ''
  })

  onMounted(() => {
    void bootstrap()
  })

  return {
    config,
    error,
    loading,
    saving,
    roles,
    institutions,
    selectedInstitutionId,
    selectedInstitutionName,
    canCreateRole,
    showCreateModal,
    showModulesModal,
    viewingRole,
    editingRole,
    roleForm,
    moduleScopeFilter,
    totalRoles,
    systemRoles,
    customRoles: filteredCustomRoles,
    visibleCustomRoles,
    customRoleSearchQuery,
    openCreateModal,
    openEditModal,
    openModulesModal,
    closeModal,
    closeModulesModal,
    submitRole,
    removeRole,
  }
}
