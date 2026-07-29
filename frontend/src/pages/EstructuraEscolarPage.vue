<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  createAssignment,
  createClassroom,
  createProgram,
  createTeacher,
  deleteAssignment,
  fetchAssignments,
  fetchClassrooms,
  fetchPrograms,
  fetchTeachers,
  type Assignment,
  type Classroom,
  type Program,
  type Teacher,
} from '@/api/structureApi'
import { useAuth, getAuthInstitutionId } from '@/composables/useAuth'
import UserProfileFormFields from '@/components/UserProfileFormFields.vue'
import { emptyUserProfile } from '@/types/userProfile'
import {
  EDUCATION_PROGRAM_SHIFT_HELP,
  EDUCATION_PROGRAM_SHIFT_PLACEHOLDER,
  educationProgramShiftTitle,
  formatEducationProgramLabel,
} from '@/utils/educationProgram'

const { displayName } = useAuth()

function instId(): string {
  const id = getAuthInstitutionId()
  if (!id) throw new Error('Institución no configurada')
  return id
}

const loading = ref(true)
const error = ref<string | null>(null)
const selectedProgramId = ref('')

const programs = ref<Program[]>([])
const classrooms = ref<Classroom[]>([])
const teachers = ref<Teacher[]>([])
const assignments = ref<Assignment[]>([])

const programForm = ref({ educationLevel: '', shift: 'General' })
const classroomForm = ref({ name: '' })
const teacherProfile = ref(emptyUserProfile())
const teacherPassword = ref('')
const teacherSubject = ref('')
const assignmentForm = ref({ classroomId: '', teacherUserId: '' })

const selectedProgram = computed(() => programs.value.find((p) => p.id === selectedProgramId.value) ?? null)

const savingProgram = ref(false)
const savingClassroom = ref(false)
const savingTeacher = ref(false)
const savingAssignment = ref(false)

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    programs.value = await fetchPrograms(instId())
    if (!selectedProgramId.value && programs.value.length) {
      selectedProgramId.value = programs.value[0].id
    }
    await loadProgramData()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar la estructura escolar'
  } finally {
    loading.value = false
  }
}

async function loadProgramData() {
  const pid = selectedProgramId.value || undefined
  classrooms.value = await fetchClassrooms(instId(), pid)
  teachers.value = await fetchTeachers(instId(), pid)
  assignments.value = await fetchAssignments(instId(), pid)
}

watch(selectedProgramId, async () => {
  if (!selectedProgramId.value) return
  try {
    await loadProgramData()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar datos del nivel'
  }
})

async function submitProgram() {
  if (!programForm.value.educationLevel.trim()) return
  savingProgram.value = true
  error.value = null
  try {
    const created = await createProgram(instId(), {
      educationLevel: programForm.value.educationLevel.trim(),
      shift: programForm.value.shift.trim() || 'General',
    })
    programForm.value = { educationLevel: '', shift: 'General' }
    programs.value = await fetchPrograms(instId())
    selectedProgramId.value = created.id
    await loadProgramData()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo crear el nivel'
  } finally {
    savingProgram.value = false
  }
}

async function submitClassroom() {
  if (!selectedProgramId.value || !classroomForm.value.name.trim()) return
  savingClassroom.value = true
  error.value = null
  try {
    await createClassroom(instId(), {
      programId: selectedProgramId.value,
      name: classroomForm.value.name.trim(),
    })
    classroomForm.value = { name: '' }
    await loadProgramData()
    programs.value = await fetchPrograms(instId())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo crear el aula'
  } finally {
    savingClassroom.value = false
  }
}

async function submitTeacher() {
  if (!selectedProgramId.value || !teacherPassword.value || !teacherSubject.value) return
  savingTeacher.value = true
  error.value = null
  try {
    await createTeacher(instId(), {
      ...teacherProfile.value,
      programId: selectedProgramId.value,
      subject: teacherSubject.value.trim(),
      password: teacherPassword.value,
    })
    teacherProfile.value = emptyUserProfile()
    teacherPassword.value = ''
    teacherSubject.value = ''
    await loadProgramData()
    programs.value = await fetchPrograms(instId())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo crear el docente'
  } finally {
    savingTeacher.value = false
  }
}

async function submitAssignment() {
  if (!assignmentForm.value.classroomId || !assignmentForm.value.teacherUserId) return
  savingAssignment.value = true
  error.value = null
  try {
    await createAssignment(instId(), {
      classroomId: assignmentForm.value.classroomId,
      teacherUserId: assignmentForm.value.teacherUserId,
    })
    assignmentForm.value = { classroomId: '', teacherUserId: '' }
    await loadProgramData()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo asignar el docente'
  } finally {
    savingAssignment.value = false
  }
}

