<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import {
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'
import RbacModuleAccessPicker from '@/components/rbac/RbacModuleAccessPicker.vue'
import { useRbacRoles } from '@/composables/rbac/useRbacRoles'
import {
  systemRoleChipClasses,
  systemRoleIconClasses,
  type FixedPlatformRoleCode,
} from '@/data/fixedPlatformRoles'
import { useAuth } from '@/composables/useAuth'
import type { RbacRolesModuleConfig } from '@/types/rbac'

const props = defineProps<{
  config: RbacRolesModuleConfig
}>()

const { user } = useAuth()

const {
  config,
  error,
  loading,
  saving,
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
  systemRoles,
  customRoles,
  visibleCustomRoles,
  customRoleSearchQuery,
  openCreateModal,
  openEditModal,
  openModulesModal,
  closeModal,
  closeModulesModal,
  submitRole,
  removeRole,
} = useRbacRoles(toRef(props, 'config'))

const subtitle = computed(() => {
  if (config.value.scope === 'institution' && user.value?.institution_name) {
    return config.value.subtitle.replace('tu institución', user.value.institution_name)
  }
  return config.value.subtitle
})

function moduleCountLabel(count: number): string {
  return count === 1 ? '1 módulo' : `${count} módulos`
}

const SYSTEM_ROLE_ICONS: Record<FixedPlatformRoleCode, Component> = {
  superadmin: ShieldCheckIcon,
  administrador: UserGroupIcon,
  director: BriefcaseIcon,
  profesor: AcademicCapIcon,
}

function systemRoleIcon(roleCode?: string | null): Component {
  if (roleCode && roleCode in SYSTEM_ROLE_ICONS) {
    return SYSTEM_ROLE_ICONS[roleCode as FixedPlatformRoleCode]
  }
  return ShieldCheckIcon
}

const CUSTOM_ROLE_ROW_HEIGHT = 48
const MIN_CUSTOM_ROLE_PAGE_SIZE = 4

const customRolesListViewportRef = ref<HTMLElement | null>(null)
const systemRolesDetailsRef = ref<HTMLDetailsElement | null>(null)
const customRolePage = ref(1)
const customRolePageSize = ref(8)

const totalFilteredCustomRoles = computed(() => visibleCustomRoles.value.length)

const totalCustomRolePages = computed(() =>
  Math.max(1, Math.ceil(totalFilteredCustomRoles.value / customRolePageSize.value)),
)

const paginatedCustomRoles = computed(() => {
  const start = (customRolePage.value - 1) * customRolePageSize.value
  return visibleCustomRoles.value.slice(start, start + customRolePageSize.value)
})

const customRolesPaginationLabel = computed(() => {
  const total = totalFilteredCustomRoles.value
  if (!total) return 'Sin resultados'
  const start = (customRolePage.value - 1) * customRolePageSize.value + 1
  const end = Math.min(customRolePage.value * customRolePageSize.value, total)
  return `Mostrando ${start}–${end} de ${total}`
})

const customRoleVisiblePages = computed(() => {
  const total = totalCustomRolePages.value
  if (total <= 1) return [] as number[]

  const maxButtons = 5
  let start = Math.max(1, customRolePage.value - Math.floor(maxButtons / 2))
  let end = Math.min(total, start + maxButtons - 1)
  start = Math.max(1, end - maxButtons + 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

let customRolesResizeObserver: ResizeObserver | null = null

function updateCustomRolePageSize() {
  const viewport = customRolesListViewportRef.value
  if (!viewport) return

  const height = viewport.clientHeight
  if (height <= 0) return

  const nextPageSize = Math.max(
    MIN_CUSTOM_ROLE_PAGE_SIZE,
    Math.floor(height / CUSTOM_ROLE_ROW_HEIGHT),
  )

  if (nextPageSize !== customRolePageSize.value) {
    customRolePageSize.value = nextPageSize
  }
}

function scheduleCustomRolesLayoutUpdate() {
  void nextTick(() => updateCustomRolePageSize())
}

function goToCustomRolePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalCustomRolePages.value || nextPage === customRolePage.value) {
    return
  }
  customRolePage.value = nextPage
}

watch(customRolePageSize, () => {
  if (customRolePage.value > totalCustomRolePages.value) {
    customRolePage.value = totalCustomRolePages.value
  }
})

watch([customRoleSearchQuery, selectedInstitutionId, customRoles], () => {
  customRolePage.value = 1
})

watch(totalFilteredCustomRoles, () => {
  if (customRolePage.value > totalCustomRolePages.value) {
    customRolePage.value = totalCustomRolePages.value
  }
})

watch([loading, totalFilteredCustomRoles], () => {
  scheduleCustomRolesLayoutUpdate()
})

watch(customRolesListViewportRef, (element, _, onCleanup) => {
  if (!customRolesResizeObserver) return

  if (element) {
    customRolesResizeObserver.observe(element)
    scheduleCustomRolesLayoutUpdate()
  }

  onCleanup(() => {
    if (element) customRolesResizeObserver?.unobserve(element)
  })
})

watch(systemRolesDetailsRef, (element, _, onCleanup) => {
  if (!customRolesResizeObserver || !element) return

  customRolesResizeObserver.observe(element)
  scheduleCustomRolesLayoutUpdate()

  onCleanup(() => {
    customRolesResizeObserver?.unobserve(element)
  })
})

onMounted(() => {
  customRolesResizeObserver = new ResizeObserver(() => updateCustomRolePageSize())
  if (customRolesListViewportRef.value) {
    customRolesResizeObserver.observe(customRolesListViewportRef.value)
    scheduleCustomRolesLayoutUpdate()
  }
})

onUnmounted(() => {
  customRolesResizeObserver?.disconnect()
  customRolesResizeObserver = null
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-6">
    <header class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        >
          <ShieldCheckIcon class="size-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Gestión de Roles Institucionales</h2>
          <p class="mt-1 max-w-3xl text-sm text-muted">{{ subtitle }}</p>
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
    </header>

    <p
      v-if="error"
      class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {{ error }}
    </p>

    <!-- Roles del sistema (fijos) -->
    <details
      ref="systemRolesDetailsRef"
      class="system-roles-details group shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white open:shadow-sm dark:border-white/10 dark:bg-gray-900"
      open
      @toggle="scheduleCustomRolesLayoutUpdate"
    >
      <summary
        class="flex cursor-pointer items-center gap-3 bg-gray-50 px-5 py-4 transition-colors hover:bg-gray-100/80 dark:bg-gray-950/50 dark:hover:bg-gray-950/70"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="heading-section">Roles del sistema</span>
            <span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-300">
              {{ loading ? '…' : systemRoles.length }}
            </span>
          </div>
          <p class="mt-1 text-sm text-muted">
            Roles base de la plataforma. No pueden modificarse.
          </p>
        </div>

        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
          aria-hidden="true"
        >
          <ChevronRightIcon class="system-roles-toggle-closed size-4" />
          <ChevronDownIcon class="system-roles-toggle-open size-4" />
        </span>
      </summary>

      <div id="system-roles-list">
        <div v-if="loading" class="px-4 py-4 text-center text-sm text-muted">
          Cargando roles…
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-white/10">
          <div
            v-for="role in systemRoles"
            :key="role.id"
            class="flex items-center gap-2.5 px-4 py-2"
          >
            <div
              class="flex size-8 shrink-0 items-center justify-center rounded-md"
              :class="systemRoleIconClasses(role.roleCode)"
            >
              <component :is="systemRoleIcon(role.roleCode)" class="size-4" aria-hidden="true" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex min-w-0 items-baseline gap-2">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ role.name }}</p>
                <p v-if="role.description" class="hidden truncate text-xs text-muted sm:block">{{ role.description }}</p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors hover:opacity-90"
                :class="systemRoleChipClasses(role.roleCode)"
                @click="openModulesModal(role)"
              >
                <EyeIcon class="size-3" />
                {{ moduleCountLabel(role.allowedModules?.length ?? 0) }}
              </button>
              <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
                {{ role.scopeLabel }}
              </span>
            </div>

            <LockClosedIcon
              class="size-4 shrink-0 text-gray-400 dark:text-gray-500"
              aria-label="Rol no modificable"
            />
          </div>
        </div>
      </div>
    </details>

    <!-- Roles personalizados -->
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
      <div class="shrink-0 border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/10 dark:bg-gray-950/50">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="heading-section">Roles personalizados</h3>
              <span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                {{ loading ? '…' : customRoles.length }}
              </span>
            </div>
            <p class="mt-1 text-sm text-muted">
              Roles creados para esta institución
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <label v-if="!loading && customRoles.length" class="relative w-full max-w-sm sm:w-80">
              <span class="sr-only">Buscar roles personalizados</span>
              <MagnifyingGlassIcon
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <input
                v-model="customRoleSearchQuery"
                type="search"
                placeholder="Buscar por nombre o descripción…"
                class="form-field w-full !py-2.5 !pl-10"
                autocomplete="off"
              />
            </label>

            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canCreateRole"
              :title="canCreateRole ? 'Crear rol personalizado' : 'Seleccioná una institución'"
              @click="openCreateModal"
            >
              <PlusIcon class="size-4" />
              Nuevo Rol Personalizado
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted">
        Cargando roles…
      </div>

      <div
        v-else-if="!customRoles.length"
        class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted"
      >
        {{
          config.showInstitutionPicker && !selectedInstitutionId
            ? 'Seleccioná una institución para ver sus roles personalizados.'
            : 'No hay roles personalizados en esta institución. Creá uno con el botón «Nuevo Rol Personalizado».'
        }}
      </div>

      <div
        v-else-if="!visibleCustomRoles.length"
        class="flex flex-1 items-center justify-center px-4 py-4 text-center text-sm text-muted"
      >
        No se encontraron roles para tu búsqueda.
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div
          ref="customRolesListViewportRef"
          class="min-h-0 flex-1 overflow-hidden"
        >
          <div class="divide-y divide-gray-100 dark:divide-white/10">
            <div
              v-for="role in paginatedCustomRoles"
              :key="role.id"
              class="flex h-12 items-center gap-2.5 px-4 hover:bg-gray-50/80 dark:hover:bg-white/5"
            >
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
          >
            <ShieldCheckIcon class="size-4" aria-hidden="true" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-baseline gap-2">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ role.name }}</p>
              <p v-if="role.description" class="hidden truncate text-xs text-muted sm:block">{{ role.description }}</p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
              @click="openModulesModal(role)"
            >
              <EyeIcon class="size-3" />
              {{ moduleCountLabel(role.allowedModules?.length ?? 0) }}
            </button>
            <span class="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {{ role.scopeLabel }}
            </span>
          </div>

          <div class="inline-flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-indigo-400"
              title="Editar rol"
              @click="openEditModal(role)"
            >
              <PencilSquareIcon class="size-4" />
              <span class="sr-only">Editar</span>
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              title="Eliminar rol"
              @click="removeRole(role)"
            >
              <TrashIcon class="size-4" />
              <span class="sr-only">Eliminar</span>
            </button>
          </div>
            </div>
          </div>
        </div>

        <div
          v-if="totalFilteredCustomRoles > 0"
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10"
        >
          <p class="text-sm text-muted">{{ customRolesPaginationLabel }}</p>
          <nav
            v-if="totalCustomRolePages > 1"
            class="flex flex-wrap items-center gap-1"
            aria-label="Paginación de roles personalizados"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              :disabled="loading || customRolePage <= 1"
              aria-label="Página anterior"
              @click="goToCustomRolePage(customRolePage - 1)"
            >
              <ChevronLeftIcon class="size-4" />
            </button>
            <button
              v-for="pageNumber in customRoleVisiblePages"
              :key="pageNumber"
              type="button"
              class="min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                pageNumber === customRolePage
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'
              "
              :disabled="loading"
              :aria-current="pageNumber === customRolePage ? 'page' : undefined"
              @click="goToCustomRolePage(pageNumber)"
            >
              {{ pageNumber }}
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              :disabled="loading || customRolePage >= totalCustomRolePages"
              aria-label="Página siguiente"
              @click="goToCustomRolePage(customRolePage + 1)"
            >
              <ChevronRightIcon class="size-4" />
            </button>
          </nav>
        </div>
      </div>
    </section>

    <!-- Crear / editar rol personalizado -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeModal">
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900" role="dialog" :aria-labelledby="editingRole ? 'edit-role-title' : 'create-role-title'">
        <div class="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 :id="editingRole ? 'edit-role-title' : 'create-role-title'" class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ editingRole ? 'Editar rol personalizado' : 'Nuevo rol personalizado' }}
          </h3>
          <p v-if="!editingRole && config.showInstitutionPicker && selectedInstitutionName" class="mt-1 text-sm text-muted">
            Se creará en <span class="font-medium text-gray-800 dark:text-gray-200">{{ selectedInstitutionName }}</span>
          </p>
          <p v-else-if="editingRole" class="mt-1 text-sm text-muted">
            {{ editingRole.scopeLabel }}
          </p>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitRole">
          <div class="scrollbar-sidebar space-y-4 overflow-y-auto px-6 py-5">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del rol</span>
              <input v-model="roleForm.name" required placeholder="Ej. Bibliotecario" class="form-field w-full" />
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</span>
              <textarea v-model="roleForm.description" rows="2" placeholder="Descripción opcional del rol" class="form-field w-full resize-y" />
            </label>

            <div>
              <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Módulos permitidos</span>
              <p class="mb-3 text-xs text-muted">Seleccioná a qué secciones de la aplicación tendrá acceso este rol.</p>
              <RbacModuleAccessPicker v-model="roleForm.allowedModules" :scope-filter="moduleScopeFilter" />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/10">
            <button type="button" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5" @click="closeModal">Cancelar</button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {{ saving ? 'Guardando…' : editingRole ? 'Guardar cambios' : 'Crear rol' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Ver módulos (solo lectura para roles de sistema) -->
    <div v-if="showModulesModal && viewingRole" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeModulesModal">
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900" role="dialog" aria-labelledby="view-modules-title">
        <div class="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 id="view-modules-title" class="text-lg font-semibold text-gray-900 dark:text-white">
            Módulos — {{ viewingRole.name }}
          </h3>
          <p v-if="viewingRole.isSystemReserved" class="mt-1 text-sm text-muted">
            Rol reservado del sistema. Los accesos son fijos y no se pueden modificar.
          </p>
        </div>
        <div class="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <RbacModuleAccessPicker
            :model-value="viewingRole.allowedModules ?? []"
            readonly
            :scope-filter="moduleScopeFilter"
          />
        </div>
        <div class="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-white/10">
          <button type="button" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5" @click="closeModulesModal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-roles-details summary {
  list-style: none;
}

.system-roles-details summary::-webkit-details-marker {
  display: none;
}

.system-roles-toggle-open {
  display: none;
}

.system-roles-toggle-closed {
  display: block;
}

.system-roles-details[open] .system-roles-toggle-open {
  display: block;
}

.system-roles-details[open] .system-roles-toggle-closed {
  display: none;
}

.system-roles-details[open] > summary {
  border-bottom-width: 1px;
  border-bottom-color: rgb(229 231 235);
}

.dark .system-roles-details[open] > summary {
  border-bottom-color: rgb(255 255 255 / 0.1);
}
</style>
