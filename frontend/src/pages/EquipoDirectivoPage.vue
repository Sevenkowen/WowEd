<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BellAlertIcon,
  CalendarDaysIcon,
  CheckIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  PlayIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentListIcon } from '@heroicons/vue/20/solid'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import EquipoDirectivoMiembroEditDialog from '@/components/equipo-directivo/EquipoDirectivoMiembroEditDialog.vue'
import EquipoDirectivoMiembroCreateDialog from '@/components/equipo-directivo/EquipoDirectivoMiembroCreateDialog.vue'
import { leadershipInitials, useLeadershipTeam } from '@/composables/useLeadershipTeam'
import { useAuth } from '@/composables/useAuth'
import { deleteLeadershipMember, type LeadershipMember } from '@/api/institutionApi'
import { useApi } from '@/api/http'

defineOptions({ name: 'EquipoDirectivoPage' })

type TabId = 'miembros' | 'tareas' | 'calendario' | 'pai'
const tabs: { id: TabId; label: string; icon?: any }[] = [
  { id: 'miembros', label: 'Miembros', icon: UsersIcon },
  { id: 'tareas', label: 'Tareas Compartidas', icon: ClipboardDocumentListIcon },
  { id: 'calendario', label: 'Calendario', icon: CalendarIcon },
  { id: 'pai', label: 'PAI Colaborativo', icon: CheckCircleIcon },
]

const activeTab = ref<TabId>('miembros')

type TaskPriority = 'Alta' | 'Media'
type TaskStatus = 'pendiente' | 'en_progreso' | 'completada'
type SharedTask = {
  id: string
  title: string
  description: string
  priority: TaskPriority
  owner: string
  due: string
  status: TaskStatus
}

const sharedTasks = ref<SharedTask[]>([
  {
    id: 'st-1',
    title: 'Elaboración del cronograma de reuniones trimestrales',
    description: 'Definir fechas y horarios para las reuniones del equipo directivo durante el trimestre',
    priority: 'Alta',
    owner: 'María Rodríguez',
    due: '31 may 2025',
    status: 'en_progreso',
  },
  {
    id: 'st-2',
    title: 'Organización de jornada pedagógica de junio',
    description: 'Definir agenda, ponentes y materiales para la jornada pedagógica institucional',
    priority: 'Alta',
    owner: 'Laura Gómez',
    due: '2 jun 2025',
    status: 'en_progreso',
  },
  {
    id: 'st-3',
    title: 'Revisión de indicadores de desempeño docente',
    description: 'Analizar los datos de observaciones de clase y feedback a docentes',
    priority: 'Media',
    owner: 'Carlos López',
    due: '24 may 2025',
    status: 'pendiente',
  },
  {
    id: 'st-4',
    title: 'Actualización del manual de procedimientos institucionales',
    description: 'Revisar y actualizar el documento con los nuevos procedimientos administrativos',
    priority: 'Media',
    owner: 'Juan Pérez',
    due: '14 jul 2025',
    status: 'pendiente',
  },
  {
    id: 'st-5',
    title: 'Preparación de informes para la supervisión',
    description: 'Recopilar y organizar datos para el informe mensual de supervisión',
    priority: 'Alta',
    owner: 'Ana Martínez',
    due: '29 may 2025',
    status: 'completada',
  },
])

type TaskFilter = 'pendientes' | 'completadas'
const taskFilter = ref<TaskFilter>('pendientes')

const taskCounts = computed(() => ({
  pendientes: sharedTasks.value.filter((t) => t.status !== 'completada').length,
  completadas: sharedTasks.value.filter((t) => t.status === 'completada').length,
}))

const filteredTasks = computed(() =>
  taskFilter.value === 'completadas'
    ? sharedTasks.value.filter((t) => t.status === 'completada')
    : sharedTasks.value.filter((t) => t.status !== 'completada'),
)

function priorityPill(p: TaskPriority): string {
  return p === 'Alta'
    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
    : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
}

function statusPill(s: TaskStatus): string {
  switch (s) {
    case 'completada':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    case 'en_progreso':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
  }
}

function statusLabel(s: TaskStatus): string {
  if (s === 'en_progreso') return 'En progreso'
  if (s === 'completada') return 'Completada'
  return 'Pendiente'
}

function completeTask(id: string) {
  sharedTasks.value = sharedTasks.value.map((t) => (t.id === id ? { ...t, status: 'completada' } : t))
}

function startTask(id: string) {
  sharedTasks.value = sharedTasks.value.map((t) => (t.id === id ? { ...t, status: 'en_progreso' } : t))
}

