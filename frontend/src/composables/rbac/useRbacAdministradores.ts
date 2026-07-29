import { computed, ref } from 'vue'
import {
  createPoolAdministrador,
  deleteSuperadminPersonnel,
  fetchSuperadminAdministradoresList,
  updateSuperadminPersonnel,
  type SuperadminAdministrator,
} from '@/api/superadminApi'
import {
  emptyUserProfile,
  normalizeProfileForApi,
  profileFromMember,
  type UserProfile,
} from '@/types/userProfile'

export function useRbacAdministradores() {
  const error = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const deletingUserId = ref<string | null>(null)
  const showCreateModal = ref(false)
  const editingAdmin = ref<SuperadminAdministrator | null>(null)
  const administrators = ref<SuperadminAdministrator[]>([])
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const totalAdministrators = ref(0)
  const searchQuery = ref('')
  const debouncedSearch = ref('')
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  const createForm = ref({
    password: '',
    profile: emptyUserProfile(),
  })
  const editForm = ref({
    password: '',
    profile: emptyUserProfile() as UserProfile,
  })
  const createFormKey = ref(0)
  const editFormKey = ref(0)
  const deleteConfirmOpen = ref(false)
  const adminToDelete = ref<SuperadminAdministrator | null>(null)
  const deleteError = ref<string | null>(null)

  const paginationLabel = computed(() => {
    if (loading.value) return '…'
    if (totalAdministrators.value === 0) return '0 resultados'
    const start = (page.value - 1) * pageSize.value + 1
    const end = Math.min(page.value * pageSize.value, totalAdministrators.value)
    return `Mostrando ${start}-${end} de ${totalAdministrators.value}`
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

  async function loadAdministrators() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchSuperadminAdministradoresList({
        page: page.value,
        pageSize: pageSize.value,
        search: debouncedSearch.value || undefined,
      })
      administrators.value = result.items
      totalAdministrators.value = result.total
      totalPages.value = result.totalPages
      page.value = result.page
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudieron cargar los administradores'
    } finally {
      loading.value = false
    }
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
    page.value = nextPage
    void loadAdministrators()
  }

  function resetCreateForm() {
    createForm.value = {
      password: '',
      profile: emptyUserProfile(),
    }
  }

  function openCreateModal() {
    resetCreateForm()
    createFormKey.value += 1
    showCreateModal.value = true
  }

  function closeCreateModal() {
    showCreateModal.value = false
  }

  async function submitCreate() {
    saving.value = true
    error.value = null
    try {
      await createPoolAdministrador({
        ...normalizeProfileForApi(createForm.value.profile),
        password: createForm.value.password,
      })
      closeCreateModal()
      await loadAdministrators()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo crear el administrador'
    } finally {
      saving.value = false
    }
  }

  function openEditModal(admin: SuperadminAdministrator) {
    editingAdmin.value = admin
    editFormKey.value += 1
    editForm.value = {
      password: '',
      profile: profileFromMember(admin),
    }
  }

  function closeEditModal() {
    editingAdmin.value = null
  }

  async function submitEdit() {
    if (!editingAdmin.value) return
    saving.value = true
    error.value = null
    try {
      await updateSuperadminPersonnel(editingAdmin.value.id, {
        ...normalizeProfileForApi(editForm.value.profile),
        password: editForm.value.password.trim() || undefined,
        institutionId: editingAdmin.value.institutionId ?? undefined,
        schoolId: editingAdmin.value.schoolId ?? undefined,
        membershipId: editingAdmin.value.membershipId ?? undefined,
        positionKey: 'administrador',
        roleKeys: ['administrador'],
      })
      closeEditModal()
      await loadAdministrators()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo actualizar el administrador'
    } finally {
      saving.value = false
    }
  }

  function confirmDeleteAdmin(admin: SuperadminAdministrator) {
    adminToDelete.value = admin
    deleteError.value = null
    deleteConfirmOpen.value = true
  }

  async function removeAdmin() {
    if (!adminToDelete.value) return
    deletingUserId.value = adminToDelete.value.id
    deleteError.value = null
    try {
      await deleteSuperadminPersonnel(adminToDelete.value.id)
      deleteConfirmOpen.value = false
      adminToDelete.value = null
      await loadAdministrators()
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : 'No se pudo eliminar el administrador'
    } finally {
      deletingUserId.value = null
    }
  }

  function scheduleSearchReload() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      debouncedSearch.value = searchQuery.value.trim()
      page.value = 1
      void loadAdministrators()
    }, 300)
  }

  async function initialize() {
    await loadAdministrators()
  }

  return {
    error,
    loading,
    saving,
    deletingUserId,
    showCreateModal,
    editingAdmin,
    administrators,
    page,
    totalPages,
    totalAdministrators,
    searchQuery,
    paginationLabel,
    rowOffset,
    visiblePages,
    createForm,
    editForm,
    createFormKey,
    editFormKey,
    deleteConfirmOpen,
    adminToDelete,
    deleteError,
    goToPage,
    openCreateModal,
    closeCreateModal,
    submitCreate,
    openEditModal,
    closeEditModal,
    submitEdit,
    confirmDeleteAdmin,
    removeAdmin,
    scheduleSearchReload,
    initialize,
  }
}
