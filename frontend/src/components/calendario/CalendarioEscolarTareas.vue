<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { CheckIcon, EllipsisHorizontalIcon, PlusIcon } from '@heroicons/vue/20/solid'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import {
  taskCuadranteOf,
  taskCuadrantes,
  taskTipoOf,
  type CalTaskCuadrante,
} from '@/data/calendarioTareaOptions'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { addDays, formatYmd, parseYmd } from '@/utils/calendarioDates'
import {
  gcalPrimaryBtn,
  gcalShell,
  gcalSubtleSurface,
  gcalToggleActive,
  gcalToggleIdle,
} from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'
import CalendarioTareaDetalleDialog from '@/components/calendario/CalendarioTareaDetalleDialog.vue'

defineOptions({ name: 'CalendarioEscolarTareas' })

const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'tareas' })

defineEmits<{
  refresh: []
  'add-task': []
}>()

type FiltroTareas = 'pendientes' | 'completadas' | 'todas'

const COMPLETADAS_COL = 'completadas'

const filtro = ref<FiltroTareas>('pendientes')
const detailOpen = ref(false)
const selectedTaskId = ref<string | null>(null)
let suppressCardClickUntil = 0

const { todasLasTareas, toggleCompletada, setCompletada, moveTaskCuadrante } = useCalendarioEscolarTasks()
const { porFecha: eventosPorFecha } = useCalendarioEscolarEvents()

interface BoardColumn {
  id: string
  title: string
  subtitle: string
  accent: string
  headerBg: string
}

const cuadranteColumns: BoardColumn[] = [
  {
    id: 'Urgente e Importante',
    title: 'Urgente e Importante',
    subtitle: 'Hacer ya',
    accent: 'bg-red-500',
    headerBg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    id: 'No Urgente pero Importante',
    title: 'No urgente, importante',
    subtitle: 'Planificar',
    accent: 'bg-amber-500',
    headerBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    id: 'Urgente pero No Importante',
    title: 'Urgente, no importante',
    subtitle: 'Delegar',
    accent: 'bg-orange-500',
    headerBg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    id: 'No Urgente ni Importante',
    title: 'Ni urgente ni importante',
    subtitle: 'Eliminar o posponer',
    accent: 'bg-gray-400',
    headerBg: 'bg-gray-100 dark:bg-white/5',
  },
]

const completadasColumn: BoardColumn = {
  id: COMPLETADAS_COL,
  title: 'Completadas',
  subtitle: 'Hechas',
  accent: 'bg-indigo-500',
  headerBg: 'bg-indigo-50 dark:bg-indigo-950/30',
}

const visibleColumns = computed((): BoardColumn[] => {
  if (filtro.value === 'completadas') return [completadasColumn]
  if (filtro.value === 'todas') return [...cuadranteColumns, completadasColumn]
  return cuadranteColumns
})

const columnTasks = ref<Record<string, CalTask[]>>({})

function tareasParaFiltro(): CalTask[] {
  const list = todasLasTareas.value
  if (filtro.value === 'pendientes') return list.filter((t) => !t.completed)
  if (filtro.value === 'completadas') return list.filter((t) => t.completed)
  return list
}

function syncBoardFromTasks(): void {
  const next: Record<string, CalTask[]> = {}
  for (const col of visibleColumns.value) {
    next[col.id] = []
  }
  for (const task of tareasParaFiltro()) {
    const colId = task.completed ? COMPLETADAS_COL : taskCuadranteOf(task)
    if (next[colId]) {
      next[colId].push(task)
    } else if (filtro.value === 'todas' && !task.completed) {
      const fallback = taskCuadrantes[0].name
      next[fallback] = next[fallback] ?? []
      next[fallback].push(task)
    }
  }
  for (const col of visibleColumns.value) {
    next[col.id]?.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'es'))
  }
  columnTasks.value = next
}

watch([todasLasTareas, filtro], syncBoardFromTasks, { immediate: true, deep: true })

const pendientesCount = computed(() => todasLasTareas.value.filter((t) => !t.completed).length)
const completadasCount = computed(() => todasLasTareas.value.filter((t) => t.completed).length)
const totalVisible = computed(() => Object.values(columnTasks.value).reduce((n, list) => n + list.length, 0))

