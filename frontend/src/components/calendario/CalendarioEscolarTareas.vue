<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckIcon, PlusIcon } from '@heroicons/vue/20/solid'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { addDays, formatYmd, parseYmd } from '@/utils/calendarioDates'
import { gcalShell } from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'

defineOptions({ name: 'CalendarioEscolarTareas' })

const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'tareas' })

defineEmits<{
  refresh: []
  'add-task': []
}>()

type FiltroTareas = 'pendientes' | 'completadas' | 'todas'

const filtro = ref<FiltroTareas>('pendientes')

const { todasLasTareas, toggleCompletada } = useCalendarioEscolarTasks()
const { porFecha: eventosPorFecha } = useCalendarioEscolarEvents()

const tareasFiltradas = computed(() => {
  const list = todasLasTareas.value
  if (filtro.value === 'pendientes') return list.filter((t) => !t.completed)
  if (filtro.value === 'completadas') return list.filter((t) => t.completed)
  return list
})

interface GrupoTareas {
  key: string
  label: string
  tasks: CalTask[]
}

const grupos = computed((): GrupoTareas[] => {
  const map = new Map<string, GrupoTareas>()
  for (const task of tareasFiltradas.value) {
    const key = task.date
    const label = etiquetaFecha(task.date)
    const existing = map.get(key)
    if (existing) {
      existing.tasks.push(task)
    } else {
      map.set(key, { key, label, tasks: [task] })
    }
  }
  return [...map.values()]
})

const pendientesCount = computed(() => todasLasTareas.value.filter((t) => !t.completed).length)
const completadasCount = computed(() => todasLasTareas.value.filter((t) => t.completed).length)

const filtros: { id: FiltroTareas; label: string; count?: number }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'completadas', label: 'Completadas' },
  { id: 'todas', label: 'Todas' },
]

function etiquetaFecha(ymd: string): string {
  const today = formatYmd(new Date())
  const d = parseYmd(ymd)

  if (ymd === today) return 'Hoy'
  if (ymd === formatYmd(addDays(new Date(), 1))) return 'Mañana'
  if (ymd === formatYmd(addDays(new Date(), -1))) return 'Ayer'

  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function fechaCorta(ymd: string): string {
  const d = parseYmd(ymd)
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d)
}

function eventoVinculado(task: CalTask): string | null {
  if (!task.eventId) return null
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === task.eventId)
    if (ev) return ev.name
  }
  return null
}

function cuadranteBadgeClass(cuadrante: string): string {
  switch (cuadrante) {
    case 'Urgente e Importante':
      return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
    case 'No Urgente pero Importante':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
    case 'Urgente pero No Importante':
      return 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
  }
}

function onToggle(task: CalTask): void {
  toggleCompletada(task.id)
}
</script>

