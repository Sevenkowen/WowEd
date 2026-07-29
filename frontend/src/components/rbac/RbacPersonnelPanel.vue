<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  ArrowUpTrayIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import UserProfileFormFields from '@/components/UserProfileFormFields.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RbacPersonnelBulkImportDialog from '@/components/rbac/RbacPersonnelBulkImportDialog.vue'
import FormIconField from '@/components/FormIconField.vue'
import FormMultiSelect from '@/components/FormMultiSelect.vue'
import { useRbacPersonnel } from '@/composables/rbac/useRbacPersonnel'
import { personnelRoleBadgeClasses } from '@/data/fixedPlatformRoles'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'
import type { RbacPersonnelModuleConfig } from '@/types/rbac'

const props = defineProps<{
  config: RbacPersonnelModuleConfig
}>()

const showCreatePassword = ref(false)
const showEditPassword = ref(false)

const selectIconClass = 'form-field w-full appearance-none !pl-10 !pr-10'
const passwordInputClass = 'form-field w-full !pl-10 !pr-10'

const {
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
  editRoleOptions,
  editReadOnlyRoles,
  readOnlyRoleTitle,
  totalPersonnel,
  contactLines,
  personnelRolesForDisplay,
  loadSchoolsForInstitution,
  openCreateModal,
  closeCreateModal,
  openBulkImportModal,
  importPersonnelBulk,
  handleBulkImportCompleted,
  openEditModal,
  closeEditModal,
  submitEdit,
  confirmDeletePerson,
  removePerson,
  submitCreate,
} = useRbacPersonnel(toRef(props, 'config'))

watch(showCreateModal, (open) => {
  if (!open) showCreatePassword.value = false
})

watch(editingPerson, (person) => {
  if (!person) showEditPassword.value = false
})

const PERSONNEL_ROW_HEIGHT = 72
const MIN_PERSONNEL_PAGE_SIZE = 4

const personnelListViewportRef = ref<HTMLElement | null>(null)
let personnelResizeObserver: ResizeObserver | null = null

function updatePersonnelPageSize() {
  const viewport = personnelListViewportRef.value
  if (!viewport) return

  const height = viewport.clientHeight
  if (height <= 0) return

  const nextPageSize = Math.max(
    MIN_PERSONNEL_PAGE_SIZE,
    Math.floor(height / PERSONNEL_ROW_HEIGHT),
  )

  if (nextPageSize !== pageSize.value) {
    pageSize.value = nextPageSize
  }
}

function schedulePersonnelLayoutUpdate() {
  void nextTick(() => updatePersonnelPageSize())
}

watch(personnelListViewportRef, (element, _, onCleanup) => {
  if (!personnelResizeObserver) return

  if (element) {
    personnelResizeObserver.observe(element)
    schedulePersonnelLayoutUpdate()
  }

  onCleanup(() => {
    if (element) personnelResizeObserver?.unobserve(element)
  })
})

watch([loading, totalPersonnel], () => {
  schedulePersonnelLayoutUpdate()
})

onMounted(() => {
  personnelResizeObserver = new ResizeObserver(() => updatePersonnelPageSize())
  if (personnelListViewportRef.value) {
    personnelResizeObserver.observe(personnelListViewportRef.value)
    schedulePersonnelLayoutUpdate()
  }
})

