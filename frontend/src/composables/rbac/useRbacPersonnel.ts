import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { BulkPersonnelImportRow, SuperadminPersonnel, SuperadminRole } from '@/api/superadminApi'
import {
  fixedPlatformRoleLabel,
  PERSONNEL_PICKER_FIXED_ROLE_CODES,
  uniquePersonnelRolesForDisplay,
  type FixedPlatformRoleCode,
} from '@/data/fixedPlatformRoles'
import type { RbacPersonnelModuleConfig } from '@/types/rbac'
import { emptyUserProfile, normalizeProfileForApi, profileFromMember, type UserProfile } from '@/types/userProfile'

interface PersonnelPositionOption {
  key: string
  label: string
  sortOrder: number
  disabled?: boolean
}

const UUID_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeRoleKey(key: string): string {
  return UUID_KEY_PATTERN.test(key) ? key.toLowerCase() : key
}

function normalizeInstitutionId(institutionId: string | null | undefined): string {
  return institutionId?.trim().toLowerCase() ?? ''
}

function rolesBelongToInstitution(
  roleInstitutionId: string | null | undefined,
  institutionId: string | null | undefined,
): boolean {
  const normalizedRoleInstitutionId = normalizeInstitutionId(roleInstitutionId)
  const normalizedInstitutionId = normalizeInstitutionId(institutionId)
  if (!normalizedRoleInstitutionId || !normalizedInstitutionId) return false
  return normalizedRoleInstitutionId === normalizedInstitutionId
}

function assignedRoleKeyForPicker(role: SuperadminPersonnel['roles'][number]): string {
  const normalizedKey = normalizeRoleKey(role.key)
  if (UUID_KEY_PATTERN.test(normalizedKey)) {
    return normalizedKey
  }
  if (role.roleCode && role.roleCode !== 'superadmin') {
    return role.roleCode
  }
  return normalizedKey
}

function isLockedPersonnelRoleKey(key: string): boolean {
  return key.startsWith('teacher:') || key === 'superadmin' || key === 'administrador'
}

