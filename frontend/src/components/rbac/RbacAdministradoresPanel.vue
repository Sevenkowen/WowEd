<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import {
  BuildingOffice2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import UserProfileFormFields from '@/components/UserProfileFormFields.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FormIconField from '@/components/FormIconField.vue'
import { useRbacAdministradores } from '@/composables/rbac/useRbacAdministradores'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

const showCreatePassword = ref(false)
const showEditPassword = ref(false)
const passwordInputClass = 'form-field w-full !pl-10 !pr-10'

const {
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
} = useRbacAdministradores()

watch(searchQuery, () => scheduleSearchReload())

watch(showCreateModal, (open) => {
  if (!open) showCreatePassword.value = false
})

watch(editingAdmin, (admin) => {
  if (!admin) showEditPassword.value = false
})

onMounted(() => {
  void initialize()
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col gap-6">
    <header class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        >
          <KeyIcon class="size-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Gestión de Administradores (Nivel SuperAdmin)
          </h2>
          <p class="mt-1 max-w-3xl text-sm text-muted">
            Creá administradores en el pool global y asignalos al dar de alta una institución. Los ya asignados
            aparecen en la misma lista con su institución correspondiente.
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
            <h3 class="heading-section">Administradores registrados</h3>
            <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
              {{ loading ? '…' : `${totalAdministrators} ${totalAdministrators === 1 ? 'resultado' : 'resultados'}` }}
            </span>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <div class="relative w-full min-w-[14rem] sm:w-72">
              <MagnifyingGlassIcon
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Buscar…"
                class="form-field w-full !pl-9"
              />
            </div>

            <button type="button" :class="['inline-flex items-center gap-2', gcalPrimaryBtn]" @click="openCreateModal">
              <PlusIcon class="size-4" />
              Crear administrador
            </button>
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full table-fixed divide-y divide-gray-200 dark:divide-white/10">
          <colgroup>
            <col class="w-14" />
            <col class="w-[28%]" />
            <col />
            <col class="w-36" />
            <col class="w-44" />
          </colgroup>
          <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950/40">
            <tr>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                #
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Administrador
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Institución
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Estado
              </th>
              <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/10">
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Cargando administradores…</td>
            </tr>
            <tr v-else-if="!administrators.length">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">No hay administradores registrados.</td>
            </tr>
            <tr
              v-for="(admin, index) in administrators"
              :key="admin.id"
              class="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5"
            >
              <td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                #{{ rowOffset + index + 1 }}
              </td>
              <td class="px-4 py-4">
                <p class="truncate font-medium text-gray-900 dark:text-white">{{ admin.displayName }}</p>
                <p class="mt-0.5 truncate text-xs text-muted">{{ admin.email }}</p>
              </td>
              <td class="px-4 py-4">
                <div class="flex min-w-0 items-center gap-2">
                  <BuildingOffice2Icon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <span class="truncate text-sm text-gray-700 dark:text-gray-300">
                    {{ admin.institutionName ?? '—' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    admin.isUnassigned
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  "
                >
                  {{ admin.isUnassigned ? 'Sin asignar' : 'Asignado' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-right">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    @click="openEditModal(admin)"
                  >
                    <PencilSquareIcon class="size-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
                    @click="confirmDeleteAdmin(admin)"
                  >
                    <TrashIcon class="size-4" />
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="visiblePages.length"
        class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-white/10"
      >
        <p class="text-sm text-muted">{{ paginationLabel }}</p>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            :disabled="page <= 1"
            aria-label="Página anterior"
            @click="goToPage(page - 1)"
          >
            <ChevronLeftIcon class="size-4" />
          </button>
          <button
            v-for="pageNumber in visiblePages"
            :key="pageNumber"
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors"
            :class="
              pageNumber === page
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'
            "
            @click="goToPage(pageNumber)"
          >
            {{ pageNumber }}
          </button>
          <button
            type="button"
            class="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            :disabled="page >= totalPages"
            aria-label="Página siguiente"
            @click="goToPage(page + 1)"
          >
            <ChevronRightIcon class="size-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- Create modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-admin-title"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h3 id="create-admin-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Crear administrador
            </h3>
            <p class="mt-1 text-sm text-muted">
              El administrador quedará disponible para asignarlo al crear una institución.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Cerrar"
            @click="closeCreateModal"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <form :key="createFormKey" class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitCreate">
          <div class="space-y-4 overflow-y-auto px-6 pb-5">
            <UserProfileFormFields
              :id-prefix="'create-admin'"
              v-model="createForm.profile"
              variant="labeled"
              disable-autofill
            />

            <FormIconField label="Contraseña *" html-for="create-admin-password">
              <div class="relative">
                <input
                  id="create-admin-password"
                  v-model="createForm.password"
                  required
                  minlength="8"
                  :type="showCreatePassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  :class="passwordInputClass"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  :aria-label="showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showCreatePassword = !showCreatePassword"
                >
                  <EyeSlashIcon v-if="showCreatePassword" class="size-4" />
                  <EyeIcon v-else class="size-4" />
                </button>
              </div>
            </FormIconField>
          </div>

          <div class="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-gray-200"
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
              {{ saving ? 'Creando…' : 'Crear administrador' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit modal -->
    <div
      v-if="editingAdmin"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-admin-title"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h3 id="edit-admin-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Editar administrador
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ editingAdmin.isUnassigned ? 'Sin institución asignada' : editingAdmin.institutionName }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Cerrar"
            @click="closeEditModal"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <form :key="editFormKey" class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitEdit">
          <div class="space-y-4 overflow-y-auto px-6 pb-5">
            <UserProfileFormFields
              :id-prefix="'edit-admin'"
              v-model="editForm.profile"
              variant="labeled"
              disable-autofill
            />

            <FormIconField label="Nueva contraseña (opcional)" html-for="edit-admin-password">
              <div class="relative">
                <input
                  id="edit-admin-password"
                  v-model="editForm.password"
                  minlength="8"
                  :type="showEditPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Dejar vacío para no cambiar"
                  :class="passwordInputClass"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  :aria-label="showEditPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showEditPassword = !showEditPassword"
                >
                  <EyeSlashIcon v-if="showEditPassword" class="size-4" />
                  <EyeIcon v-else class="size-4" />
                </button>
              </div>
            </FormIconField>
          </div>

          <div class="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-gray-200"
              @click="closeEditModal"
            >
              Cancelar
            </button>
            <button type="submit" :disabled="saving" :class="['disabled:opacity-60', gcalPrimaryBtn]">
              <CheckIcon class="size-4" />
              {{ saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Eliminar administrador"
      confirm-label="Eliminar"
      loading-label="Eliminando…"
      :loading="!!adminToDelete && deletingUserId === adminToDelete.id"
      :error="deleteError"
      @confirm="removeAdmin"
    >
      ¿Querés eliminar a
      <span class="font-semibold text-gray-900 dark:text-white">{{ adminToDelete?.displayName }}</span>?
    </ConfirmDialog>
  </div>
</template>
