<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  BuildingOffice2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  IdentificationIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import FormIconField from '@/components/FormIconField.vue'
import {
  createSuperadminInstitution,
  deleteSuperadminInstitution,
  fetchSuperadminAdministradores,
  fetchSuperadminInstitutions,
  fetchUnassignedAdministradores,
  updateSuperadminInstitution,
  type InstitutionMember,
  type SuperadminInstitution,
  type UnassignedAdministrator,
} from '@/api/superadminApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useSuperadminContext } from '@/composables/useSuperadminContext'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'
import {
  argentinaProvinceOptions,
  countryOptions,
  formatInstitutionLocation,
  optionsWithCurrent,
  provinceLabel,
} from '@/data/locationOptions'

const { selectedInstitutionId, invalidateInstitutions } = useSuperadminContext()

const inputIconClass = 'form-field w-full !pl-10'
const selectIconClass = 'form-field w-full appearance-none !pl-10 !pr-10'

const error = ref<string | null>(null)
const editError = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const deletingInstitutionId = ref<string | null>(null)
const deleteConfirmOpen = ref(false)
const institutionToDelete = ref<SuperadminInstitution | null>(null)
const deleteError = ref<string | null>(null)
const showCreateModal = ref(false)
const editingInstitution = ref<SuperadminInstitution | null>(null)
const adminsByInstitution = ref<Record<string, InstitutionMember[]>>({})
const loadingAdmins = ref(false)

const institutions = ref<SuperadminInstitution[]>([])
const page = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const totalInstitutions = ref(0)
const searchQuery = ref('')
const debouncedSearch = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const createForm = ref({
  name: '',
  administratorUserId: '',
  country: 'AR',
  province: '',
  city: '',
  address: '',
  cuit: '',
  phone: '',
  email: '',
})
const createFormKey = ref(0)
const showCreateOptionalFields = ref(false)
const unassignedAdministrators = ref<UnassignedAdministrator[]>([])
const loadingUnassignedAdmins = ref(false)

const editForm = ref({
  name: '',
  administratorUserId: '',
  country: 'AR',
  province: '',
  city: '',
  address: '',
  cuit: '',
  phone: '',
  email: '',
})
const editFormKey = ref(0)
const showEditOptionalFields = ref(false)
const editInitialAdministratorUserId = ref('')

function institutionFormHasOptionalData(form: {
  country: string
  province: string
  city: string
  address: string
  cuit: string
  phone: string
  email: string
}): boolean {
  const hasLocation = [form.province, form.city, form.address].some((value) => value.trim())
  const hasContact = [form.cuit, form.phone, form.email].some((value) => value.trim())
  const hasNonDefaultCountry = Boolean(form.country.trim() && form.country !== 'AR')
  return hasLocation || hasContact || hasNonDefaultCountry
}

function toggleCreateOptionalFields() {
  showCreateOptionalFields.value = !showCreateOptionalFields.value
}

function toggleEditOptionalFields() {
  showEditOptionalFields.value = !showEditOptionalFields.value
}