export function useRbacPersonnel(configSource: MaybeRefOrGetter<RbacPersonnelModuleConfig>) {
  const config = computed(() => toValue(configSource))
  const error = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const deletingUserId = ref<string | null>(null)
  const showCreateModal = ref(false)
  const showBulkImportModal = ref(false)
  const editingPerson = ref<SuperadminPersonnel | null>(null)
  const personnel = ref<SuperadminPersonnel[]>([])
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const searchQuery = ref('')
  const debouncedSearch = ref('')
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const positions = ref<SuperadminRole[]>([])
  const institutionalRoles = ref<SuperadminRole[]>([])
  const schools = ref<{ id: string; name: string }[]>([])
  const institutions = ref<{ id: string; name: string }[]>([])
  const selectedInstitutionId = ref('')

  const createForm = ref({
    institutionId: '',
    schoolId: '',
    roleKeys: [config.value.defaultCreateRole] as string[],
    password: '',
    profile: emptyUserProfile(),
  })

  const editForm = ref({
    institutionId: '',
    schoolId: '',
    roleKeys: [] as string[],
    profile: emptyUserProfile() as UserProfile,
    isActive: true,
    mustChangePassword: false,
    password: '',
  })
  const editingOriginalUsername = ref('')
  const deleteConfirmOpen = ref(false)
  const personToDelete = ref<SuperadminPersonnel | null>(null)
  const deleteError = ref<string | null>(null)
  const createFormKey = ref(0)
  const editFormKey = ref(0)

  const totalPersonnel = ref(0)

  const paginationLabel = computed(() => {
    if (loading.value) return '…'
    if (totalPersonnel.value === 0) return '0 resultados'
    const start = (page.value - 1) * pageSize.value + 1
    const end = Math.min(page.value * pageSize.value, totalPersonnel.value)
    return `Mostrando ${start}-${end} de ${totalPersonnel.value}`
  })

  const rowOffset = computed(() => (page.value - 1) * pageSize.value)

  const visiblePages = computed(() => {
    if (totalPages.value <= 1) return [] as number[]
    const maxButtons = 5
    let start = Math.max(1, page.value - Math.floor(maxButtons / 2))
    const end = Math.min(totalPages.value, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  })

  const canCreatePersonnel = computed(
    () => !config.value.showInstitutionPicker || Boolean(normalizeInstitutionId(selectedInstitutionId.value)),
  )

  function personnelRolesForDisplay(person: SuperadminPersonnel) {
    const roles = config.value.showInstitutionPicker
      ? personRolesForInstitution(person, selectedInstitutionId.value)
      : person.roles
    return uniquePersonnelRolesForDisplay(roles)
  }

  function resolveCreateInstitutionId(): string {
    if (config.value.showInstitutionPicker && normalizeInstitutionId(selectedInstitutionId.value)) {
      return selectedInstitutionId.value
    }
    return (
      createForm.value.institutionId ||
      config.value.getDefaultInstitutionId?.() ||
      institutions.value[0]?.id ||
      ''
    )
  }

  function resolveInstitutionId(mode: 'create' | 'edit'): string {
    if (config.value.showInstitutionPicker) {
      if (mode === 'edit') {
        return (
          selectedInstitutionId.value ||
          editForm.value.institutionId ||
          config.value.getDefaultInstitutionId?.() ||
          ''
        )
      }
      return resolveCreateInstitutionId()
    }
    if (mode === 'edit' && editForm.value.institutionId) {
      return editForm.value.institutionId
    }
    return config.value.getDefaultInstitutionId?.() ?? ''
  }

  function resolveEditInstitutionId(person: SuperadminPersonnel): string {
    if (config.value.showInstitutionPicker && normalizeInstitutionId(selectedInstitutionId.value)) {
      return selectedInstitutionId.value
    }
    return (
      person.institutionId ??
      config.value.getDefaultInstitutionId?.() ??
      institutions.value[0]?.id ??
      ''
    )
  }

  function customRolesForInstitution(institutionId: string): SuperadminRole[] {
    const scopeId = normalizeInstitutionId(institutionId)
    if (!scopeId) return []
    return institutionalRoles.value.filter(
      (role) => normalizeInstitutionId(role.institutionId) === scopeId,
    )
  }

  function buildPositionOptions(institutionId: string): PersonnelPositionOption[] {
    const blocked = new Set(config.value.blockedCreateRoles)
    const platformNameByCode = new Map(
      positions.value.flatMap((role) =>
        role.roleCode ? [[role.roleCode, role.name] as const] : [],
      ),
    )

    const system = (PERSONNEL_PICKER_FIXED_ROLE_CODES as readonly FixedPlatformRoleCode[])
      .filter((code) => !blocked.has(code))
      .map((code, index) => ({
        key: code,
        label: fixedPlatformRoleLabel(code, platformNameByCode.get(code)),
        sortOrder: index,
        disabled: code === 'superadmin',
      }))

    const custom = customRolesForInstitution(institutionId).map((role, index) => ({
      key: normalizeRoleKey(role.id),
      label: role.name,
      sortOrder: 500 + index,
    }))

    return [...system, ...custom].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, 'es'),
    )
  }

  const creatablePositions = computed(() => {
    const options = buildPositionOptions(resolveInstitutionId('create')).filter(
      (option) => !option.disabled,
    )
    if (options.length) return options
    return [{ key: config.value.defaultCreateRole, label: config.value.defaultCreateRole, sortOrder: 0 }]
  })

  const createRoleOptions = computed(() =>
    buildPositionOptions(resolveInstitutionId('create')).map((option) => ({
      key: option.key,
      label: option.label,
      disabled: Boolean(option.disabled) || isLockedPersonnelRoleKey(option.key),
    })),
  )

  const createRoleKeysModel = computed({
    get: () => createForm.value.roleKeys.filter((key) => !isLockedPersonnelRoleKey(key)),
    set: (keys: string[]) => {
      const nextKeys = [
        ...new Set(keys.map(normalizeRoleKey).filter((key) => !isLockedPersonnelRoleKey(key))),
      ]
      if (nextKeys.length < 1) {
        error.value = 'Seleccioná al menos un rol'
        return
      }
      createForm.value.roleKeys = nextKeys
    },
  })

  const editablePositions = computed(() => buildPositionOptions(resolveInstitutionId('edit')))

  function personRolesForInstitution(
    person: SuperadminPersonnel,
    institutionId?: string,
  ): SuperadminPersonnel['roles'] {
    const scopeId = institutionId ?? resolveInstitutionId('edit')
    if (!normalizeInstitutionId(scopeId)) return person.roles
    return person.roles.filter((role) => rolesBelongToInstitution(role.institutionId, scopeId))
  }

  function buildEditRoleOptions(): PersonnelPositionOption[] {
    const institutionId = resolveInstitutionId('edit')
    const base = buildPositionOptions(institutionId)
    const options = new Map(base.map((option) => [option.key, option]))

    if (editingPerson.value) {
      for (const role of personRolesForInstitution(editingPerson.value, institutionId)) {
        const key = assignedRoleKeyForPicker(role)
        if (isLockedPersonnelRoleKey(key)) continue
        if (options.has(key)) continue
        options.set(key, {
          key,
          label: role.label,
          sortOrder: 800,
        })
      }
    }

    return [...options.values()].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, 'es'),
    )
  }

  const editRoleOptions = computed(() => {
    return buildEditRoleOptions().map((option) => ({
      ...option,
      disabled: Boolean(option.disabled) || isLockedPersonnelRoleKey(option.key),
    }))
  })

  function isEditablePersonnelRole(role: SuperadminPersonnel['roles'][number]): boolean {
    const key = normalizeRoleKey(role.key)
    if (isLockedPersonnelRoleKey(key)) return false
    if (config.value.blockedCreateRoles.includes(key)) return false
    return role.removable !== false
  }

  function readOnlyRoleTitle(role: SuperadminPersonnel['roles'][number]): string {
    if (role.roleCode === 'profesor' && role.removable === false) {
      return 'Este rol está asignado por cátedra. Para quitarlo, editá la asignación en Colegios y Materias.'
    }
    return 'Este rol no se puede quitar desde aquí'
  }

  function preservedNonEditableRoleKeys(): string[] {
    if (!editingPerson.value) return []
    return personRolesForInstitution(editingPerson.value, resolveInstitutionId('edit'))
      .filter((role) => !isEditablePersonnelRole(role))
      .map((role) => assignedRoleKeyForPicker(role))
  }

  function roleKeysForEditModal(person: SuperadminPersonnel, institutionId?: string): string[] {
    const keys = personRolesForInstitution(person, institutionId)
      .filter((role) => isEditablePersonnelRole(role))
      .map((role) => assignedRoleKeyForPicker(role))
    return [...new Set(keys)]
  }

  function editableRoleKeysForSubmit(keys: string[]): string[] {
    return keys.filter((key) => !isLockedPersonnelRoleKey(key))
  }

  const editReadOnlyRoles = computed(() => {
    if (!editingPerson.value) return []
    return personRolesForInstitution(editingPerson.value, resolveInstitutionId('edit')).filter(
      (role) => !isEditablePersonnelRole(role),
    )
  })

  function preservedReadOnlyRoleKeys(): string[] {
    return editForm.value.roleKeys.filter((key) => isLockedPersonnelRoleKey(key))
  }

  const editRoleKeysModel = computed({
    get: () =>
      editForm.value.roleKeys.filter((key) => !isLockedPersonnelRoleKey(key)),
    set: (keys: string[]) => {
      const lockedKeys = editForm.value.roleKeys.filter((key) => isLockedPersonnelRoleKey(key))
      const nextKeys = [...new Set([...lockedKeys, ...keys.map(normalizeRoleKey)])]
      if (nextKeys.length < 1) {
        error.value = 'El usuario debe tener al menos un rol asignado'
        return
      }
      editForm.value.roleKeys = nextKeys
    },
  })

  async function loadPersonnel() {
    if (config.value.showInstitutionPicker && !normalizeInstitutionId(selectedInstitutionId.value)) {
      personnel.value = []
      totalPersonnel.value = 0
      totalPages.value = 0
      page.value = 1
      loading.value = false
      return
    }

    loading.value = true
    error.value = null
    try {
      const result = await config.value.api.fetchPersonnel({
        page: page.value,
        pageSize: pageSize.value,
        search: debouncedSearch.value || undefined,
        institutionId: config.value.showInstitutionPicker
          ? selectedInstitutionId.value || undefined
          : undefined,
      })
      personnel.value = result.items
      totalPersonnel.value = result.total
      totalPages.value = result.totalPages
      page.value = result.page
      pageSize.value = result.pageSize
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el personal'
    } finally {
      loading.value = false
    }
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
    page.value = nextPage
  }

  async function loadSchoolsForInstitution(
    institutionId?: string,
    target: 'create' | 'edit' = 'create',
  ) {
    const id = institutionId ?? (target === 'edit' ? editForm.value.institutionId : createForm.value.institutionId)
    if (config.value.showInstitutionPicker && !id) {
      schools.value = []
      if (target === 'edit') editForm.value.schoolId = ''
      else createForm.value.schoolId = ''
      return
    }
    schools.value = await config.value.api.fetchSchools(id || undefined)
    const currentSchoolId = target === 'edit' ? editForm.value.schoolId : createForm.value.schoolId
    const stillValid = schools.value.some((school) => school.id === currentSchoolId)
    const nextSchoolId = stillValid ? currentSchoolId : schools.value[0]?.id ?? ''
    if (target === 'edit') editForm.value.schoolId = nextSchoolId
    else createForm.value.schoolId = nextSchoolId
  }

  function contactLines(person: SuperadminPersonnel): string[] {
    const lines: string[] = []
    if (person.dni) lines.push(`DNI: ${person.dni}`)
    if (person.cuil) lines.push(`CUIT: ${person.cuil}`)
    if (person.phone) lines.push(`Tel: ${person.phone}`)
    return lines.length ? lines : ['Sin datos de contacto']
  }

  function ensureValidCreateRoleKeys() {
    const validKeys = new Set(
      buildPositionOptions(resolveInstitutionId('create'))
        .filter((option) => !option.disabled && !isLockedPersonnelRoleKey(option.key))
        .map((option) => option.key),
    )
    const nextKeys = createForm.value.roleKeys.filter((key) => validKeys.has(normalizeRoleKey(key)))
    createForm.value.roleKeys = nextKeys.length
      ? nextKeys
      : [creatablePositions.value[0]?.key ?? config.value.defaultCreateRole]
  }

  async function openCreateModal() {
    if (!canCreatePersonnel.value) {
      error.value = 'Seleccioná una institución para dar de alta personal'
      return
    }
    const institutionId = resolveCreateInstitutionId()
    createForm.value = {
      institutionId,
      schoolId: '',
      roleKeys: [config.value.defaultCreateRole],
      password: '',
      profile: emptyUserProfile(),
    }
    createFormKey.value += 1
    showCreateModal.value = true
    await refreshRoleCatalog()
    ensureValidCreateRoleKeys()
    await loadSchoolsForInstitution(institutionId)
  }

  function closeCreateModal() {
    showCreateModal.value = false
  }

  async function refreshRoleCatalog() {
    const roles = await config.value.fetchRoles()
    positions.value = roles.filter((role) => role.scopeType === 'system')
    institutionalRoles.value = roles.filter((role) => role.scopeType === 'institution')
  }

  function ensureValidEditRoleKeys() {
    if (!editingPerson.value) return
    const validKeys = new Set(buildEditRoleOptions().map((option) => normalizeRoleKey(option.key)))
    const lockedKeys = editForm.value.roleKeys.filter((key) => isLockedPersonnelRoleKey(key))
    const editableKeys = editForm.value.roleKeys.filter(
      (key) => !isLockedPersonnelRoleKey(key) && validKeys.has(normalizeRoleKey(key)),
    )
    const nextKeys = [...new Set([...lockedKeys, ...editableKeys])]
    if (nextKeys.length > 0) {
      editForm.value.roleKeys = nextKeys
      return
    }
    editForm.value.roleKeys = roleKeysForEditModal(
      editingPerson.value,
      resolveInstitutionId('edit'),
    )
  }

  async function openEditModal(person: SuperadminPersonnel) {
    editingPerson.value = person
    const profile = profileFromMember({
      profile: person.profile,
      email: person.email,
      displayName: person.displayName,
    })
    editingOriginalUsername.value = profile.username.trim().toLowerCase()
    const institutionId = resolveEditInstitutionId(person)
    await refreshRoleCatalog()
    editForm.value = {
      institutionId,
      schoolId: person.schoolId ?? '',
      roleKeys: roleKeysForEditModal(person, institutionId),
      profile,
      isActive: person.isActive,
      mustChangePassword: person.mustChangePassword,
      password: '',
    }
    editFormKey.value += 1
    void loadSchoolsForInstitution(editForm.value.institutionId, 'edit')
  }

  function closeEditModal() {
    editingPerson.value = null
  }

  async function submitEdit() {
    if (!editingPerson.value) return
    const profile = normalizeProfileForApi(editForm.value.profile)
    if (!profile.username || !profile.fullName || !profile.personalEmail) {
      error.value = 'Completá nombre completo, mail y nombre de usuario'
      return
    }
    if (editForm.value.roleKeys.length < 1) {
      error.value = 'Asigná al menos un rol al usuario'
      return
    }
    const editableKeys = editableRoleKeysForSubmit(editForm.value.roleKeys)
    if (editableKeys.length < 1) {
      error.value = 'Asigná al menos un rol editable al usuario'
      return
    }
    saving.value = true
    error.value = null
    try {
      const payload: Parameters<typeof config.value.api.updatePersonnel>[1] = {
        ...profile,
        isActive: editForm.value.isActive,
        mustChangePassword: editForm.value.mustChangePassword,
        password: editForm.value.password.trim() || undefined,
        roleKeys: [
          ...new Set([
            ...preservedReadOnlyRoleKeys(),
            ...preservedNonEditableRoleKeys(),
            ...editableKeys.map(normalizeRoleKey),
          ]),
        ],
        schoolId: editForm.value.schoolId || undefined,
        institutionId: config.value.showInstitutionPicker
          ? resolveInstitutionId('edit') || undefined
          : undefined,
      }
      const nextUsername = (profile.username ?? '').trim().toLowerCase()
      if (nextUsername === editingOriginalUsername.value) {
        delete payload.username
      }
      await config.value.api.updatePersonnel(editingPerson.value.id, payload)
      closeEditModal()
      await loadPersonnel()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo actualizar el usuario'
    } finally {
      saving.value = false
    }
  }

  function openDeleteConfirm(person: SuperadminPersonnel) {
    if (!person.canDelete) return
    personToDelete.value = person
    deleteError.value = null
    deleteConfirmOpen.value = true
  }

  function closeDeleteConfirm() {
    deleteConfirmOpen.value = false
    personToDelete.value = null
    deleteError.value = null
  }

  async function confirmDeletePerson() {
    if (!personToDelete.value) return
    deletingUserId.value = personToDelete.value.id
    deleteError.value = null
    try {
      await config.value.api.deletePersonnel(personToDelete.value.id)
      if (editingPerson.value?.id === personToDelete.value.id) closeEditModal()
      closeDeleteConfirm()
      await loadPersonnel()
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : 'No se pudo eliminar el usuario'
    } finally {
      deletingUserId.value = null
    }
  }

  async function removePerson(person: SuperadminPersonnel) {
    openDeleteConfirm(person)
  }

  function openBulkImportModal() {
    if (config.value.showInstitutionPicker && !canCreatePersonnel.value) {
      error.value = 'Seleccioná una institución'
      return
    }
    showBulkImportModal.value = true
  }

  function closeBulkImportModal() {
    showBulkImportModal.value = false
  }

  async function importPersonnelBulk(rows: BulkPersonnelImportRow[]) {
    if (!config.value.api.bulkImportPersonnel) {
      throw new Error('La carga masiva no está disponible')
    }
    const institutionId = resolveCreateInstitutionId()
    if (config.value.showInstitutionPicker && !institutionId) {
      throw new Error('Seleccioná una institución')
    }
    return config.value.api.bulkImportPersonnel(institutionId || undefined, rows)
  }

  async function handleBulkImportCompleted() {
    await loadPersonnel()
  }

  async function submitCreate() {
    const institutionId = resolveCreateInstitutionId()
    if (config.value.showInstitutionPicker && !institutionId) {
      error.value = 'Seleccioná una institución'
      return
    }
    const profile = normalizeProfileForApi(createForm.value.profile)
    const password = createForm.value.password.trim()
    if (!profile.username || !profile.fullName || !profile.personalEmail || !password) {
      error.value = 'Completá nombre completo, mail, nombre de usuario y contraseña'
      return
    }
    if (password.length < 8) {
      error.value = 'La contraseña debe tener al menos 8 caracteres'
      return
    }
    const roleKeys = editableRoleKeysForSubmit(createForm.value.roleKeys)
    if (!roleKeys.length) {
      error.value = 'Seleccioná al menos un rol'
      return
    }
    saving.value = true
    error.value = null
    try {
      const createdUserId = await config.value.api.createPersonnel({
        ...profile,
        username: profile.username,
        personalEmail: profile.personalEmail,
        fullName: profile.fullName,
        password,
        schoolId: createForm.value.schoolId || undefined,
        positionKey: roleKeys[0],
        institutionId: institutionId || undefined,
      })
      if (roleKeys.length > 1) {
        await config.value.api.updatePersonnel(createdUserId, {
          roleKeys,
          institutionId: institutionId || undefined,
          schoolId: createForm.value.schoolId || undefined,
        })
      }
      closeCreateModal()
      await loadPersonnel()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo dar de alta el subordinado'
    } finally {
      saving.value = false
    }
  }

  const ready = ref(false)

  async function bootstrap() {
    await refreshRoleCatalog()
    if (config.value.getInstitutions) {
      institutions.value = await config.value.getInstitutions()
    }
    selectedInstitutionId.value =
      config.value.getDefaultInstitutionId?.() ?? institutions.value[0]?.id ?? ''
    if (config.value.showInstitutionPicker && selectedInstitutionId.value) {
      createForm.value.institutionId = selectedInstitutionId.value
      await loadSchoolsForInstitution(selectedInstitutionId.value)
    } else if (!config.value.showInstitutionPicker) {
      await loadSchoolsForInstitution()
    }
    ready.value = true
    await loadPersonnel()
  }

  onMounted(() => {
    void bootstrap()
  })

  watch(searchQuery, (value) => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      debouncedSearch.value = value.trim()
      page.value = 1
    }, 300)
  })

  watch([page, debouncedSearch], () => {
    if (!ready.value) return
    void loadPersonnel()
  })

  watch(pageSize, (next, prev) => {
    if (!ready.value || next === prev) return
    if (page.value !== 1) {
      page.value = 1
      return
    }
    void loadPersonnel()
  })

  watch(selectedInstitutionId, (institutionId) => {
    if (!ready.value || !config.value.showInstitutionPicker || !institutionId) return
    config.value.onInstitutionChange?.(institutionId)
    createForm.value.institutionId = institutionId
    if (showCreateModal.value) {
      ensureValidCreateRoleKeys()
    }
    void loadSchoolsForInstitution(institutionId)
    if (page.value !== 1) {
      page.value = 1
      return
    }
    void loadPersonnel()
  })

  watch(
    () => createForm.value.institutionId,
    () => {
      if (!config.value.showInstitutionPicker) return
      ensureValidCreateRoleKeys()
    },
  )

  watch(
    () => editForm.value.institutionId,
    (institutionId) => {
      if (!config.value.showInstitutionPicker || !editingPerson.value) return
      ensureValidEditRoleKeys()
    },
  )

  watch(deleteConfirmOpen, (isOpen) => {
    if (!isOpen && !deletingUserId.value) {
      personToDelete.value = null
      deleteError.value = null
    }
  })

  return {
    config,
    error,
    loading,
    saving,
    deletingUserId,
    deleteConfirmOpen,
    personToDelete,
    deleteError,
    showCreateModal,
    showBulkImportModal,
    editingPerson,
    personnel,
    institutions,
    selectedInstitutionId,
    canCreatePersonnel,
    schools,
    page,
    pageSize,
    totalPages,
    searchQuery,
    paginationLabel,
    rowOffset,
    visiblePages,
    goToPage,
    createForm,
    createFormKey,
    createRoleKeysModel,
    createRoleOptions,
    editFormKey,
    editForm,
    editRoleKeysModel,
    totalPersonnel,
    editablePositions,
    editRoleOptions,
    editReadOnlyRoles,
    readOnlyRoleTitle,
    contactLines,
    personnelRolesForDisplay,
    loadSchoolsForInstitution,
    openCreateModal,
    closeCreateModal,
    openBulkImportModal,
    closeBulkImportModal,
    importPersonnelBulk,
    handleBulkImportCompleted,
    openEditModal,
    closeEditModal,
    submitEdit,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDeletePerson,
    removePerson,
    submitCreate,
  }
}
