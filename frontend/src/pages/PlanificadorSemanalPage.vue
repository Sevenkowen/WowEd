<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlusIcon } from '@heroicons/vue/20/solid'
import {
  useWeeklyPlanner,
  type BlockType,
  type DayId,
  type DelegatedStatus,
  type QuadrantId,
} from '@/composables/useWeeklyPlanner'

defineOptions({ name: 'PlanificadorSemanalPage' })

type TabId = 'prioridades' | 'horario' | 'delegadas'
const tabs: { id: TabId; label: string }[] = [
  { id: 'prioridades', label: 'Matriz de Prioridades' },
  { id: 'horario', label: 'Horario Semanal' },
  { id: 'delegadas', label: 'Tareas Delegadas' },
]

const activeTab = ref<TabId>('prioridades')

const {
  focoSemanal,
  tareas,
  schedule,
  delegatedTasks,
  saving,
  loadError,
  persistPlanner,
} = useWeeklyPlanner()

async function guardarFoco() {
  await persistPlanner()
}

const showNuevaTarea = ref(false)
const nuevaTareaTexto = ref('')
const nuevaTareaCuadrante = ref<QuadrantId>('ui')

const cuadrantes = computed(() => [
  {
    id: 'ui' as const,
    title: 'Urgente e Importante',
    subtitle: 'Hacer inmediatamente',
    panel: 'bg-rose-50/70 border-rose-200/60 dark:bg-rose-950/20 dark:border-rose-900/40',
    item: 'border-purple-300/70 bg-white dark:bg-gray-900/40 dark:border-purple-500/30',
  },
  {
    id: 'nui' as const,
    title: 'No Urgente pero Importante',
    subtitle: 'Programar y hacer',
    panel: 'bg-sky-50/70 border-sky-200/60 dark:bg-sky-950/20 dark:border-sky-900/40',
    item: 'border-purple-300/70 bg-white dark:bg-gray-900/40 dark:border-purple-500/30',
  },
  {
    id: 'uni' as const,
    title: 'Urgente pero No Importante',
    subtitle: 'Delegar si es posible',
    panel: 'bg-amber-50/70 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40',
    item: 'border-amber-300/70 bg-white dark:bg-gray-900/40 dark:border-amber-500/30',
  },
  {
    id: 'nuni' as const,
    title: 'No Urgente ni Importante',
    subtitle: 'Minimizar o eliminar',
    panel: 'bg-indigo-50/70 border-indigo-200/60 dark:bg-indigo-950/20 dark:border-indigo-900/40',
    item: 'border-indigo-300/70 bg-white dark:bg-gray-900/40 dark:border-indigo-500/30',
  },
])

function addTask() {
  const text = nuevaTareaTexto.value.trim()
  if (!text) return
  const q = nuevaTareaCuadrante.value
  tareas.value[q] = [...tareas.value[q], { id: `${q}-${Date.now()}`, text }]
  nuevaTareaTexto.value = ''
  showNuevaTarea.value = false
  void persistPlanner()
}

// --- Horario semanal ---
const days: { id: DayId; label: string }[] = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
]
const activeDay = ref<DayId>('lunes')

const scheduleBlocks = schedule

function typeBadge(type: BlockType) {
  const map: Record<BlockType, { label: string; cls: string; row: string }> = {
    P: {
      label: 'P - Pedagógico',
      cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200',
      row: 'bg-purple-50/60 dark:bg-purple-950/15',
    },
    A: {
      label: 'A - Administrativo',
      cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
      row: 'bg-amber-50/60 dark:bg-amber-950/15',
    },
    SC: {
      label: 'SC - Socio-Comunicativo',
      cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
      row: 'bg-sky-50/60 dark:bg-sky-950/15',
    },
    F: {
      label: 'F - Flexible',
      cls: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
      row: 'bg-gray-50/70 dark:bg-white/5',
    },
    PE: {
      label: 'PE - Personal',
      cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
      row: 'bg-emerald-50/60 dark:bg-emerald-950/15',
    },
  }
  return map[type]
}

function addBlock() {
  // placeholder para modal / formulario
}

function delegatedCardClass(status: DelegatedStatus): string {
  switch (status) {
    case 'En progreso':
      return 'border-amber-200 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/15'
    case 'Completada':
      return 'border-sky-200 bg-sky-50/50 dark:border-sky-500/25 dark:bg-sky-950/15'
    default:
      return 'border-purple-200 bg-purple-50/40 dark:border-purple-500/25 dark:bg-purple-950/15'
  }
}

function delegatedPillClass(status: DelegatedStatus): string {
  switch (status) {
    case 'En progreso':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
    case 'Completada':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
  }
}

function addDelegatedTask() {
  // placeholder para modal / formulario
}

function formatDelegatedDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="w-full text-left">
    <header>
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Planificador Semanal</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Organiza tus actividades y prioridades para la semana</p>
      <p v-if="loadError" class="mt-2 text-sm text-rose-600 dark:text-rose-400">{{ loadError }}</p>
    </header>

    <section
      class="mt-7 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
    >
      <div class="px-5 py-5 sm:px-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Foco Pedagógico Semanal</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define el enfoque principal de tu trabajo pedagógico esta semana
        </p>

        <textarea
          v-model="focoSemanal"
          class="mt-4 w-full rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-900 outline-hidden focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-white/10 dark:bg-gray-900/30 dark:text-white dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
          rows="4"
        />

        <div class="mt-4">
          <button
            type="button"
            class="inline-flex items-center rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
            @click="guardarFoco"
          >
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </section>

    <nav
      class="mt-6 inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
      aria-label="Secciones del planificador"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === tab.id
            ? 'bg-gray-50 text-gray-900 dark:bg-white/5 dark:text-white'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Contenido tabs -->
    <section v-if="activeTab === 'prioridades'" class="mt-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Matriz de Eisenhower</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organiza tus tareas según su urgencia e importancia
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="showNuevaTarea = !showNuevaTarea"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
          Nueva Tarea
        </button>
      </div>

      <div
        v-if="showNuevaTarea"
        class="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
      >
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_15rem_auto] sm:items-end">
          <div>
            <label class="block text-sm font-medium text-gray-900 dark:text-white">Tarea</label>
            <input
              v-model="nuevaTareaTexto"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-hidden focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-white/10 dark:bg-gray-900/30 dark:text-white dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
              placeholder="Escribe una tarea…"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-900 dark:text-white">Cuadrante</label>
            <select
              v-model="nuevaTareaCuadrante"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-hidden focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-white/10 dark:bg-gray-900/30 dark:text-white dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
            >
              <option value="ui">Urgente e Importante</option>
              <option value="nui">No Urgente pero Importante</option>
              <option value="uni">Urgente pero No Importante</option>
              <option value="nuni">No Urgente ni Importante</option>
            </select>
          </div>
          <button
            type="button"
            class="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/15"
            @click="addTask"
          >
            Agregar
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <article
          v-for="q in cuadrantes"
          :key="q.id"
          class="overflow-hidden rounded-xl border p-4 shadow-xs dark:shadow-none sm:p-5"
          :class="q.panel"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ q.title }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ q.subtitle }}</p>

          <div class="mt-4 space-y-3">
            <div
              v-for="t in tareas[q.id]"
              :key="t.id"
              class="rounded-lg border px-4 py-3 text-sm text-gray-900 shadow-sm dark:text-white"
              :class="q.item"
            >
              {{ t.text }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <section
      v-else-if="activeTab === 'horario'"
      class="mt-8 space-y-6"
    >
      <header>
        <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Horario Semanal</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Organiza tu semana por bloques de tiempo temáticos
        </p>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="t in (['P','A','SC','F','PE'] as const)"
          :key="t"
          class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          :class="typeBadge(t).cls"
        >
          {{ typeBadge(t).label }}
        </span>
      </div>

      <nav
        class="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        aria-label="Días de la semana"
      >
        <button
          v-for="d in days"
          :key="d.id"
          type="button"
          class="px-4 py-2 text-sm font-semibold transition-colors"
          :class="
            activeDay === d.id
              ? 'bg-gray-50 text-gray-900 dark:bg-white/5 dark:text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
          "
          @click="activeDay = d.id"
        >
          {{ d.label }}
        </button>
      </nav>

      <section
        class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-6">
          <div class="min-w-0">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ days.find((d) => d.id === activeDay)?.label }}
            </p>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Horario para el {{ days.find((d) => d.id === activeDay)?.label?.toLowerCase() }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
            @click="addBlock"
          >
            <PlusIcon class="size-5" aria-hidden="true" />
            Agregar
          </button>
        </div>

        <div v-if="scheduleBlocks[activeDay].length === 0" class="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400 sm:px-6">
          Todavía no hay bloques para este día.
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-white/10" role="list">
          <li
            v-for="b in scheduleBlocks[activeDay]"
            :key="b.id"
            class="grid grid-cols-[6.5rem_1fr] gap-4 px-5 py-4 sm:grid-cols-[7.5rem_1fr] sm:px-6"
            :class="typeBadge(b.type).row"
          >
            <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ b.start }} - {{ b.end }}</div>
            <div class="flex min-w-0 items-center gap-3">
              <span class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="typeBadge(b.type).cls">
                {{ b.type }}
              </span>
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ b.title }}</p>
            </div>
          </li>
        </ul>
      </section>
    </section>

    <section
      v-else
      class="mt-8"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Tareas Delegadas</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra las tareas que has asignado a otras personas
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-500 focus:outline-hidden focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          @click="addDelegatedTask"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
          Nueva Tarea
        </button>
      </div>

      <div class="mt-6 space-y-4">
        <article
          v-for="t in delegatedTasks"
          :key="t.id"
          class="rounded-xl border p-5 shadow-xs dark:shadow-none sm:p-6"
          :class="delegatedCardClass(t.status)"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-base font-semibold text-gray-900 dark:text-white">{{ t.title }}</p>
              <div class="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                <p class="inline-flex items-center gap-2">
                  <span class="text-gray-400 dark:text-gray-500">👤</span>
                  {{ t.assignee }}
                </p>
                <p class="inline-flex items-center gap-2">
                  <span class="text-gray-400 dark:text-gray-500">📅</span>
                  Hasta {{ formatDelegatedDate(t.due) }}
                </p>
                <p class="inline-flex items-center gap-2">
                  <span class="text-gray-400 dark:text-gray-500">🕒</span>
                  Seguimiento: {{ formatDelegatedDate(t.followUp) }}
                </p>
              </div>
            </div>

            <span class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" :class="delegatedPillClass(t.status)">
              {{ t.status }}
            </span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