<template>
  <div :class="gcalShell">
    <CalendarioEscolarNavToolbar
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      title="Tareas"
      hide-date-nav
      @refresh="$emit('refresh')"
    />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f9fa] dark:bg-[#202124]">
      <div
        class="shrink-0 border-b border-[#dadce0] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#292a2d] sm:px-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filtros"
              :key="f.id"
              type="button"
              :class="[
                filtro === f.id
                  ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]'
                  : 'bg-white text-[#5f6368] hover:bg-[#f1f3f4] dark:bg-[#202124] dark:text-gray-300 dark:hover:bg-white/10',
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              ]"
              @click="filtro = f.id"
            >
              {{ f.label }}
              <span v-if="f.id === 'pendientes' && pendientesCount > 0" class="ml-1 opacity-80">
                ({{ pendientesCount }})
              </span>
              <span v-else-if="f.id === 'completadas' && completadasCount > 0" class="ml-1 opacity-80">
                ({{ completadasCount }})
              </span>
            </button>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1765cc] dark:bg-[#8ab4f8] dark:text-[#202124] dark:hover:bg-[#aecbfa]"
            @click="$emit('add-task')"
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            Nueva tarea
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 [scrollbar-gutter:stable]">
        <div v-if="grupos.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <div
            class="flex size-16 items-center justify-center rounded-full bg-[#e8f0fe] dark:bg-[#394457]"
          >
            <ClipboardDocumentListIcon class="size-8 text-[#1a73e8] dark:text-[#8ab4f8]" aria-hidden="true" />
          </div>
          <h2 class="mt-4 text-lg font-medium text-[#3c4043] dark:text-gray-100">
            {{
              filtro === 'completadas'
                ? 'No hay tareas completadas'
                : filtro === 'pendientes'
                  ? 'No hay tareas pendientes'
                  : 'No hay tareas todavía'
            }}
          </h2>
          <p class="mt-1 max-w-sm text-sm text-[#70757a] dark:text-gray-400">
            {{
              filtro === 'completadas'
                ? 'Las tareas que marques como hechas aparecerán acá.'
                : 'Creá una tarea para organizar tu trabajo del calendario escolar.'
            }}
          </p>
          <button
            v-if="filtro !== 'completadas'"
            type="button"
            class="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-4 py-2 text-sm font-medium text-[#1a73e8] hover:bg-[#f1f3f4] dark:border-white/15 dark:bg-[#292a2d] dark:text-[#8ab4f8] dark:hover:bg-white/10"
            @click="$emit('add-task')"
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            Crear primera tarea
          </button>
        </div>

        <div v-else class="mx-auto max-w-2xl space-y-6">
          <section v-for="grupo in grupos" :key="grupo.key">
            <h3
              class="sticky top-0 z-10 bg-[#f8f9fa]/95 py-2 text-xs font-semibold tracking-wide text-[#70757a] uppercase backdrop-blur-sm dark:bg-[#202124]/95 dark:text-gray-400"
            >
              {{ grupo.label }}
              <span class="ml-1 font-normal normal-case text-[#9aa0a6]">· {{ fechaCorta(grupo.key) }}</span>
            </h3>
            <ul class="mt-1 space-y-2">
              <li
                v-for="task in grupo.tasks"
                :key="task.id"
                class="group flex items-start gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#292a2d] dark:hover:border-white/15"
              >
                <button
                  type="button"
                  :class="[
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    task.completed
                      ? 'border-[#1a73e8] bg-[#1a73e8] dark:border-[#8ab4f8] dark:bg-[#8ab4f8]'
                      : 'border-[#70757a] hover:border-[#1a73e8] dark:border-gray-500 dark:hover:border-[#8ab4f8]',
                  ]"
                  :aria-label="task.completed ? 'Marcar como pendiente' : 'Marcar como completada'"
                  @click="onToggle(task)"
                >
                  <CheckIcon
                    v-if="task.completed"
                    class="size-3 text-white dark:text-[#202124]"
                    aria-hidden="true"
                  />
                </button>

                <div class="min-w-0 flex-1">
                  <p
                    :class="[
                      'text-sm font-medium text-[#3c4043] dark:text-gray-100',
                      task.completed ? 'text-[#70757a] line-through dark:text-gray-500' : '',
                    ]"
                  >
                    {{ task.title }}
                    <span v-if="task.time" class="ml-1.5 text-xs font-normal text-[#1a73e8] dark:text-[#8ab4f8]">
                      {{ task.time }}
                    </span>
                  </p>
                  <p
                    v-if="task.description"
                    :class="[
                      'mt-0.5 text-sm text-[#70757a] dark:text-gray-400',
                      task.completed ? 'line-through opacity-70' : '',
                    ]"
                  >
                    {{ task.description }}
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[11px] font-medium text-[#5f6368] dark:bg-white/10 dark:text-gray-300"
                    >
                      {{ taskTipoOf(task) }}
                    </span>
                    <span
                      :class="[
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        cuadranteBadgeClass(taskCuadranteOf(task)),
                      ]"
                    >
                      {{ taskCuadranteOf(task) }}
                    </span>
                    <span
                      v-if="eventoVinculado(task)"
                      class="inline-flex items-center gap-1 text-[11px] text-[#1a73e8] dark:text-[#8ab4f8]"
                    >
                      {{ eventoVinculado(task) }}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