const filtros: { id: FiltroTareas; label: string }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'completadas', label: 'Completadas' },
  { id: 'todas', label: 'Todas' },
]

function etiquetaFecha(ymd: string): string {
  const today = formatYmd(new Date())
  if (ymd === today) return 'Hoy'
  if (ymd === formatYmd(addDays(new Date(), 1))) return 'Mañana'
  if (ymd === formatYmd(addDays(new Date(), -1))) return 'Ayer'
  const d = parseYmd(ymd)
  const raw = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function eventoVinculado(task: CalTask): string | null {
  if (!task.eventId) return null
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === task.eventId)
    if (ev) return ev.name
  }
  return null
}

function tipoLabelClass(tipo: string): string {
  switch (tipo) {
    case 'Pedagógico':
      return 'bg-violet-500'
    case 'Administrativo':
      return 'bg-sky-500'
    case 'Socio-comunicativo':
      return 'bg-emerald-500'
    case 'Flexible':
      return 'bg-amber-500'
    default:
      return 'bg-gray-400'
  }
}

interface DragChangeAdded {
  element: CalTask
  newIndex: number
}

interface DragChangeEvent {
  added?: DragChangeAdded
}

async function onColumnChange(targetColId: string, evt: DragChangeEvent): Promise<void> {
  if (!evt.added) return
  const task = evt.added.element
  if (targetColId === COMPLETADAS_COL) {
    if (!task.completed) await setCompletada(task.id, true)
  } else {
    if (task.completed) await setCompletada(task.id, false)
    await moveTaskCuadrante(task.id, targetColId as CalTaskCuadrante)
  }
  syncBoardFromTasks()
}

function onToggle(task: CalTask, e: Event): void {
  e.stopPropagation()
  toggleCompletada(task.id)
}

function onBoardDragStart(): void {
  suppressCardClickUntil = Date.now() + 250
}

function onBoardDragEnd(): void {
  suppressCardClickUntil = Date.now() + 250
}