const paginationLabel = computed(() => {
  if (loading.value) return '…'
  if (totalInstitutions.value === 0) return '0 resultados'
  const start = (page.value - 1) * pageSize.value + 1
  const end = Math.min(page.value * pageSize.value, totalInstitutions.value)
  return `Mostrando ${start}-${end} de ${totalInstitutions.value}`
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

const editAdministratorOptions = computed(() => {
  const inst = editingInstitution.value
  if (!inst) return [] as Array<{ id: string; label: string }>

  const current = adminsByInstitution.value[inst.id] ?? []
  const currentIds = new Set(current.map((admin) => admin.id))
  const pool = unassignedAdministrators.value.filter((admin) => !currentIds.has(admin.id))

  return [
    ...current.map((admin) => ({
      id: admin.id,
      label: `${admin.displayName} (${admin.email}) — actual`,
    })),
    ...pool.map((admin) => ({
      id: admin.id,
      label: `${admin.displayName} (${admin.email})`,
    })),
  ]
})

async function loadInstitutions() {
  loading.value = true
  error.value = null
  const requestedPageSize = pageSize.value
  try {
    const result = await fetchSuperadminInstitutions({
      page: page.value,
      pageSize: requestedPageSize,
      search: debouncedSearch.value || undefined,
    })
    institutions.value = result.items
    totalInstitutions.value = result.total
    totalPages.value = result.totalPages
    page.value = result.page
    await loadAdminsForInstitutions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las instituciones'
  } finally {
    loading.value = false
    scheduleInstitutionsLayoutUpdate()
  }
}

function goToPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
}

async function loadAdminsForInstitutions() {
  if (!institutions.value.length) return
  loadingAdmins.value = true
  try {
    const pairs = await Promise.all(
      institutions.value.map(async (inst) => {
        const admins = await fetchSuperadminAdministradores(inst.id)
        return [inst.id, admins] as const
      }),
    )
    adminsByInstitution.value = {
      ...adminsByInstitution.value,
      ...Object.fromEntries(pairs),
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar los administradores'
  } finally {
    loadingAdmins.value = false
  }
}

function resetCreateForm() {
  createForm.value = {
    name: '',
    administratorUserId: '',
    country: 'AR',
    province: '',
    city: '',
    address: '',
    cuit: '',
    phone: '',
    email: '',
  }
}

function openCreateModal() {
  resetCreateForm()
  createFormKey.value += 1
  showCreateOptionalFields.value = false
  showCreateModal.value = true
  void loadUnassignedAdministrators()
}

async function loadUnassignedAdministrators() {
  loadingUnassignedAdmins.value = true
  try {
    unassignedAdministrators.value = await fetchUnassignedAdministradores()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar los administradores disponibles'
    unassignedAdministrators.value = []
  } finally {
    loadingUnassignedAdmins.value = false
  }
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function submitCreate() {
  if (!createForm.value.administratorUserId) {
    error.value = 'Seleccioná un administrador disponible'
    return
  }
  saving.value = true
  error.value = null
  try {
    await createSuperadminInstitution({
      name: createForm.value.name.trim(),
      administratorUserId: createForm.value.administratorUserId,
      country: createForm.value.country.trim() || undefined,
      province: createForm.value.province.trim() || undefined,
      city: createForm.value.city.trim() || undefined,
      address: createForm.value.address.trim() || undefined,
      cuit: createForm.value.cuit.trim() || undefined,
      phone: createForm.value.phone.trim() || undefined,
      contactEmail: createForm.value.email.trim() || undefined,
    })
    closeCreateModal()
    invalidateInstitutions()
    await loadInstitutions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo crear la institución'
  } finally {
    saving.value = false
  }
}

function openEdit(inst: SuperadminInstitution) {
  editingInstitution.value = inst
  selectedInstitutionId.value = inst.id
  editError.value = null
  const currentAdmin = adminsByInstitution.value[inst.id]?.[0]
  const administratorUserId = currentAdmin?.id ?? ''
  editInitialAdministratorUserId.value = administratorUserId
  editForm.value = {
    name: inst.name,
    administratorUserId,
    country: inst.country ?? 'AR',
    province: inst.province ?? '',
    city: inst.city ?? '',
    address: inst.address ?? '',
    cuit: inst.cuit ?? '',
    phone: inst.phone ?? '',
    email: inst.contactEmail ?? '',
  }
  editFormKey.value += 1
  showEditOptionalFields.value = institutionFormHasOptionalData(editForm.value)
  void loadUnassignedAdministrators()
}

function closeEdit() {
  editingInstitution.value = null
  editError.value = null
}

async function saveEdit() {
  if (!editingInstitution.value) return
  saving.value = true
  editError.value = null
  try {
    const administratorChanged =
      editForm.value.administratorUserId !== editInitialAdministratorUserId.value
    await updateSuperadminInstitution(editingInstitution.value.id, {
      name: editForm.value.name.trim(),
      country: editForm.value.country.trim() || undefined,
      province: editForm.value.province.trim() || undefined,
      city: editForm.value.city.trim() || undefined,
      address: editForm.value.address.trim() || undefined,
      cuit: editForm.value.cuit.trim() || undefined,
      phone: editForm.value.phone.trim() || undefined,
      contactEmail: editForm.value.email.trim() || undefined,
      ...(administratorChanged ? { administratorUserId: editForm.value.administratorUserId } : {}),
    })
    closeEdit()
    invalidateInstitutions()
    await loadInstitutions()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'No se pudo actualizar la institución'
  } finally {
    saving.value = false
  }
}

function openDeleteConfirm(inst: SuperadminInstitution) {
  institutionToDelete.value = inst
  deleteError.value = null
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  deleteConfirmOpen.value = false
  institutionToDelete.value = null
  deleteError.value = null
}

async function confirmDeleteInstitution() {
  if (!institutionToDelete.value) return
  deletingInstitutionId.value = institutionToDelete.value.id
  deleteError.value = null
  try {
    await deleteSuperadminInstitution(institutionToDelete.value.id)
    if (editingInstitution.value?.id === institutionToDelete.value.id) closeEdit()
    closeDeleteConfirm()
    invalidateInstitutions()
    await loadInstitutions()
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'No se pudo eliminar la institución'
  } finally {
    deletingInstitutionId.value = null
  }
}

function removeInstitution(inst: SuperadminInstitution) {
  openDeleteConfirm(inst)
}

function institutionLocation(inst: SuperadminInstitution): string {
  return formatInstitutionLocation(inst)
}

function contactSummary(inst: SuperadminInstitution): string[] {
  const lines: string[] = []
  if (inst.responsibleName) lines.push(`Responsable: ${inst.responsibleName}`)
  if (inst.cuit) lines.push(`CUIT: ${inst.cuit}`)
  if (inst.phone) lines.push(`Tel: ${inst.phone}`)
  if (inst.contactEmail) lines.push(inst.contactEmail)
  const province = provinceLabel(inst.province)
  if (province) lines.push(`Provincia: ${province}`)
  if (inst.city) lines.push(`Localidad: ${inst.city}`)
  lines.push(`${inst.schoolCount} colegio(s)`)
  if (!inst.cuit && !inst.phone && !inst.contactEmail) {
    lines.unshift('Sin datos fiscales')
  }
  return lines
}

watch(searchQuery, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
    page.value = 1
  }, 300)
})