onUnmounted(() => {
  personnelResizeObserver?.disconnect()
  personnelResizeObserver = null
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-6">
    <header class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        >
          <UserGroupIcon class="size-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Directivos</h2>
          <p class="mt-1 max-w-3xl text-sm text-muted">
            Gestión de usuarios institucionales con control de acceso basado en roles (RBAC).
          </p>
        </div>
      </div>

      <label v-if="config.showInstitutionPicker" class="flex shrink-0 items-center gap-2.5 pt-0.5">
        <span class="text-sm font-medium text-gray-900 dark:text-white">Institución</span>
        <div class="relative">
          <BuildingOffice2Icon
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
          <select v-model="selectedInstitutionId" class="form-field w-72 !pl-10">
            <option value="" disabled>Seleccionar institución…</option>
            <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
              {{ inst.name }}
            </option>
          </select>
        </div>
      </label>

      <div v-else class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
          @click="openBulkImportModal"
        >
          <ArrowUpTrayIcon class="size-4" />
          Carga masiva
        </button>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          @click="openCreateModal"
        >
          <PlusIcon class="size-4" />
          Alta de Subordinado
        </button>
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
            <h3 class="heading-section">Directivos registrados</h3>
            <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
              {{ loading ? '…' : `${totalPersonnel} ${totalPersonnel === 1 ? 'resultado' : 'resultados'}` }}
            </span>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <label class="relative w-full max-w-sm sm:w-80">
              <span class="sr-only">Buscar personal</span>
              <MagnifyingGlassIcon
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Buscar por nombre, email, usuario o DNI…"
                class="form-field w-full !py-2.5 !pl-10"
                autocomplete="off"
              />
            </label>

            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              :disabled="config.showInstitutionPicker && !canCreatePersonnel"
              :title="config.showInstitutionPicker && !canCreatePersonnel ? 'Seleccioná una institución' : 'Importar usuarios desde plantilla'"
              @click="openBulkImportModal"
            >
              <ArrowUpTrayIcon class="size-4" />
              Carga masiva
            </button>

            <button
              v-if="config.showInstitutionPicker"
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canCreatePersonnel"
              :title="canCreatePersonnel ? 'Dar de alta subordinado' : 'Seleccioná una institución'"
              @click="openCreateModal"
            >
              <PlusIcon class="size-4" />
              Alta de Subordinado
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted">
        Cargando personal…
      </div>

      <div
        v-else-if="config.showInstitutionPicker && !selectedInstitutionId"
        class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted"
      >
        Seleccioná una institución para ver su personal.
      </div>

      <div
        v-else-if="!personnel.length"
        class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted"
      >
        {{
          searchQuery.trim()
            ? 'No se encontraron resultados para tu búsqueda.'
            : 'Todavía no hay personal registrado en esta institución.'
        }}
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div
          ref="personnelListViewportRef"
          class="min-h-0 flex-1 overflow-auto"
        >
          <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950/40">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  ID
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Personal
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Identificación / Contacto
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Rol asignado
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Estado
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Primer login
                </th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/10">
              <tr
                v-for="(person, index) in personnel"
                :key="person.id"
                class="hover:bg-gray-50/80 dark:hover:bg-white/5"
              >
                <td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  #{{ rowOffset + index + 1 }}
                </td>
                <td class="px-4 py-4">
                  <p class="font-medium text-gray-900 dark:text-white">{{ person.displayName }}</p>
                  <p class="mt-0.5 text-xs text-muted">{{ person.email }}</p>
                </td>
                <td class="px-4 py-4 text-sm text-muted">
                  <p v-for="line in contactLines(person)" :key="line">{{ line }}</p>
                </td>
                <td class="px-4 py-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="role in personnelRolesForDisplay(person)"
                      :key="`${role.key}-${role.institutionId ?? 'global'}`"
                      :class="personnelRoleBadgeClasses(role)"
                    >
                      {{ role.label }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span class="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <span
                      class="size-2 rounded-full"
                      :class="person.isActive ? 'bg-emerald-500' : 'bg-gray-400'"
                    />
                    {{ person.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <span
                    v-if="person.mustChangePassword"
                    class="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Pendiente cambio
                  </span>
                  <span v-else class="text-sm text-muted">OK</span>
                </td>
                <td class="whitespace-nowrap px-4 py-4 text-right">
                  <div class="inline-flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="!person.canEdit"
                      :title="person.canEdit ? 'Editar usuario' : config.editDisabledTitle"
                      class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                      @click="openEditModal(person)"
                    >
                      <PencilSquareIcon class="size-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      :disabled="!person.canDelete || deletingUserId === person.id"
                      :title="person.canDelete ? 'Eliminar usuario' : config.deleteDisabledTitle"
                      class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
                      @click="removePerson(person)"
                    >
                      <TrashIcon class="size-4" />
                      {{ deletingUserId === person.id ? 'Eliminando…' : 'Eliminar' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="totalPages > 1 || totalPersonnel > 0"
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10"
        >
          <p class="text-sm text-muted">{{ paginationLabel }}</p>
          <nav
            v-if="totalPages > 1"
            class="flex flex-wrap items-center gap-1"
            aria-label="Paginación de personal"
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

    <p class="shrink-0 text-xs text-muted">
      Los docentes se pueden dar de alta desde
      <RouterLink :to="config.estructuraRoute" class="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
        Colegios y Materias
      </RouterLink>.
    </p>

    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeCreateModal"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="create-personnel-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="min-w-0">
            <h3 id="create-personnel-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Alta de Subordinado
            </h3>
            <p class="mt-1 text-sm text-muted">{{ config.createModalHint }}</p>
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
          class="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
          autocomplete="off"
          @submit.prevent="submitCreate"
        >
          <input
            type="text"
            tabindex="-1"
            aria-hidden="true"
            autocomplete="off"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
          />
          <input
            type="password"
            tabindex="-1"
            aria-hidden="true"
            autocomplete="new-password"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          <div class="space-y-4">
            <FormIconField
              v-if="config.showInstitutionPicker"
              label="Institución"
              :icon="BuildingOffice2Icon"
            >
              <select
                v-model="createForm.institutionId"
                required
                disabled
                :class="selectIconClass"
              >
                <option value="" disabled>Seleccionar…</option>
                <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                  {{ inst.name }}
                </option>
              </select>
            </FormIconField>

            <div class="grid gap-4 sm:grid-cols-2">
              <FormIconField label="Colegio" :icon="AcademicCapIcon">
                <select
                  v-model="createForm.schoolId"
                  :class="selectIconClass"
                  :disabled="!schools.length"
                >
                  <option value="">Por defecto</option>
                  <option v-for="school in schools" :key="school.id" :value="school.id">
                    {{ school.name }}
                  </option>
                </select>
              </FormIconField>

              <div>
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Roles asignados
                </span>
                <FormMultiSelect
                  :key="`create-roles-${createFormKey}`"
                  v-model="createRoleKeysModel"
                  :options="createRoleOptions"
                  :disabled="!createRoleOptions.length"
                  :icon="UserGroupIcon"
                  placeholder="Seleccionar roles…"
                />
              </div>
            </div>

            <UserProfileFormFields
              v-model="createForm.profile"
              id-prefix="subordinate"
              variant="labeled"
              disable-autofill
            />

            <FormIconField label="Contraseña *" :icon="LockClosedIcon">
              <input
                v-model="createForm.password"
                required
                :type="showCreatePassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                placeholder="Mínimo 8 caracteres"
                :class="passwordInputClass"
              />
              <button
                type="button"
                class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                :aria-label="showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showCreatePassword = !showCreatePassword"
              >
                <EyeSlashIcon v-if="showCreatePassword" class="size-4" />
                <EyeIcon v-else class="size-4" />
              </button>
            </FormIconField>
            <p class="text-xs text-muted">
              La contraseña debe tener al menos 8 caracteres.
            </p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              @click="closeCreateModal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              :class="['disabled:opacity-60', gcalPrimaryBtn]"
            >
              <CheckIcon class="size-4" />
              {{ saving ? 'Guardando…' : 'Crear subordinado' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="editingPerson"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeEditModal"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="edit-personnel-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="min-w-0">
            <h3 id="edit-personnel-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Editar usuario
            </h3>
            <p class="mt-1 font-medium text-gray-900 dark:text-white">{{ editingPerson.displayName }}</p>
            <p class="text-sm text-muted">{{ editingPerson.email }}</p>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Cerrar"
            @click="closeEditModal"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <div class="border-b border-gray-200 dark:border-white/10" />

        <form
          :key="editFormKey"
          class="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
          autocomplete="off"
          @submit.prevent="submitEdit"
        >
          <input
            type="text"
            tabindex="-1"
            aria-hidden="true"
            autocomplete="off"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
          />
          <input
            type="password"
            tabindex="-1"
            aria-hidden="true"
            autocomplete="new-password"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          <div class="space-y-4">
            <FormIconField
              v-if="config.showInstitutionPicker"
              label="Institución"
              :icon="BuildingOffice2Icon"
            >
              <select
                v-model="editForm.institutionId"
                required
                disabled
                :class="selectIconClass"
              >
                <option value="" disabled>Seleccionar…</option>
                <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                  {{ inst.name }}
                </option>
              </select>
            </FormIconField>

            <div class="grid gap-4 sm:grid-cols-2">
              <FormIconField label="Colegio" :icon="AcademicCapIcon">
                <select
                  v-model="editForm.schoolId"
                  :class="selectIconClass"
                  :disabled="!schools.length"
                >
                  <option value="">Por defecto</option>
                  <option v-for="school in schools" :key="school.id" :value="school.id">
                    {{ school.name }}
                  </option>
                </select>
              </FormIconField>

              <div>
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Roles asignados
                </span>
                <FormMultiSelect
                  :key="`edit-roles-${editFormKey}`"
                  v-model="editRoleKeysModel"
                  :options="editRoleOptions"
                  :disabled="!editRoleOptions.length"
                  :icon="UserGroupIcon"
                  placeholder="Seleccionar roles…"
                />
                <div v-if="editReadOnlyRoles.length" class="mt-2 space-y-1.5">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="role in editReadOnlyRoles"
                      :key="`${role.key}-${role.institutionId ?? 'global'}`"
                      :class="personnelRoleBadgeClasses(role)"
                      :title="readOnlyRoleTitle(role)"
                    >
                      {{ role.label }}
                    </span>
                  </div>
                  <p v-if="editReadOnlyRoles.some((role) => role.roleCode === 'profesor')" class="text-xs text-muted">
                    El rol Profesor asignado por cátedra se gestiona desde
                    <RouterLink :to="config.estructuraRoute" class="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                      Colegios y Materias
                    </RouterLink>.
                  </p>
                </div>
              </div>
            </div>

            <UserProfileFormFields
              v-model="editForm.profile"
              id-prefix="edit-subordinate"
              variant="labeled"
              disable-autofill
            />

            <div class="flex flex-wrap gap-x-6 gap-y-3">
              <label class="inline-flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <input
                  v-model="editForm.isActive"
                  type="checkbox"
                  class="size-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                />
                Usuario activo
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <input
                  v-model="editForm.mustChangePassword"
                  type="checkbox"
                  class="size-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                />
                Requerir cambio de contraseña
              </label>
            </div>

            <FormIconField label="Nueva contraseña (opcional)" :icon="LockClosedIcon">
              <input
                v-model="editForm.password"
                :type="showEditPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                placeholder="Dejar vacío para no cambiar"
                :class="passwordInputClass"
              />
              <button
                type="button"
                class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                :aria-label="showEditPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showEditPassword = !showEditPassword"
              >
                <EyeSlashIcon v-if="showEditPassword" class="size-4" />
                <EyeIcon v-else class="size-4" />
              </button>
            </FormIconField>
            <p class="text-xs text-muted">
              La contraseña debe tener al menos 8 caracteres. Dejá el campo vacío para mantener la actual.
            </p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              @click="closeEditModal"
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
      title="Eliminar usuario"
      confirm-label="Eliminar"
      loading-label="Eliminando…"
      :loading="!!personToDelete && deletingUserId === personToDelete.id"
      :error="deleteError"
      @confirm="confirmDeletePerson"
    >
      ¿Querés eliminar a
      <span class="font-semibold text-gray-900 dark:text-white">{{ personToDelete?.displayName }}</span>?
      Esta acción no se puede deshacer.
    </ConfirmDialog>

    <RbacPersonnelBulkImportDialog
      v-model:open="showBulkImportModal"
      :institution-id="config.showInstitutionPicker ? selectedInstitutionId : undefined"
      :require-institution="config.showInstitutionPicker"
      :role-options="createRoleOptions"
      :import-rows="importPersonnelBulk"
      @completed="handleBulkImportCompleted"
    />
  </div>
</template>