function openTaskDetail(task: CalTask, e?: Event): void {
  e?.stopPropagation()
  if (Date.now() < suppressCardClickUntil) return
  selectedTaskId.value = task.id
  detailOpen.value = true
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

    <div :class="['flex min-h-0 flex-1 flex-col overflow-hidden', gcalSubtleSurface]">
      <div
        class="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-800 sm:px-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filtros"
              :key="f.id"
              type="button"
              :class="[
                filtro === f.id ? gcalToggleActive : gcalToggleIdle,
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
            :class="['inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-sm', gcalPrimaryBtn]"
            @click="$emit('add-task')"
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            Nueva tarea
          </button>
        </div>
      </div>

      <div v-if="totalVisible === 0" class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div class="flex size-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15">
          <ClipboardDocumentListIcon class="size-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </div>
        <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          {{
            filtro === 'completadas'
              ? 'No hay tareas completadas'
              : filtro === 'pendientes'
                ? 'No hay tareas pendientes'
                : 'No hay tareas todavía'
          }}
        </h2>
        <p class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Arrastrá las tarjetas entre columnas para cambiar su prioridad o marcarlas como hechas.
        </p>
        <button
          v-if="filtro !== 'completadas'"
          type="button"
          class="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50 dark:border-white/15 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-white/10"
          @click="$emit('add-task')"
        >
          <PlusIcon class="size-4" aria-hidden="true" />
          Crear primera tarea
        </button>
      </div>

      <div
        v-else
        class="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 py-4 sm:px-6 [scrollbar-gutter:stable]"
      >
        <div class="flex h-full min-w-max gap-4 pb-2">
          <section
            v-for="col in visibleColumns"
            :key="col.id"
            class="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200/80 bg-gray-100/90 shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <header
              :class="['shrink-0 rounded-t-xl border-b border-gray-200/60 px-3 py-3 dark:border-white/10', col.headerBg]"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span :class="['size-2 shrink-0 rounded-full', col.accent]" aria-hidden="true" />
                    <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {{ col.title }}
                    </h3>
                  </div>
                  <p class="mt-0.5 pl-4 text-[11px] text-gray-500 dark:text-gray-400">{{ col.subtitle }}</p>
                </div>
                <span
                  class="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300"
                >
                  {{ columnTasks[col.id]?.length ?? 0 }}
                </span>
              </div>
            </header>

            <draggable
              v-model="columnTasks[col.id]"
              :group="{ name: 'tareas-board', pull: true, put: true }"
              item-key="id"
              tag="div"
              :animation="180"
              filter=".no-drag"
              :prevent-on-filter="true"
              ghost-class="tarea-board-ghost"
              drag-class="tarea-board-drag"
              chosen-class="tarea-board-chosen"
              class="flex min-h-[5rem] flex-1 flex-col gap-2 overflow-y-auto p-2 [scrollbar-gutter:stable]"
              @start="onBoardDragStart"
              @end="onBoardDragEnd"
              @change="onColumnChange(col.id, $event)"
            >
              <template #item="{ element: task }">
                <article
                  class="tarea-board-card group cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md dark:border-white/10 dark:bg-gray-800 dark:hover:border-white/20"
                  :class="task.completed ? 'opacity-80' : ''"
                  @click="openTaskDetail(task)"
                >
                  <div class="mb-2 flex gap-1">
                    <span
                      :class="['h-1.5 flex-1 rounded-full', tipoLabelClass(taskTipoOf(task))]"
                      :title="taskTipoOf(task)"
                    />
                  </div>

                  <div class="flex items-start gap-2">
                    <button
                      type="button"
                      class="no-drag mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                      :class="
                        task.completed
                          ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
                          : 'border-gray-300 hover:border-indigo-500 dark:border-gray-500 dark:hover:border-indigo-400'
                      "
                      :aria-label="task.completed ? 'Marcar como pendiente' : 'Marcar como completada'"
                      @click="onToggle(task, $event)"
                      @pointerdown.stop
                    >
                      <CheckIcon
                        v-if="task.completed"
                        class="size-3 text-white dark:text-gray-900"
                        aria-hidden="true"
                      />
                    </button>

                    <div class="min-w-0 flex-1">
                      <p
                        :class="[
                          'text-sm font-medium leading-snug text-gray-900 dark:text-gray-100',
                          task.completed ? 'text-gray-500 line-through dark:text-gray-500' : '',
                        ]"
                      >
                        {{ task.title }}
                      </p>
                      <p
                        v-if="task.description"
                        :class="[
                          'mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400',
                          task.completed ? 'line-through opacity-70' : '',
                        ]"
                      >
                        {{ task.description }}
                      </p>
                    </div>

                    <button
                      type="button"
                      class="no-drag -mr-1 -mt-1 flex size-6 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-200"
                      aria-label="Abrir tarea"
                      @click="openTaskDetail(task, $event)"
                      @pointerdown.stop
                    >
                      <EllipsisHorizontalIcon class="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div class="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
                    <span
                      class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300"
                      :class="task.date === formatYmd(new Date()) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'bg-gray-100'"
                    >
                      {{ etiquetaFecha(task.date) }}
                    </span>
                    <span
                      v-if="task.time"
                      class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300"
                    >
                      {{ task.time }}
                    </span>
                    <span
                      v-if="eventoVinculado(task)"
                      class="inline-flex max-w-full truncate rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    >
                      {{ eventoVinculado(task) }}
                    </span>
                  </div>
                </article>
              </template>
            </draggable>

            <footer class="shrink-0 border-t border-gray-200/60 p-2 dark:border-white/10">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/10"
                @click="$emit('add-task')"
              >
                <PlusIcon class="size-4" aria-hidden="true" />
                Agregar tarea
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>

    <CalendarioTareaDetalleDialog
      v-model:open="detailOpen"
      v-model:task-id="selectedTaskId"
      @saved="syncBoardFromTasks"
      @deleted="syncBoardFromTasks"
    />
  </div>
</template>

<style scoped>
.tarea-board-ghost {
  opacity: 0.45;
}

.tarea-board-drag {
  transform: rotate(2deg);
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.18);
}

.tarea-board-chosen {
  cursor: grabbing;
}
</style>