const layoutReady = ref(false)

watch([page, debouncedSearch], () => {
  if (!layoutReady.value) return
  void loadInstitutions()
})

watch(deleteConfirmOpen, (isOpen) => {
  if (!isOpen && !deletingInstitutionId.value) {
    institutionToDelete.value = null
    deleteError.value = null
  }
})

const INSTITUTION_ROW_HEIGHT = 72
const INSTITUTION_TABLE_HEAD_HEIGHT = 44
const MIN_INSTITUTION_PAGE_SIZE = 4

const institutionsListViewportRef = ref<HTMLElement | null>(null)
let institutionsResizeObserver: ResizeObserver | null = null

function resolveInstitutionRowHeight(viewport: HTMLElement): number {
  const firstRow = viewport.querySelector('tbody tr')
  if (firstRow) {
    return Math.max(56, Math.ceil(firstRow.getBoundingClientRect().height))
  }
  return INSTITUTION_ROW_HEIGHT
}

function resolveInstitutionTableHeadHeight(viewport: HTMLElement): number {
  const thead = viewport.querySelector('thead')
  if (thead) {
    return Math.ceil(thead.getBoundingClientRect().height)
  }
  return INSTITUTION_TABLE_HEAD_HEIGHT
}

function updateInstitutionPageSize() {
  if (loading.value) return

  const viewport = institutionsListViewportRef.value
  if (!viewport) return

  const height = viewport.clientHeight
  if (height <= 0) return

  const rowHeight = resolveInstitutionRowHeight(viewport)
  const theadHeight = viewport.querySelector('thead')
    ? resolveInstitutionTableHeadHeight(viewport)
    : INSTITUTION_TABLE_HEAD_HEIGHT
  const availableForRows = Math.max(0, height - theadHeight)

  const nextPageSize = Math.max(
    MIN_INSTITUTION_PAGE_SIZE,
    Math.floor(availableForRows / rowHeight),
  )

  if (nextPageSize !== pageSize.value) {
    pageSize.value = nextPageSize
  }
}

function scheduleInstitutionsLayoutUpdate() {
  void nextTick(() => updateInstitutionPageSize())
}

watch(institutionsListViewportRef, (element, _, onCleanup) => {
  if (!institutionsResizeObserver) return

  if (element) {
    institutionsResizeObserver.observe(element)
    scheduleInstitutionsLayoutUpdate()
  }

  onCleanup(() => {
    if (element) institutionsResizeObserver?.unobserve(element)
  })
})