function reopenTask(id: string) {
  sharedTasks.value = sharedTasks.value.map((t) => (t.id === id ? { ...t, status: 'pendiente' } : t))
}

function deleteTask(id: string) {
  sharedTasks.value = sharedTasks.value.filter((t) => t.id !== id)
}

const { members, loaded, error, loadLeadershipTeam } = useLeadershipTeam()
const { syncProfileFromLeadershipMember } = useAuth()

const editOpen = ref(false)
const createOpen = ref(false)
const editingMember = ref<LeadershipMember | null>(null)
const deleteOpen = ref(false)
const deletingMember = ref<LeadershipMember | null>(null)
const deleteError = ref('')
const deleting = ref(false)

onMounted(() => {
  void loadLeadershipTeam()
})

function openEdit(member: LeadershipMember) {
  editingMember.value = member
  editOpen.value = true
}

async function onMemberSaved(updated: LeadershipMember) {
  await loadLeadershipTeam()
  syncProfileFromLeadershipMember(updated)
}

async function onMemberCreated() {
  await loadLeadershipTeam()
}

function openCreate() {
  createOpen.value = true
}

function openDelete(member: LeadershipMember) {
  deletingMember.value = member
  deleteError.value = ''
  deleteOpen.value = true
}

function closeDelete() {
  deleteOpen.value = false
  deletingMember.value = null
  deleteError.value = ''
}

async function confirmDelete() {
  const member = deletingMember.value
  if (!member) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteLeadershipMember(member.membershipId)
    closeDelete()
    await loadLeadershipTeam()
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'No se pudo eliminar'
  } finally {
    deleting.value = false
  }
}

const stats = computed(() => ({
  miembros: members.value.length,
  tareasActivas: 8,
  reunionesPendientes: 3,
}))

function noop() {}

// --- Calendario (UI demo) ---
const calendarCursor = ref(new Date(2026, 4, 1)) // Mayo 2026 (0-based)
const selectedDate = ref<Date>(new Date(2026, 4, 7))

type TeamEvent = { id: string; title: string; date: string; time?: string }
const teamEvents = ref<TeamEvent[]>([])

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
    .format(calendarCursor.value)
    .replace(/^\w/, (c) => c.toUpperCase()),
)

function yyyyMmDd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const selectedIso = computed(() => yyyyMmDd(selectedDate.value))

const selectedLabel = computed(() => {
  const raw = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    selectedDate.value,
  )
  return raw.replace(/^\w/, (c) => c.toUpperCase())
})

const weekdayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'] as const

type CalendarCell = { key: string; date: Date; inMonth: boolean }
const calendarCells = computed<CalendarCell[]>(() => {
  const cursor = calendarCursor.value
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

  // monday=0 ... sunday=6
  const mondayIndex = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayIndex)

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      key: yyyyMmDd(d),
      date: d,
      inMonth: d.getMonth() === cursor.getMonth() && d >= first && d <= last,
    })
  }
  return cells
})

function prevMonth() {
  calendarCursor.value = new Date(calendarCursor.value.getFullYear(), calendarCursor.value.getMonth() - 1, 1)
}

function nextMonth() {
  calendarCursor.value = new Date(calendarCursor.value.getFullYear(), calendarCursor.value.getMonth() + 1, 1)
}

const eventsToday = computed(() => teamEvents.value.filter((e) => e.date === selectedIso.value))
const upcomingEvents = computed(() =>
  teamEvents.value
    .filter((e) => e.date > selectedIso.value)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5),
)

// --- PAI colaborativo (UI demo) ---
type PaiArea = 'Pedagógica' | 'Administrativa' | 'Socio-comunicativa'
type PaiStatus = 'En progreso' | 'Completado' | 'No iniciado'
type PaiObjective = {
  id: string
  title: string
  description: string
  area: PaiArea
  status: PaiStatus
  owner: string
  due: string
  progressPct: number
}

