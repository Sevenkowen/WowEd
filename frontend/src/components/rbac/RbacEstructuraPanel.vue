<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import {
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  IdentificationIcon,
  InformationCircleIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import FormIconField from '@/components/FormIconField.vue'
import UserProfileFormFields from '@/components/UserProfileFormFields.vue'
import { useRbacEstructura } from '@/composables/rbac/useRbacEstructura'
import { useSuperadminContext } from '@/composables/useSuperadminContext'
import type { RbacEstructuraModuleConfig, RbacEstructuraSection } from '@/types/rbac'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

const showCreateSchoolDialog = ref(false)

const inputIconClass = 'form-field w-full !pl-10'
const selectIconClass = 'form-field w-full appearance-none !pl-10 !pr-10'

const props = defineProps<{
  config: RbacEstructuraModuleConfig
  section: RbacEstructuraSection
}>()

const superadminCtx = props.config.showInstitutionPicker ? useSuperadminContext() : null

const sectionMeta = computed(() => {
  if (props.section === 'profesores') {
    return {
      title: 'Profesores',
      description: 'Alta, edición y baja de docentes por institución.',
      icon: UserGroupIcon,
    }
  }
  return {
    title: 'Colegios y Grados',
    description: 'Elegí una institución, creá sus colegios y administrá los grados de cada uno.',
    icon: BuildingOffice2Icon,
  }
})

const {
  config,
  loading,
  saving,
  error,
  institutions,
  selectedInstitutionId,
  activeInstitutionId,
  selectedInstitutionName,
  editingSchool,
  managingSchool,
  editingTeacher,
  schoolForm,
  editSchoolForm,
  gradeForm,
  teacherForm,
  editTeacherForm,
  filteredSchoolRows,
  gradesForManagingSchool,
  gradeCountBySchoolId,
  teacherRows,
  teacherInstitutionOptions,
  directorsForSchoolForm,
  directorsForEditSchool,
  submitSchool,
  resetCreateSchoolForm,
  openEditSchool,
  closeEditSchool,
  saveEditSchool,
  removeSchool,
  openSchoolGradesDialog,
  closeSchoolGradesDialog,
  submitGrade,
  submitTeacher,
  openEditTeacher,
  closeEditTeacher,
  saveEditTeacher,
  removeTeacher,
} = useRbacEstructura(toRef(props, 'config'))

if (superadminCtx) {
  void superadminCtx.loadInstitutions()
  watch(
    () => superadminCtx.selectedInstitutionId.value,
    (id) => {
      if (id) selectedInstitutionId.value = id
    },
    { immediate: true },
  )
  watch(selectedInstitutionId, (id) => {
    if (id && superadminCtx.selectedInstitutionId.value !== id) {
      superadminCtx.selectedInstitutionId.value = id
    }
  })
}

function openCreateSchoolDialog() {
  resetCreateSchoolForm()
  showCreateSchoolDialog.value = true
}

function closeCreateSchoolDialog() {
  showCreateSchoolDialog.value = false
  resetCreateSchoolForm()
}

async function handleCreateSchool() {
  const created = await submitSchool()
  if (created) closeCreateSchoolDialog()
}

function schoolShiftLabels(school: { shiftMorning?: boolean; shiftAfternoon?: boolean; shiftNight?: boolean }): string {
  const labels: string[] = []
  if (school.shiftMorning) labels.push('Mañana')
  if (school.shiftAfternoon) labels.push('Tarde')
  if (school.shiftNight) labels.push('Noche')
  return labels.length ? labels.join(' · ') : 'Sin turnos'
}
</script>

<template>
  <div class="w-full space-y-6">
    <header class="flex flex-wrap items-start gap-3">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
      >
        <component :is="sectionMeta.icon" class="size-6" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Colegios y Materias</p>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ sectionMeta.title }}</h2>
        <p class="mt-1 text-sm text-muted">{{ sectionMeta.description }}</p>
      </div>
    </header>

    <p
      v-if="error"
      class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {{ error }}
    </p>

    <!-- Colegios + Grados -->
    <template v-if="section === 'colegios'">
      <section class="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-500/30 dark:bg-indigo-950/20">
        <div class="flex flex-wrap items-end gap-3">
          <label v-if="config.showInstitutionPicker" class="block min-w-[220px] flex-1 space-y-2">
            <span class="text-sm font-medium text-gray-900 dark:text-white">Institución</span>
            <select v-model="selectedInstitutionId" class="form-field w-full max-w-xl">
              <option value="" disabled>Seleccionar institución…</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
            </select>
          </label>
          <div v-else class="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <BuildingOffice2Icon class="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span class="font-medium text-gray-900 dark:text-white">{{ selectedInstitutionName || 'Institución' }}</span>
          </div>
          <button
            type="button"
            :disabled="!activeInstitutionId"
            :class="['inline-flex shrink-0 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50', gcalPrimaryBtn]"
            @click="openCreateSchoolDialog"
          >
            <PlusIcon class="size-4" />
            Nuevo colegio
          </button>
        </div>
        <p v-if="activeInstitutionId" class="mt-3 text-sm text-muted">
          {{ filteredSchoolRows.length }} colegio(s) en esta institución. Hacé clic en una card para gestionar sus grados.
        </p>
        <p v-else class="mt-3 text-sm text-muted">Seleccioná una institución para ver y crear colegios.</p>
      </section>

      <section class="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <h3 class="heading-section">Colegios de la institución</h3>
          <span v-if="activeInstitutionId && !loading" class="text-xs text-muted">
            {{ filteredSchoolRows.length }} colegio(s)
          </span>
        </div>

        <div class="p-5">
          <p v-if="loading" class="py-10 text-center text-sm text-muted">Cargando colegios…</p>
          <p v-else-if="!activeInstitutionId" class="py-10 text-center text-sm text-muted">
            Seleccioná una institución para ver sus colegios.
          </p>
          <p v-else-if="!filteredSchoolRows.length" class="py-10 text-center text-sm text-muted">
            Todavía no hay colegios en esta institución. Usá <span class="font-medium text-gray-800 dark:text-gray-200">Nuevo colegio</span> para registrar el primero.
          </p>

          <ul v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list">
            <li v-for="school in filteredSchoolRows" :key="school.id">
              <article
                class="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-gray-950/40 dark:hover:border-indigo-500/40"
              >
                <button
                  type="button"
                  class="flex flex-1 flex-col text-left"
                  @click="openSchoolGradesDialog(school)"
                >
                  <div class="flex items-start gap-3">
                    <span class="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <BuildingOffice2Icon class="size-6" aria-hidden="true" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <h4 class="font-semibold text-gray-900 dark:text-white">{{ school.name }}</h4>
                      <p class="mt-1 line-clamp-2 text-sm text-muted">
                        {{
                          [school.city, school.province].filter(Boolean).join(', ') ||
                          (school.contactLines[0] !== 'Sin datos de contacto' ? school.contactLines[0] : 'Sin ubicación registrada')
                        }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-white/10">
                    <div class="flex items-center justify-between gap-2 text-sm">
                      <span class="text-muted">Turnos</span>
                      <span class="truncate font-medium text-gray-800 dark:text-gray-200">
                        {{ schoolShiftLabels(school) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between gap-2 text-sm">
                      <span class="text-muted">Director</span>
                      <span class="truncate font-medium text-gray-800 dark:text-gray-200">
                        {{ school.directorName ?? 'Sin asignar' }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm text-muted">Grados</span>
                      <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <BookOpenIcon class="size-3.5" />
                        {{ gradeCountBySchoolId[school.id] ?? 0 }}
                      </span>
                    </div>
                  </div>
                </button>

                <div class="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                    @click="openSchoolGradesDialog(school)"
                  >
                    Gestionar grados
                    <ChevronRightIcon class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    title="Editar colegio"
                    @click="openEditSchool(school)"
                  >
                    <PencilSquareIcon class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
                    title="Eliminar colegio"
                    @click="removeSchool(school)"
                  >
                    <TrashIcon class="size-4" />
                  </button>
                </div>
              </article>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <!-- Profesores -->
    <template v-else>
      <section class="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div class="border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <h3 class="heading-section">Nuevo profesor</h3>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="submitTeacher">
          <div class="grid gap-4 lg:grid-cols-2">
            <select
              v-if="config.showInstitutionPicker"
              v-model="teacherForm.institutionId"
              required
              class="form-field w-full"
            >
              <option value="" disabled>Institución</option>
              <option v-for="inst in teacherInstitutionOptions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
            </select>
            <input
              v-model="teacherForm.subject"
              required
              placeholder="Materia o especialidad (ej. Matemática)"
              class="form-field w-full"
            />
          </div>
          <UserProfileFormFields v-model="teacherForm.profile" require-all-fields />
          <input
            v-model="teacherForm.password"
            type="password"
            required
            minlength="8"
            placeholder="Contraseña inicial (mín. 8 caracteres)"
            class="form-field w-full"
          />
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="saving"
              class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {{ saving ? 'Guardando…' : 'Registrar profesor' }}
            </button>
          </div>
        </form>
      </section>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <h3 class="heading-section">Profesores registrados</h3>
          <span class="text-xs text-muted">{{ teacherRows.length }} registros</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead class="bg-gray-50 dark:bg-gray-950/40">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Profesor</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Materia</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Institución</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Email</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/10">
              <tr v-if="loading">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Cargando…</td>
              </tr>
              <tr v-for="teacher in teacherRows" v-else :key="teacher.membershipId">
                <td class="px-4 py-4 font-medium text-gray-900 dark:text-white">{{ teacher.displayName }}</td>
                <td class="px-4 py-4 text-sm text-gray-800 dark:text-gray-200">{{ teacher.subject ?? '—' }}</td>
                <td class="px-4 py-4 text-sm text-muted">{{ teacher.institutionName }}</td>
                <td class="px-4 py-4 text-sm text-muted">{{ teacher.email }}</td>
                <td class="px-4 py-4 text-right">
                  <div class="inline-flex gap-2">
                    <button type="button" class="text-xs font-medium text-indigo-600 hover:text-indigo-700" @click="openEditTeacher(teacher)">
                      Editar
                    </button>
                    <button type="button" class="text-xs font-medium text-red-600 hover:text-red-700" @click="removeTeacher(teacher)">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && !teacherRows.length">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Sin profesores registrados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- Diálogo: nuevo colegio -->
    <div
      v-if="showCreateSchoolDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeCreateSchoolDialog"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="create-school-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
            >
              <AcademicCapIcon class="size-6" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h3 id="create-school-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Nuevo colegio
              </h3>
              <p class="mt-1 text-sm text-muted">
                Se registrará en
                <span class="font-medium text-gray-800 dark:text-gray-200">{{ selectedInstitutionName }}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Cerrar"
            @click="closeCreateSchoolDialog"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <div class="border-b border-gray-200 dark:border-white/10" />

        <form class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5" @submit.prevent="handleCreateSchool">
          <div class="space-y-4">
            <FormIconField
              label="Nombre del colegio *"
              :icon="AcademicCapIcon"
              html-for="create-school-name"
              label-position="outside"
            >
              <input
                id="create-school-name"
                v-model="schoolForm.name"
                required
                placeholder="Ej. Colegio San Martín"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="Director asociado (opcional)"
              :icon="UserGroupIcon"
              html-for="create-school-director"
              label-position="outside"
            >
              <select
                id="create-school-director"
                v-model="schoolForm.directorMembershipId"
                :class="selectIconClass"
              >
                <option value="">-- Sin director --</option>
                <option v-for="d in directorsForSchoolForm" :key="d.membershipId" :value="d.membershipId">
                  {{ d.displayName }}
                </option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            </FormIconField>

            <FormIconField
              label="Provincia / estado (opcional)"
              :icon="MapPinIcon"
              html-for="create-school-province"
              label-position="outside"
            >
              <input
                id="create-school-province"
                v-model="schoolForm.province"
                placeholder="Ej. Santa Fe, Buenos Aires…"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="Dirección (opcional)"
              :icon="MapPinIcon"
              html-for="create-school-address"
              label-position="outside"
            >
              <input
                id="create-school-address"
                v-model="schoolForm.address"
                placeholder="Calle y número"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="Teléfono (opcional)"
              :icon="PhoneIcon"
              html-for="create-school-phone"
              label-position="outside"
            >
              <input
                id="create-school-phone"
                v-model="schoolForm.phone"
                type="tel"
                placeholder="Ej. +54 11 1234-5678"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="Email de contacto (opcional)"
              :icon="EnvelopeIcon"
              html-for="create-school-email"
              label-position="outside"
            >
              <input
                id="create-school-email"
                v-model="schoolForm.email"
                type="email"
                placeholder="contacto@colegio.edu.ar"
                :class="inputIconClass"
              />
            </FormIconField>

            <FormIconField
              label="CUIT (opcional)"
              :icon="IdentificationIcon"
              html-for="create-school-cuit"
              label-position="outside"
            >
              <input
                id="create-school-cuit"
                v-model="schoolForm.cuit"
                placeholder="Ej. 30-71234567-8"
                :class="inputIconClass"
              />
            </FormIconField>

            <div class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Turnos (opcional)
              </span>
              <div class="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-white/10 dark:bg-gray-950/40">
                <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <input
                    v-model="schoolForm.shiftMorning"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                  />
                  Turno mañana
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <input
                    v-model="schoolForm.shiftAfternoon"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                  />
                  Turno tarde
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <input
                    v-model="schoolForm.shiftNight"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                  />
                  Turno noche
                </label>
              </div>
            </div>
          </div>

          <div
            class="mt-6 flex gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-950/30"
          >
            <InformationCircleIcon
              class="size-5 shrink-0 text-indigo-600 dark:text-indigo-400"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Podés completar más datos</p>
              <p class="mt-0.5 text-sm text-muted">
                Siempre podrás editar el colegio y asignar un director desde la card correspondiente.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
              @click="closeCreateSchoolDialog"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="saving"
              :class="['disabled:opacity-60', gcalPrimaryBtn]"
            >
              <CheckIcon class="size-4" />
              {{ saving ? 'Guardando…' : 'Registrar colegio' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Diálogo grande: grados del colegio -->
    <div
      v-if="managingSchool"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeSchoolGradesDialog"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
        role="dialog"
        aria-labelledby="school-grades-title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-white/10">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ managingSchool.institutionName }}</p>
            <h3 id="school-grades-title" class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ managingSchool.name }}
            </h3>
            <p class="mt-1 text-sm text-muted">Grados y cursos de este colegio</p>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
            aria-label="Cerrar"
            @click="closeSchoolGradesDialog"
          >
            <XMarkIcon class="size-5" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form class="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-950/40" @submit.prevent="submitGrade">
            <div class="min-w-[220px] flex-1">
              <label for="new-grade-name" class="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                Nuevo grado / curso
              </label>
              <input
                id="new-grade-name"
                v-model="gradeForm.name"
                required
                placeholder="Ej. 1° A, 2° B, 3° C"
                class="form-field w-full"
              />
            </div>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {{ saving ? 'Guardando…' : 'Agregar grado' }}
            </button>
          </form>

          <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead class="bg-gray-50 dark:bg-gray-950/40">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Grado / Curso</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Asignaciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/10">
                <tr v-for="grade in gradesForManagingSchool" :key="grade.id">
                  <td class="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">{{ grade.name }}</td>
                  <td class="px-4 py-3 text-sm text-muted">{{ grade.subjectCount }} profesor(es)</td>
                </tr>
                <tr v-if="!gradesForManagingSchool.length">
                  <td colspan="2" class="px-4 py-8 text-center text-sm text-muted">
                    Este colegio todavía no tiene grados. Agregá el primero arriba.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer class="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-white/10">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-gray-200"
            @click="closeSchoolGradesDialog"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>

    <!-- Editar colegio -->
    <div
      v-if="editingSchool"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEditSchool"
    >
      <div class="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Editar colegio</h3>
        <p class="mt-1 text-sm text-muted">{{ editingSchool.institutionName }}</p>
        <form class="mt-4 space-y-3" @submit.prevent="saveEditSchool">
          <input v-model="editSchoolForm.name" required placeholder="Nombre" class="form-field w-full" />
          <label class="block space-y-1">
            <span class="text-sm font-medium text-gray-900 dark:text-white">Director</span>
            <select v-model="editSchoolForm.directorMembershipId" class="form-field w-full">
              <option value="">-- Sin director --</option>
              <option v-for="d in directorsForEditSchool" :key="d.membershipId" :value="d.membershipId">
                {{ d.displayName }}
              </option>
            </select>
            <span class="text-xs text-muted">Un director puede estar asignado a uno o más colegios de la institución.</span>
          </label>
          <input v-model="editSchoolForm.province" placeholder="Provincia / estado" class="form-field w-full" />
          <input v-model="editSchoolForm.address" placeholder="Dirección" class="form-field w-full" />
          <input v-model="editSchoolForm.phone" placeholder="Teléfono" class="form-field w-full" />
          <input v-model="editSchoolForm.email" type="email" placeholder="Email" class="form-field w-full" />
          <input v-model="editSchoolForm.cuit" placeholder="CUIT" class="form-field w-full" />
          <fieldset class="space-y-2">
            <legend class="text-sm font-medium text-gray-900 dark:text-white">Turnos</legend>
            <div class="flex flex-wrap gap-4">
              <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input v-model="editSchoolForm.shiftMorning" type="checkbox" class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Turno mañana
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input v-model="editSchoolForm.shiftAfternoon" type="checkbox" class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Turno tarde
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input v-model="editSchoolForm.shiftNight" type="checkbox" class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Turno noche
              </label>
            </div>
          </fieldset>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-gray-200" @click="closeEditSchool">
              Cancelar
            </button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Editar profesor -->
    <div
      v-if="editingTeacher"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEditTeacher"
    >
      <div class="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Editar profesor</h3>
        <p class="mt-1 text-sm text-muted">{{ editingTeacher.institutionName }}</p>
        <form class="mt-4 space-y-3" @submit.prevent="saveEditTeacher">
          <input v-model="editTeacherForm.subject" required placeholder="Materia o especialidad" class="form-field w-full" />
          <UserProfileFormFields v-model="editTeacherForm.profile" />
          <input v-model="editTeacherForm.password" type="password" minlength="8" placeholder="Nueva contraseña (opcional)" class="form-field w-full" />
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-gray-200" @click="closeEditTeacher">
              Cancelar
            </button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