watch(institutions, () => {
  if (!loading.value) scheduleInstitutionsLayoutUpdate()
})

watch([loading, totalInstitutions], () => {
  if (!loading.value) scheduleInstitutionsLayoutUpdate()
})

watch(pageSize, (next, prev) => {
  if (!layoutReady.value || loading.value || next === prev) return
  if (page.value !== 1) {
    page.value = 1
    return
  }
  void loadInstitutions()
})

onMounted(() => {
  institutionsResizeObserver = new ResizeObserver(() => updateInstitutionPageSize())
  if (institutionsListViewportRef.value) {
    institutionsResizeObserver.observe(institutionsListViewportRef.value)
  }
  void nextTick(() => {
    updateInstitutionPageSize()
    layoutReady.value = true
    void loadInstitutions()
  })
})

onUnmounted(() => {
  institutionsResizeObserver?.disconnect()
  institutionsResizeObserver = null
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-6">
    <header class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        >
          <BuildingOffice2Icon class="size-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Gestión de Instituciones (Nivel SuperAdmin)
          </h2>
          <p class="mt-1 max-w-3xl text-sm text-muted">
            Creá y administrá los tenants globales del sistema. Al editar una institución, podés asignarle o
            cambiarle sus administradores y datos fiscales.
          </p>
        </div>
      </div>
    </header>

    <p
      v-if="error"
      class="shrink-0 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {{ error }}
    </p>

    <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
      <div class="shrink-0 border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/10 dark:bg-gray-950/50">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="heading-section">Instituciones registradas</h3>
            <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
              {{ loading ? '…' : `${totalInstitutions} ${totalInstitutions === 1 ? 'resultado' : 'resultados'}` }}
            </span>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <label class="relative w-full max-w-sm sm:w-80">
              <span class="sr-only">Buscar instituciones</span>
              <MagnifyingGlassIcon
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Buscar por nombre, CUIT o email de contacto…"
                class="form-field w-full !py-2.5 !pl-10"
                autocomplete="off"
              />
            </label>

            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              @click="openCreateModal"
            >
              <PlusIcon class="size-4" />
              Crear institución
            </button>
          </div>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col">
        <div
          ref="institutionsListViewportRef"
          class="min-h-0 flex-1 overflow-auto"
        >
          <div
            v-if="loading"
            class="flex min-h-[12rem] items-center justify-center px-4 py-4 text-center text-sm text-muted"
          >
            Cargando instituciones…
          </div>

          <div
            v-else-if="!institutions.length"
            class="flex min-h-[12rem] items-center justify-center px-4 py-4 text-center text-sm text-muted"
          >
            {{ searchQuery.trim() ? 'No se encontraron resultados para tu búsqueda.' : 'Todavía no hay instituciones registradas.' }}
          </div>

          <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950/40">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  ID
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Institución
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  CUIT / Contacto
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Administradores asignados
                </th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/10">
              <tr
                v-for="(inst, index) in institutions"
                :key="inst.id"
                class="hover:bg-gray-50/80 dark:hover:bg-white/5"
              >
                <td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  #{{ rowOffset + index + 1 }}
                </td>
                <td class="px-4 py-4">
                  <p class="font-medium text-gray-900 dark:text-white">{{ inst.name }}</p>
                  <p class="mt-0.5 text-xs text-muted">{{ institutionLocation(inst) }}</p>
                </td>
                <td class="px-4 py-4 text-sm text-muted">
                  <p v-for="line in contactSummary(inst)" :key="line">{{ line }}</p>
                </td>
                <td class="px-4 py-4">
                  <div v-if="loadingAdmins" class="text-xs text-muted">Cargando…</div>
                  <div v-else-if="adminsByInstitution[inst.id]?.length" class="flex flex-wrap gap-2">
                    <span
                      v-for="admin in adminsByInstitution[inst.id]"
                      :key="admin.membershipId"
                      class="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    >
                      {{ admin.email }}
                    </span>
                  </div>
                  <span v-else class="text-xs text-muted">Sin administradores</span>
                </td>
                <td class="whitespace-nowrap px-4 py-4 text-right">
                  <div class="inline-flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                      @click="openEdit(inst)"
                    >
                      <PencilSquareIcon class="size-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      :disabled="deletingInstitutionId === inst.id"
                      class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
                      @click="removeInstitution(inst)"
                    >
                      <TrashIcon class="size-4" />
                      {{ deletingInstitutionId === inst.id ? 'Eliminando…' : 'Eliminar' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && institutions.length && (totalPages > 1 || totalInstitutions > 0)"
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10"
        >
          <p class="text-sm text-muted">{{ paginationLabel }}</p>
          <nav
            v-if="totalPages > 1"
            class="flex flex-wrap items-center gap-1"
            aria-label="Paginación de instituciones"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              :disabled="loading || page <= 1"
              aria-label="Página anterior"
              @click="goToPage(page - 1)"
            >
              <ChevronLeftIcon class="size-4" />
            </button>
            <button
              v-for="pageNumber in visiblePages"
              :key="pageNumber"
              type="button"
              class="min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                pageNumber === page
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'
              "
              :disabled="loading"
              :aria-current="pageNumber === page ? 'page' : undefined"
              @click="goToPage(pageNumber)"
            >
              {{ pageNumber }}
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              :disabled="loading || page >= totalPages"
              aria-label="Página siguiente"
              @click="goToPage(page + 1)"
            >
              <ChevronRightIcon class="size-4" />
            </button>
          </nav>
        </div>
      </div>
    </section>

    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeCreateModal"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="create-institution-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
            >
              <BuildingOffice2Icon class="size-6" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h3 id="create-institution-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Crear institución
              </h3>
              <p class="mt-1 text-sm text-muted">
                Seleccioná un administrador disponible (sin institución asignada). Los colegios y directores se gestionan
                después desde Colegios y Grados.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Cerrar"
            @click="closeCreateModal"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <div class="border-b border-gray-200 dark:border-white/10" />

        <form
          :key="createFormKey"
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="submitCreate"
        >
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <FormIconField
              label="Nombre de la institución *"
              :icon="BuildingOffice2Icon"
              html-for="create-institution-name"
              label-position="outside"
            >
              <input
                id="create-institution-name"
                v-model="createForm.name"
                required
                placeholder="Ej. Universidad Tecnológica Nacional"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="Administrador *"
              :icon="KeyIcon"
              html-for="create-institution-administrator"
              label-position="outside"
            >
              <select
                id="create-institution-administrator"
                v-model="createForm.administratorUserId"
                required
                :disabled="loadingUnassignedAdmins"
                :class="selectIconClass"
              >
                <option value="" disabled>
                  {{ loadingUnassignedAdmins ? 'Cargando administradores…' : 'Seleccioná un administrador' }}
                </option>
                <option
                  v-for="admin in unassignedAdministrators"
                  :key="admin.id"
                  :value="admin.id"
                >
                  {{ admin.displayName }} · {{ admin.email }}
                </option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            </FormIconField>

            <p v-if="!loadingUnassignedAdmins && !unassignedAdministrators.length" class="text-sm text-muted">
              No hay administradores disponibles.
              <RouterLink
                :to="{ name: 'superadmin-administradores' }"
                class="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                @click="closeCreateModal"
              >
                Creá uno en el módulo Administradores
              </RouterLink>
              sin asignarle institución.
            </p>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              :aria-expanded="showCreateOptionalFields"
              @click="toggleCreateOptionalFields"
            >
              <ChevronDownIcon
                class="size-4 transition-transform duration-200"
                :class="showCreateOptionalFields ? 'rotate-180' : ''"
                aria-hidden="true"
              />
              {{ showCreateOptionalFields ? 'Ocultar datos opcionales' : 'Completar más datos (opcional)' }}
            </button>

            <div v-show="showCreateOptionalFields" class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <FormIconField
                  label="País"
                  :icon="MapPinIcon"
                  html-for="create-institution-country"
                  label-position="outside"
                >
                  <select
                    id="create-institution-country"
                    v-model="createForm.country"
                    :class="selectIconClass"
                  >
                    <option value="">Seleccionar…</option>
                    <option v-for="option in countryOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <ChevronDownIcon
                    class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </FormIconField>

                <FormIconField
                  :label="createForm.country === 'AR' ? 'Provincia' : 'Provincia / estado'"
                  :icon="MapPinIcon"
                  html-for="create-institution-province"
                  label-position="outside"
                >
                  <select
                    v-if="createForm.country === 'AR'"
                    id="create-institution-province"
                    v-model="createForm.province"
                    :class="selectIconClass"
                  >
                    <option value="">Seleccionar…</option>
                    <option
                      v-for="option in optionsWithCurrent(argentinaProvinceOptions, createForm.province)"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <ChevronDownIcon
                    v-if="createForm.country === 'AR'"
                    class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                  <input
                    v-else
                    id="create-institution-province"
                    v-model="createForm.province"
                    placeholder="Ej. California, São Paulo…"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>

              <div class="grid gap-4 sm:grid-cols-5">
                <FormIconField
                  label="Localidad"
                  :icon="MapPinIcon"
                  html-for="create-institution-city"
                  label-position="outside"
                  class="sm:col-span-2"
                >
                  <input
                    id="create-institution-city"
                    v-model="createForm.city"
                    placeholder="Ej. Rosario, Mendoza, La Plata…"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Dirección"
                  :icon="MapPinIcon"
                  html-for="create-institution-address"
                  label-position="outside"
                  class="sm:col-span-3"
                >
                  <input
                    id="create-institution-address"
                    v-model="createForm.address"
                    placeholder="Calle y número"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <FormIconField
                  label="CUIT"
                  :icon="IdentificationIcon"
                  html-for="create-institution-cuit"
                  label-position="outside"
                >
                  <input
                    id="create-institution-cuit"
                    v-model="createForm.cuit"
                    placeholder="Ej. 30-71234567-8"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Email de contacto"
                  :icon="EnvelopeIcon"
                  html-for="create-institution-email"
                  label-position="outside"
                >
                  <input
                    id="create-institution-email"
                    v-model="createForm.email"
                    type="email"
                    placeholder="contacto@institucion.edu.ar"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Teléfono"
                  :icon="PhoneIcon"
                  html-for="create-institution-phone"
                  label-position="outside"
                >
                  <input
                    id="create-institution-phone"
                    v-model="createForm.phone"
                    type="tel"
                    placeholder="Ej. +54 11 1234-5678"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              @click="closeCreateModal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving || loadingUnassignedAdmins || !unassignedAdministrators.length"
              :class="['disabled:opacity-60', gcalPrimaryBtn]"
            >
              <CheckIcon class="size-4" />
              {{ saving ? 'Creando…' : 'Crear institución' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="editingInstitution"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeEdit"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="edit-institution-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
            >
              <BuildingOffice2Icon class="size-6" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h3 id="edit-institution-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Editar institución
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ editingInstitution.schoolCount }} colegio(s) · {{ editingInstitution.name }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Cerrar"
            @click="closeEdit"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <div class="border-b border-gray-200 dark:border-white/10" />

        <form
          :key="editFormKey"
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="saveEdit"
        >
          <div class="space-y-4 px-6 py-5">
            <p
              v-if="editError"
              class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {{ editError }}
            </p>

            <FormIconField
              label="Nombre de la institución *"
              :icon="BuildingOffice2Icon"
              html-for="edit-institution-name"
              label-position="outside"
            >
              <input
                id="edit-institution-name"
                v-model="editForm.name"
                required
                placeholder="Ej. Universidad Tecnológica Nacional"
                :class="inputIconClass"
              />
            </FormIconField>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              :aria-expanded="showEditOptionalFields"
              @click="toggleEditOptionalFields"
            >
              <ChevronDownIcon
                class="size-4 transition-transform duration-200"
                :class="showEditOptionalFields ? 'rotate-180' : ''"
                aria-hidden="true"
              />
              {{ showEditOptionalFields ? 'Ocultar datos opcionales' : 'Completar más datos (opcional)' }}
            </button>

            <div v-show="showEditOptionalFields" class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <FormIconField
                  label="País"
                  :icon="MapPinIcon"
                  html-for="edit-institution-country"
                  label-position="outside"
                >
                  <select
                    id="edit-institution-country"
                    v-model="editForm.country"
                    :class="selectIconClass"
                  >
                    <option value="">Seleccionar…</option>
                    <option
                      v-for="option in optionsWithCurrent(countryOptions, editForm.country)"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <ChevronDownIcon
                    class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </FormIconField>

                <FormIconField
                  :label="editForm.country === 'AR' ? 'Provincia' : 'Provincia / estado'"
                  :icon="MapPinIcon"
                  html-for="edit-institution-province"
                  label-position="outside"
                >
                  <select
                    v-if="editForm.country === 'AR'"
                    id="edit-institution-province"
                    v-model="editForm.province"
                    :class="selectIconClass"
                  >
                    <option value="">Seleccionar…</option>
                    <option
                      v-for="option in optionsWithCurrent(argentinaProvinceOptions, editForm.province)"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <ChevronDownIcon
                    v-if="editForm.country === 'AR'"
                    class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                  <input
                    v-else
                    id="edit-institution-province"
                    v-model="editForm.province"
                    placeholder="Ej. California, São Paulo…"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>

              <div class="grid gap-4 sm:grid-cols-5">
                <FormIconField
                  label="Localidad"
                  :icon="MapPinIcon"
                  html-for="edit-institution-city"
                  label-position="outside"
                  class="sm:col-span-2"
                >
                  <input
                    id="edit-institution-city"
                    v-model="editForm.city"
                    placeholder="Ej. Rosario, Mendoza, La Plata…"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Dirección"
                  :icon="MapPinIcon"
                  html-for="edit-institution-address"
                  label-position="outside"
                  class="sm:col-span-3"
                >
                  <input
                    id="edit-institution-address"
                    v-model="editForm.address"
                    placeholder="Calle y número"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <FormIconField
                  label="CUIT"
                  :icon="IdentificationIcon"
                  html-for="edit-institution-cuit"
                  label-position="outside"
                >
                  <input
                    id="edit-institution-cuit"
                    v-model="editForm.cuit"
                    placeholder="Ej. 30-71234567-8"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Email de contacto"
                  :icon="EnvelopeIcon"
                  html-for="edit-institution-email"
                  label-position="outside"
                >
                  <input
                    id="edit-institution-email"
                    v-model="editForm.email"
                    type="email"
                    placeholder="contacto@institucion.edu.ar"
                    :class="inputIconClass"
                  />
                </FormIconField>

                <FormIconField
                  label="Teléfono"
                  :icon="PhoneIcon"
                  html-for="edit-institution-phone"
                  label-position="outside"
                >
                  <input
                    id="edit-institution-phone"
                    v-model="editForm.phone"
                    type="tel"
                    placeholder="Ej. +54 11 1234-5678"
                    :class="inputIconClass"
                  />
                </FormIconField>
              </div>
            </div>

            <FormIconField
              label="Administrador"
              :icon="KeyIcon"
              html-for="edit-institution-administrator"
            >
              <select
                id="edit-institution-administrator"
                v-model="editForm.administratorUserId"
                :class="selectIconClass"
                :disabled="loadingUnassignedAdmins"
              >
                <option value="">
                  {{ loadingUnassignedAdmins ? 'Cargando administradores…' : 'Sin administrador asignado' }}
                </option>
                <option
                  v-for="admin in editAdministratorOptions"
                  :key="admin.id"
                  :value="admin.id"
                >
                  {{ admin.label }}
                </option>
              </select>
            </FormIconField>
            <p v-if="!loadingUnassignedAdmins && !editAdministratorOptions.length" class="text-sm text-muted">
              No hay administradores disponibles para asignar.
              <RouterLink
                :to="{ name: 'superadmin-administradores' }"
                class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                @click="closeEdit"
              >
                Creá uno en el módulo Administradores
              </RouterLink>
            </p>
          </div>

          <div class="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              @click="closeEdit"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              :class="['disabled:opacity-60', gcalPrimaryBtn]"
            >
              <CheckIcon class="size-4" />
              {{ saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Eliminar institución"
      confirm-label="Eliminar"
      loading-label="Eliminando…"
      :loading="!!institutionToDelete && deletingInstitutionId === institutionToDelete.id"
      :error="deleteError"
      @confirm="confirmDeleteInstitution"
    >
      ¿Querés eliminar la institución
      <span class="font-semibold text-gray-900 dark:text-white">{{ institutionToDelete?.name }}</span>?
      Esta acción no se puede deshacer.
    </ConfirmDialog>
  </div>
</template>