async function removeAssignment(id: string) {
  error.value = null
  try {
    await deleteAssignment(instId(), id)
    await loadProgramData()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo eliminar la asignación'
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="mx-auto flex h-full max-w-6xl flex-col gap-6 overflow-y-auto p-6">
    <header>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Estructura escolar</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ displayName }} — configurá niveles, aulas, docentes y asignaciones.
      </p>
    </header>

    <p v-if="error" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {{ error }}
    </p>

    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>

    <template v-else>
      <!-- Niveles -->
      <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white">Niveles educativos</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ej: Primario, Secundario. Si no hay turnos separados, dejá <strong class="font-medium">General</strong> en turno.
        </p>

        <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="submitProgram">
          <label class="block text-sm">
            <span class="text-gray-700 dark:text-gray-300">Nivel</span>
            <input
              v-model="programForm.educationLevel"
              type="text"
              required
              placeholder="Primario"
              class="form-field mt-1 w-48"
            />
          </label>
          <label class="block text-sm">
            <span class="text-gray-700 dark:text-gray-300">Turno</span>
            <input
              v-model="programForm.shift"
              type="text"
              :placeholder="EDUCATION_PROGRAM_SHIFT_PLACEHOLDER"
              :title="educationProgramShiftTitle(programForm.shift)"
              class="form-field mt-1 w-44"
            />
            <span class="mt-1 block max-w-xs text-xs text-gray-500 dark:text-gray-400">
              {{ EDUCATION_PROGRAM_SHIFT_HELP }}
            </span>
          </label>
          <button
            type="submit"
            :disabled="savingProgram"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {{ savingProgram ? 'Guardando…' : 'Agregar nivel' }}
          </button>
        </form>

        <ul v-if="programs.length" class="mt-4 flex flex-wrap gap-2">
          <li v-for="p in programs" :key="p.id">
            <button
              type="button"
              :class="[
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                selectedProgramId === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200',
              ]"
              :title="educationProgramShiftTitle(p.shift)"
              @click="selectedProgramId = p.id"
            >
              {{ formatEducationProgramLabel(p.educationLevel, p.shift) }} — {{ p.classroomCount }} aulas
            </button>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-gray-500">Creá el primer nivel para empezar.</p>
      </section>

      <template v-if="selectedProgram">
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Aulas -->
          <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Aulas — {{ selectedProgram.educationLevel }}</h2>
            <form class="mt-4 flex gap-2" @submit.prevent="submitClassroom">
              <input
                v-model="classroomForm.name"
                type="text"
                required
                placeholder="1A"
                class="form-field flex-1"
              />
              <button
                type="submit"
                :disabled="savingClassroom"
                class="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900 disabled:opacity-60"
              >
                Agregar
              </button>
            </form>
            <ul v-if="classrooms.length" class="mt-4 space-y-2">
              <li
                v-for="c in classrooms"
                :key="c.id"
                class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-white/5"
              >
                <span class="font-medium text-gray-900 dark:text-white">{{ c.name }}</span>
                <span class="text-gray-500">{{ c.teacherCount }} docente(s)</span>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-gray-500">Sin aulas todavía.</p>
          </section>

          <!-- Docentes -->
          <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Docentes / materias</h2>
            <form class="mt-4 space-y-3" @submit.prevent="submitTeacher">
              <input
                v-model="teacherSubject"
                type="text"
                required
                placeholder="Materia (Matemáticas)"
                class="form-field"
              />
              <UserProfileFormFields v-model="teacherProfile" id-prefix="est-teacher" require-all-profile-fields />
              <input
                v-model="teacherPassword"
                type="password"
                required
                minlength="8"
                placeholder="Contraseña inicial"
                class="form-field"
              />
              <button
                type="submit"
                :disabled="savingTeacher"
                class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900 disabled:opacity-60"
              >
                {{ savingTeacher ? 'Guardando…' : 'Agregar docente' }}
              </button>
            </form>
            <ul v-if="teachers.length" class="mt-4 space-y-2">
              <li
                v-for="t in teachers"
                :key="t.id"
                class="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-white/5"
              >
                <span class="font-medium text-gray-900 dark:text-white">{{ t.displayName }}</span>
                <span class="text-gray-500"> · {{ t.subject }} · {{ t.email }}</span>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-gray-500">Sin docentes todavía.</p>
          </section>
        </div>

        <!-- Asignaciones -->
        <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">Asignar docentes a aulas</h2>
          <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="submitAssignment">
            <label class="block text-sm">
              <span class="text-gray-700 dark:text-gray-300">Aula</span>
              <select
                v-model="assignmentForm.classroomId"
                required
                class="form-field mt-1 block min-w-[8rem]"
              >
                <option value="" disabled>Elegir aula</option>
                <option v-for="c in classrooms" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="block text-sm">
              <span class="text-gray-700 dark:text-gray-300">Docente</span>
              <select
                v-model="assignmentForm.teacherUserId"
                required
                class="form-field mt-1 block min-w-[12rem]"
              >
                <option value="" disabled>Elegir docente</option>
                <option v-for="t in teachers" :key="t.userId" :value="t.userId">
                  {{ t.displayName }} ({{ t.subject }})
                </option>
              </select>
            </label>
            <button
              type="submit"
              :disabled="savingAssignment || !classrooms.length || !teachers.length"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {{ savingAssignment ? 'Asignando…' : 'Asignar' }}
            </button>
          </form>

          <ul v-if="assignments.length" class="mt-4 divide-y divide-gray-200 dark:divide-white/10">
            <li
              v-for="a in assignments"
              :key="a.id"
              class="flex items-center justify-between py-3 text-sm"
            >
              <span>
                <span class="font-medium text-gray-900 dark:text-white">{{ a.classroomName }}</span>
                <span class="text-gray-500"> ← {{ a.teacherName }} ({{ a.subject }})</span>
              </span>
              <button
                type="button"
                class="text-red-600 hover:text-red-500 dark:text-red-400"
                @click="removeAssignment(a.id)"
              >
                Quitar
              </button>
            </li>
          </ul>
          <p v-else class="mt-4 text-sm text-gray-500">Todavía no hay asignaciones en este nivel.</p>
        </section>
      </template>
    </template>
  </div>
</template>