const paiObjectives = ref<PaiObjective[]>([
  {
    id: 'p1',
    title: 'Mejorar los resultados académicos en matemáticas',
    description: 'Incrementar en un 10% el rendimiento académico en el área de matemáticas',
    area: 'Pedagógica',
    status: 'En progreso',
    owner: 'Carlos López',
    due: '29 nov 2025',
    progressPct: 40,
  },
  {
    id: 'p2',
    title: 'Optimizar procesos administrativos institucionales',
    description: 'Digitalizar y automatizar los principales procesos administrativos',
    area: 'Administrativa',
    status: 'En progreso',
    owner: 'Roberto Sánchez',
    due: '14 sept 2025',
    progressPct: 65,
  },
  {
    id: 'p3',
    title: 'Fortalecer la comunicación institucional',
    description: 'Mejorar los canales de comunicación con la comunidad educativa',
    area: 'Socio-comunicativa',
    status: 'En progreso',
    owner: 'Ana Martínez',
    due: '23 oct 2025',
    progressPct: 30,
  },
  {
    id: 'p4',
    title: 'Desarrollar programa de educación socioemocional',
    description: 'Implementar un programa integral de educación socioemocional en todos los niveles',
    area: 'Pedagógica',
    status: 'En progreso',
    owner: 'Laura Gómez',
    due: '14 dic 2025',
    progressPct: 25,
  },
  {
    id: 'p5',
    title: 'Consolidar programa de convivencia escolar',
    description: 'Fortalecer el programa de convivencia escolar con enfoque restaurativo',
    area: 'Socio-comunicativa',
    status: 'Completado',
    owner: 'María Rodríguez',
    due: '14 nov 2025',
    progressPct: 100,
  },
])

type PaiSort = 'estado' | 'progreso' | 'plazo'
const paiSort = ref<PaiSort>('estado')

const paiStats = computed(() => {
  const total = paiObjectives.value.length
  const completados = paiObjectives.value.filter((o) => o.status === 'Completado').length
  const enProgreso = paiObjectives.value.filter((o) => o.status === 'En progreso').length
  const noIniciados = paiObjectives.value.filter((o) => o.status === 'No iniciado').length
  return { total, completados, enProgreso, noIniciados }
})

function paiAreaClass(area: PaiArea): string {
  switch (area) {
    case 'Administrativa':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200'
    case 'Socio-comunicativa':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    default:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200'
  }
}

function paiStatusClass(status: PaiStatus): string {
  switch (status) {
    case 'Completado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    case 'No iniciado':
      return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
    default:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200'
  }
}

const sortedPaiObjectives = computed(() => {
  const list = [...paiObjectives.value]
  if (paiSort.value === 'progreso') return list.sort((a, b) => b.progressPct - a.progressPct)
  if (paiSort.value === 'plazo') return list.sort((a, b) => a.due.localeCompare(b.due))
  // estado: completado último, en progreso primero, no iniciado al final
  const rank: Record<PaiStatus, number> = { 'En progreso': 0, 'No iniciado': 1, Completado: 2 }
  return list.sort((a, b) => rank[a.status] - rank[b.status])
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
    <header class="shrink-0 flex flex-col gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Equipo Directivo</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Colaboración, comunicación y distribución de responsabilidades dentro del equipo directivo.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
        >
          <UsersIcon class="size-4" aria-hidden="true" />
          {{ stats.miembros }} Miembros
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
        >
          <CheckCircleIcon class="size-4" aria-hidden="true" />
          {{ stats.tareasActivas }} Tareas Activas
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        >
          <BellAlertIcon class="size-4" aria-hidden="true" />
          {{ stats.reunionesPendientes }} Reuniones Pendientes
        </span>
      </div>
    </header>

    <nav
      class="mt-6 shrink-0 flex w-full flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
      aria-label="Secciones de equipo directivo"
    >
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === t.id
            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 dark:bg-white/5 dark:text-white dark:ring-white/10'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
        "
        @click="activeTab = t.id"
      >
        <component :is="t.icon" class="size-4" aria-hidden="true" />
        {{ t.label }}
      </button>
    </nav>

    <!-- Miembros -->
    <section v-if="activeTab === 'miembros'" class="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Miembros del Equipo</h2>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="openCreate"
        >
          <UserPlusIcon class="size-5" aria-hidden="true" />
          Añadir Miembro
        </button>
      </div>

      <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div class="grid grid-cols-1 gap-5 pb-2 sm:grid-cols-2 xl:grid-cols-3">
        <p v-if="!useApi()" class="col-span-full text-sm text-gray-500 dark:text-gray-400">
          Activá la API para ver los miembros del equipo directivo de la institución.
        </p>
        <p v-else-if="!loaded" class="col-span-full text-sm text-gray-500 dark:text-gray-400">
          Cargando miembros…
        </p>
        <p v-else-if="error" class="col-span-full text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <p v-else-if="!members.length" class="col-span-full text-sm text-gray-500 dark:text-gray-400">
          No hay miembros del equipo directivo en esta institución.
        </p>
        <article
          v-for="m in members"
          :key="m.membershipId"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <div
                class="grid size-12 shrink-0 place-items-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
              >
                {{ leadershipInitials(m.displayName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-semibold text-gray-900 dark:text-white">{{ m.displayName }}</p>
                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ m.positionLabel }}</p>
                <p v-if="m.schoolName" class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ m.schoolName }}</p>
              </div>
            </div>

            <dl class="mt-4 space-y-2 text-sm">
              <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <EnvelopeIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span class="truncate">{{ m.email }}</span>
              </div>
            </dl>
          </div>

          <div class="grid grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-gray-100 dark:hover:bg-white/5"
              @click="openEdit(m)"
            >
              <PencilSquareIcon class="size-4" aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
              @click="openDelete(m)"
            >
              <TrashIcon class="size-4" aria-hidden="true" />
              Eliminar
            </button>
          </div>
        </article>
        </div>
      </div>
    </section>

    <!-- Placeholders para tabs restantes -->
    <section
      v-else-if="activeTab === 'tareas'"
      class="mt-6 min-h-0 flex-1 overflow-y-auto"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Tareas Compartidas</h2>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                taskFilter === 'pendientes'
                  ? 'bg-gray-900 text-white dark:bg-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
              "
              @click="taskFilter = 'pendientes'"
            >
              Pendientes: {{ taskCounts.pendientes }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                taskFilter === 'completadas'
                  ? 'bg-gray-900 text-white dark:bg-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
              "
              @click="taskFilter = 'completadas'"
            >
              Completadas: {{ taskCounts.completadas }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="noop"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
          Nueva Tarea
        </button>
      </div>

      <div
        class="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
      >
        <ul class="divide-y divide-gray-200 dark:divide-white/10" role="list">
          <li v-for="t in filteredTasks" :key="t.id" class="px-5 py-4 sm:px-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ t.title }}
                  </p>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="priorityPill(t.priority)">
                    {{ t.priority }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ t.description }}</p>

                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="inline-flex items-center gap-1">
                    <UsersIcon class="size-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    {{ t.owner }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <CalendarDaysIcon class="size-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    Vence: {{ t.due }}
                  </span>
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusPill(t.status)">
                    {{ statusLabel(t.status) }}
                  </span>
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  v-if="t.status !== 'completada'"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                  @click="completeTask(t.id)"
                >
                  <CheckIcon class="size-4" aria-hidden="true" />
                  Completar
                </button>

                <button
                  v-if="t.status === 'pendiente'"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                  @click="startTask(t.id)"
                >
                  <PlayIcon class="size-4" aria-hidden="true" />
                  Iniciar
                </button>

                <button
                  v-if="t.status === 'completada'"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                  @click="reopenTask(t.id)"
                >
                  Reabrir
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  @click="deleteTask(t.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section
      v-else-if="activeTab === 'calendario'"
      class="mt-6 min-h-0 flex-1 overflow-y-auto"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Calendario del Equipo</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Coordiná reuniones, hitos y tareas clave del equipo directivo.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="noop"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
          Nuevo Evento
        </button>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <!-- Calendario -->
        <section
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        >
          <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ monthLabel }}</p>
            <div class="inline-flex items-center gap-2">
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-white/5"
                @click="prevMonth"
              >
                <ChevronLeftIcon class="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-white/5"
                @click="nextMonth"
              >
                <ChevronRightIcon class="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="px-5 py-4 sm:px-6">
            <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              <div v-for="w in weekdayLabels" :key="w" class="py-2">{{ w }}</div>
            </div>

            <div class="mt-1 grid grid-cols-7 gap-2">
              <button
                v-for="c in calendarCells"
                :key="c.key"
                type="button"
                class="relative aspect-square rounded-xl border text-sm font-semibold transition-colors"
                :class="[
                  c.inMonth
                    ? 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/20 dark:text-white dark:hover:bg-white/5'
                    : 'border-transparent bg-transparent text-gray-400 dark:text-gray-600',
                  isSameDay(c.date, selectedDate)
                    ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-purple-400 dark:ring-offset-gray-900'
                    : '',
                ]"
                @click="selectedDate = c.date"
              >
                <span class="absolute left-2 top-2 text-xs font-semibold">{{ c.date.getDate() }}</span>
                <span
                  v-if="teamEvents.some((e) => e.date === c.key)"
                  class="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-purple-500"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div class="border-t border-gray-200 px-5 py-4 text-center dark:border-white/10">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No hay eventos programados para <span class="font-semibold">{{ selectedLabel }}</span>
            </p>
            <button
              type="button"
              class="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50/60 px-4 py-2 text-sm font-semibold text-purple-700 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-500/30 dark:bg-purple-950/15 dark:text-purple-200 dark:hover:bg-purple-950/25"
              @click="noop"
            >
              <span class="text-lg leading-none">+</span>
              Añadir evento
            </button>
          </div>
        </section>

        <!-- Sidebar eventos -->
        <aside class="space-y-4">
          <section
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
          >
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Eventos de Hoy</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ selectedLabel }}</p>

            <ul v-if="eventsToday.length > 0" class="mt-4 space-y-3">
              <li
                v-for="ev in eventsToday"
                :key="ev.id"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <p class="font-semibold text-gray-900 dark:text-white">{{ ev.title }}</p>
                <p v-if="ev.time" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ ev.time }}</p>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">No hay eventos programados para hoy</p>
          </section>

          <section
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
          >
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Próximos Eventos</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Siguientes hitos del equipo</p>

            <ul v-if="upcomingEvents.length > 0" class="mt-4 space-y-3">
              <li
                v-for="ev in upcomingEvents"
                :key="ev.id"
                class="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-gray-900 dark:text-white">{{ ev.title }}</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ ev.date }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">No hay eventos próximos programados</p>
          </section>
        </aside>
      </div>
    </section>

    <section v-else class="mt-6 min-h-0 flex-1 overflow-y-auto">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">PAI Colaborativo</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Plan Anual Institucional - Objetivos y seguimiento</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="noop"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
          Nuevo Objetivo
        </button>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Objetivos</p>
          <p class="mt-2 text-3xl font-bold text-purple-700 dark:text-purple-300">{{ paiStats.total }}</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Completados</p>
          <p class="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">{{ paiStats.completados }}</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">En Progreso</p>
          <p class="mt-2 text-3xl font-bold text-indigo-700 dark:text-indigo-300">{{ paiStats.enProgreso }}</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">No iniciados</p>
          <p class="mt-2 text-3xl font-bold text-gray-700 dark:text-gray-200">{{ paiStats.noIniciados }}</p>
        </article>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-semibold text-gray-900 dark:text-white">Objetivos Institucionales</p>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Ordenar por:</span>
          <select
            v-model="paiSort"
            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
          >
            <option value="estado">Estado</option>
            <option value="progreso">Progreso</option>
            <option value="plazo">Plazo</option>
          </select>
        </div>
      </div>

      <div class="mt-4 space-y-4">
        <article
          v-for="o in sortedPaiObjectives"
          :key="o.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        >
          <div class="p-5 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ o.title }}</h3>
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="paiAreaClass(o.area)">{{ o.area }}</span>
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="paiStatusClass(o.status)">{{ o.status }}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ o.description }}</p>
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="inline-flex items-center gap-1">
                    <UsersIcon class="size-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    Responsable: {{ o.owner }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <CalendarDaysIcon class="size-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    Plazo: {{ o.due }}
                  </span>
                </div>

                <div class="mt-4">
                  <div class="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span class="font-semibold text-gray-700 dark:text-gray-300">Progreso</span>
                    <span class="shrink-0 font-semibold text-gray-700 dark:text-gray-200">{{ o.progressPct }}%</span>
                  </div>
                  <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div class="h-full rounded-full bg-purple-600 dark:bg-purple-500" :style="{ width: `${o.progressPct}%` }" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500"
                @click="noop"
              >
                Ver Detalles
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <EquipoDirectivoMiembroEditDialog
      v-model:open="editOpen"
      v-model:member="editingMember"
      @saved="onMemberSaved"
    />

    <EquipoDirectivoMiembroCreateDialog v-model:open="createOpen" @created="onMemberCreated" />

    <TransitionRoot as="template" :show="deleteOpen">
      <Dialog class="relative z-50" @close="closeDelete">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/50 dark:bg-black/60" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto p-4 sm:p-6">
          <div class="flex min-h-full items-center justify-center">
            <TransitionChild
              as="template"
              enter="ease-out duration-200"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-800"
              >
                <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
                  Eliminar miembro
                </DialogTitle>
                <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  ¿Querés quitar a
                  <span class="font-semibold text-gray-900 dark:text-white">{{ deletingMember?.displayName }}</span>
                  del equipo directivo? El usuario seguirá existiendo pero dejará de aparecer en este módulo.
                </p>
                <p v-if="deleteError" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ deleteError }}</p>
                <div class="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                    @click="closeDelete"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    :disabled="deleting"
                    class="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
                    @click="confirmDelete"
                  >
                    {{ deleting ? 'Eliminando…' : 'Eliminar' }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

