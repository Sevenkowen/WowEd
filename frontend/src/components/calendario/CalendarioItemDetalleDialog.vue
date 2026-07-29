<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid'
import type { CalEvent } from '@/data/calendarioEscolarTypes'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import { formatTaskScheduleLabel, tasksLinkedToEvent } from '@/utils/calendarioTaskLinks'
import {
  eventColorSquareClass,
  eventColorSquareStyle,
  eventHeaderStyle,
  sidebarEventTimeClass,
} from '@/utils/calendarioEventStyles'
import { taskDisplayTitle } from '@/utils/calendarioTaskStyles'
import { isCalendarModifyAllowed } from '@/utils/calendarioDates'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'
import CalendarioAssigneeChip from '@/components/calendario/CalendarioAssigneeChip.vue'
import CalendarioTareaDetalleDialog from '@/components/calendario/CalendarioTareaDetalleDialog.vue'
import CalendarioEventoDetalleDialog from '@/components/calendario/CalendarioEventoDetalleDialog.vue'

export type CalendarioDetalle =
  | { type: 'event'; event: CalEvent }
  | { type: 'task'; task: CalTask }

type EventTab = 'detalles' | 'tareas'

defineOptions({ name: 'CalendarioItemDetalleDialog' })

const open = defineModel<boolean>('open', { default: false })
const detalle = defineModel<CalendarioDetalle | null>('detalle', { default: null })

const emit = defineEmits<{
  'view-event': [eventId: string]
  changed: []
}>()

const { porFecha: eventosPorFecha, deleteEvent } = useCalendarioEscolarEvents()
const { tareasDelDia, setCompletada, deleteTask } = useCalendarioEscolarTasks()

const eventTab = ref<EventTab>('detalles')
const togglingTaskId = ref<string | null>(null)
const confirmDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const taskEditOpen = ref(false)
const taskEditId = ref<string | null>(null)
const taskCreateEventId = ref<string | null>(null)
const eventEditOpen = ref(false)
const eventEditId = ref<string | null>(null)

const eventDetail = computed(() =>
  detalle.value?.type === 'event' ? detalle.value.event : null,
)

const taskDetail = computed(() =>
  detalle.value?.type === 'task' ? detalle.value.task : null,
)

const title = computed(() => {
  if (!detalle.value) return ''
  return detalle.value.type === 'event'
    ? detalle.value.event.name
    : taskDisplayTitle(detalle.value.task)
})

const dateLabel = computed(() => {
  if (!detalle.value) return '—'
  const ymd =
    detalle.value.type === 'event'
      ? detalle.value.event.datetime.slice(0, 10)
      : detalle.value.task.date
  const [y, m, d] = ymd.split('-').map(Number)
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const dateAttr = computed(() => {
  if (!detalle.value) return undefined
  return detalle.value.type === 'event'
    ? detalle.value.event.datetime.slice(0, 10)
    : detalle.value.task.date
})

const eventHeaderSubtitle = computed(() => {
  if (!eventDetail.value) return ''
  const [y, m, d] = eventDetail.value.datetime.slice(0, 10).split('-').map(Number)
  const dayPart = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d))
  const cap = dayPart.charAt(0).toUpperCase() + dayPart.slice(1)
  return `${cap} · ${eventDetail.value.time}`
})

const taskHeaderSubtitle = computed(() => {
  if (!taskDetail.value) return ''
  return formatTaskScheduleLabel(taskDetail.value)
})

const eventLinkedTasks = computed(() => {
  if (!eventDetail.value) return []
  const date = eventDetail.value.datetime.slice(0, 10)
  return tasksLinkedToEvent(tareasDelDia(date), eventDetail.value.id)
})

const eventTabs = computed(() => [
  { id: 'detalles' as const, label: 'Detalles' },
  { id: 'tareas' as const, label: `Tareas (${eventLinkedTasks.value.length})` },
])

const canModify = computed(() => {
  if (!detalle.value) return false
  if (detalle.value.type === 'task') {
    return isCalendarModifyAllowed(detalle.value.task.date)
  }
  return isCalendarModifyAllowed(detalle.value.event.datetime.slice(0, 10))
})

watch(
  () => detalle.value,
  () => {
    eventTab.value = 'detalles'
    confirmDelete.value = false
    deleteError.value = ''
  },
)

function eventNameById(eventId: string): string | null {
  const needle = String(eventId)
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => String(e.id) === needle)
    if (ev) return ev.name
  }
  return null
}

function findEventById(eventId: string): CalEvent | null {
  const needle = String(eventId)
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => String(e.id) === needle)
    if (ev) return ev
  }
  return null
}

function openLinkedTask(task: CalTask) {
  detalle.value = { type: 'task', task }
}

function close() {
  open.value = false
  confirmDelete.value = false
  deleteError.value = ''
}

function startEdit() {
  if (!detalle.value || !canModify.value) return
  taskCreateEventId.value = null
  if (detalle.value.type === 'task') {
    taskEditId.value = detalle.value.task.id
    taskEditOpen.value = true
  } else {
    eventEditId.value = detalle.value.event.id
    eventEditOpen.value = true
  }
  open.value = false
}

function openCreateTaskForEvent() {
  if (!eventDetail.value || !canModify.value) return
  taskEditId.value = null
  taskCreateEventId.value = eventDetail.value.id
  taskEditOpen.value = true
}

function onTaskDialogSaved() {
  emit('changed')
  if (taskCreateEventId.value) {
    eventTab.value = 'tareas'
  }
}

function onEditSaved() {
  emit('changed')
}

function onEditDeleted() {
  emit('changed')
  detalle.value = null
}

async function onDelete() {
  if (!detalle.value || !canModify.value || deleting.value) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    deleteError.value = ''
    return
  }

  deleting.value = true
  deleteError.value = ''
  try {
    const ok =
      detalle.value.type === 'task'
        ? await Promise.resolve(deleteTask(detalle.value.task.id))
        : await Promise.resolve(deleteEvent(detalle.value.event.id))
    if (!ok) {
      deleteError.value =
        detalle.value.type === 'task'
          ? 'No se pudo eliminar la tarea.'
          : 'No se pudo eliminar el evento.'
      confirmDelete.value = false
      return
    }
    detalle.value = null
    emit('changed')
    close()
  } finally {
    deleting.value = false
  }
}

function viewLinkedEvent() {
  if (detalle.value?.type !== 'task' || !detalle.value.task.eventId) return
  const ev = findEventById(detalle.value.task.eventId)
  if (!ev) return
  detalle.value = { type: 'event', event: ev }
  emit('view-event', ev.id)
}

async function toggleTaskDone(task: CalTask) {
  if (togglingTaskId.value) return
  togglingTaskId.value = task.id
  try {
    await setCompletada(task.id, !task.completed)
  } finally {
    togglingTaskId.value = null
  }
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" aria-hidden="true"></div>
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              v-if="detalle"
              class="w-full max-w-md overflow-hidden rounded-2xl bg-gray-50 shadow-xl ring-1 ring-black/5 dark:bg-gray-950 dark:ring-white/10"
            >
              <!-- Cabecera evento -->
              <div
                v-if="eventDetail"
                :class="['relative px-5 pt-5 pb-4 text-white']"
                :style="eventHeaderStyle(eventDetail)"
              >
                <button
                  type="button"
                  class="absolute top-3 right-3 rounded-lg p-1.5 text-white/90 hover:bg-white/15 hover:text-white"
                  @click="close"
                >
                  <span class="sr-only">Cerrar</span>
                  <XMarkIcon class="size-5" aria-hidden="true" />
                </button>
                <DialogTitle class="pr-8 text-xl font-semibold leading-snug">
                  {{ eventDetail.name }}
                </DialogTitle>
                <p class="mt-1 text-sm text-white/90">
                  {{ eventHeaderSubtitle }}
                </p>
              </div>

              <!-- Cabecera tarea -->
              <div
                v-else-if="taskDetail"
                class="relative bg-violet-600 px-5 pt-5 pb-4 text-white dark:bg-violet-700"
              >
                <button
                  type="button"
                  class="absolute top-3 right-3 rounded-lg p-1.5 text-white/90 hover:bg-white/15 hover:text-white"
                  @click="close"
                >
                  <span class="sr-only">Cerrar</span>
                  <XMarkIcon class="size-5" aria-hidden="true" />
                </button>
                <p class="text-xs font-semibold tracking-wide text-white/80 uppercase">Tarea</p>
                <DialogTitle class="mt-0.5 pr-8 text-xl font-semibold leading-snug">
                  {{ title }}
                </DialogTitle>
                <p class="mt-1 text-sm text-white/90">
                  {{ taskHeaderSubtitle }}
                </p>
              </div>

              <!-- Pestañas (solo evento) -->
              <div
                v-if="eventDetail"
                class="flex border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
              >
                <button
                  v-for="tab in eventTabs"
                  :key="tab.id"
                  type="button"
                  class="relative flex-1 px-4 py-3 text-sm font-medium transition-colors"
                  :class="
                    eventTab === tab.id
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  "
                  @click="eventTab = tab.id"
                >
                  {{ tab.label }}
                  <span
                    v-if="eventTab === tab.id"
                    class="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <!-- Cuerpo -->
              <div class="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
                <!-- Evento: pestaña Detalles -->
                <template v-if="eventDetail && eventTab === 'detalles'">
                  <h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Sobre el evento
                  </h3>
                  <dl class="space-y-4 text-sm">
                    <div class="flex items-start gap-3">
                      <CalendarDaysIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <dt class="sr-only">Nombre</dt>
                        <dd class="font-medium text-gray-900 dark:text-white">{{ eventDetail.name }}</dd>
                      </div>
                    </div>
                    <div class="flex items-start gap-3">
                      <ClockIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <dt class="sr-only">Horario</dt>
                        <dd :class="['font-medium', sidebarEventTimeClass(eventDetail)]">
                          <time :datetime="eventDetail.datetime">{{ eventDetail.time }}</time>
                        </dd>
                        <dd class="mt-0.5 capitalize text-gray-600 dark:text-gray-400">
                          <time v-if="dateAttr" :datetime="dateAttr">{{ dateLabel }}</time>
                        </dd>
                      </div>
                    </div>
                    <div v-if="eventDetail.eventType" class="flex items-start gap-3">
                      <span
                        :class="[eventColorSquareClass(eventDetail), 'mt-1']"
                        :style="eventColorSquareStyle(eventDetail)"
                        aria-hidden="true"
                      />
                      <div class="min-w-0">
                        <dt class="sr-only">Tipo</dt>
                        <dd class="font-medium text-gray-900 dark:text-white">{{ eventDetail.eventType }}</dd>
                      </div>
                    </div>
                    <div v-if="eventDetail.description" class="flex items-start gap-3">
                      <TagIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</dt>
                        <dd class="mt-0.5 leading-relaxed text-gray-700 dark:text-gray-300">
                          {{ eventDetail.description }}
                        </dd>
                      </div>
                    </div>
                    <div v-if="eventDetail.assignees?.length" class="flex items-start gap-3">
                      <UserGroupIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div class="min-w-0">
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Asignados</dt>
                        <dd class="mt-1.5 flex flex-wrap gap-1.5">
                          <CalendarioAssigneeChip
                            v-for="person in eventDetail.assignees"
                            :key="person.id"
                            :person="person"
                          />
                        </dd>
                      </div>
                    </div>
                  </dl>
                </template>

                <!-- Evento: pestaña Tareas -->
                <template v-else-if="eventDetail && eventTab === 'tareas'">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Tareas asociadas a este evento
                    </h3>
                    <button
                      v-if="canModify"
                      type="button"
                      class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      @click="openCreateTaskForEvent"
                    >
                      <PlusIcon class="size-4" aria-hidden="true" />
                      Nueva tarea
                    </button>
                  </div>
                  <ul v-if="eventLinkedTasks.length > 0" class="space-y-3">
                    <li
                      v-for="task in eventLinkedTasks"
                      :key="task.id"
                      class="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4 dark:border-violet-500/30 dark:bg-violet-950/40"
                    >
                      <div class="flex items-start gap-3">
                        <button
                          type="button"
                          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                          :class="
                            task.completed
                              ? 'border-violet-400 bg-violet-500 text-white'
                              : 'border-violet-400/70 bg-transparent hover:border-violet-400'
                          "
                          :disabled="togglingTaskId === task.id"
                          :aria-label="task.completed ? 'Marcar pendiente' : 'Marcar completada'"
                          @click.stop="toggleTaskDone(task)"
                        >
                          <CheckIcon v-if="task.completed" class="size-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          class="min-w-0 flex-1 text-left"
                          @click="openLinkedTask(task)"
                        >
                          <p
                            class="font-medium text-gray-900 dark:text-white"
                            :class="{ 'line-through opacity-60': task.completed }"
                          >
                            {{ taskDisplayTitle(task) }}
                          </p>
                          <p class="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <CalendarDaysIcon class="size-3.5 shrink-0" aria-hidden="true" />
                            {{ formatTaskScheduleLabel(task) }}
                          </p>
                          <span
                            class="mt-2 inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                            :class="
                              task.completed
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                            "
                          >
                            {{ task.completed ? 'Completada' : 'Pendiente' }}
                          </span>
                        </button>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                    No hay tareas vinculadas a este evento.
                    <button
                      v-if="canModify"
                      type="button"
                      class="mt-2 flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      @click="openCreateTaskForEvent"
                    >
                      <PlusIcon class="size-4" aria-hidden="true" />
                      Crear primera tarea
                    </button>
                  </p>
                </template>

                <!-- Vista tarea -->
                <template v-else-if="taskDetail">
                  <h3 class="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Sobre la tarea
                  </h3>
                  <dl class="space-y-4 text-sm">
                    <div class="flex items-start gap-3">
                      <span
                        class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                        :class="
                          taskDetail.completed
                            ? 'border-violet-400 bg-violet-500 text-white'
                            : 'border-violet-400/70'
                        "
                        aria-hidden="true"
                      >
                        <CheckIcon v-if="taskDetail.completed" class="size-3" />
                      </span>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ taskDetail.completed ? 'Completada' : 'Pendiente' }}
                        </dd>
                      </div>
                    </div>
                    <div class="flex items-start gap-3">
                      <ClockIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha y horario</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ formatTaskScheduleLabel(taskDetail) }}
                        </dd>
                        <dd class="mt-0.5 capitalize text-gray-600 dark:text-gray-400">
                          <time v-if="dateAttr" :datetime="dateAttr">{{ dateLabel }}</time>
                        </dd>
                      </div>
                    </div>
                    <div class="flex items-start gap-3">
                      <TagIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ taskTipoOf(taskDetail) }}
                        </dd>
                      </div>
                    </div>
                    <div class="flex items-start gap-3">
                      <TagIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cuadrante</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ taskCuadranteOf(taskDetail) }}
                        </dd>
                      </div>
                    </div>
                    <div class="flex items-start gap-3">
                      <CalendarDaysIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Vinculación</dt>
                        <dd class="mt-0.5">
                          <template v-if="taskDetail.eventId && eventNameById(taskDetail.eventId)">
                            <span class="font-medium text-violet-800 dark:text-violet-200">
                              {{ eventNameById(taskDetail.eventId) }}
                            </span>
                            <button
                              type="button"
                              class="mt-1 block text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                              @click="viewLinkedEvent"
                            >
                              Ver evento vinculado
                            </button>
                          </template>
                          <span v-else class="text-gray-700 dark:text-gray-300">Tarea suelta</span>
                        </dd>
                      </div>
                    </div>
                    <div v-if="taskDetail.description" class="flex items-start gap-3">
                      <TagIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</dt>
                        <dd class="mt-0.5 leading-relaxed text-gray-700 dark:text-gray-300">
                          {{ taskDetail.description }}
                        </dd>
                      </div>
                    </div>
                    <div v-if="taskDetail.assignees?.length" class="flex items-start gap-3">
                      <UserGroupIcon class="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Asignados</dt>
                        <dd class="mt-1.5 flex flex-wrap gap-1.5">
                          <CalendarioAssigneeChip
                            v-for="person in taskDetail.assignees"
                            :key="person.id"
                            :person="person"
                          />
                        </dd>
                      </div>
                    </div>
                  </dl>
                </template>
              </div>

              <div class="border-t border-gray-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-gray-900">
                <p v-if="deleteError" class="mb-2 text-sm text-red-600 dark:text-red-400">{{ deleteError }}</p>
                <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    v-if="canModify"
                    type="button"
                    class="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    :disabled="deleting"
                    @click="onDelete"
                  >
                    <TrashIcon class="size-4" aria-hidden="true" />
                    {{
                      deleting
                        ? 'Eliminando…'
                        : confirmDelete
                          ? '¿Confirmar eliminación?'
                          : 'Eliminar'
                    }}
                  </button>
                  <div class="flex gap-2 sm:ml-auto">
                    <button
                      v-if="canModify"
                      type="button"
                      class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:flex-none dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                      @click="startEdit"
                    >
                      <PencilIcon class="size-4" aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      :class="[
                        'flex-1 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm sm:flex-none',
                        canModify ? 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5' : gcalPrimaryBtn,
                      ]"
                      @click="close"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <CalendarioTareaDetalleDialog
    v-model:open="taskEditOpen"
    v-model:task-id="taskEditId"
    v-model:preset-event-id="taskCreateEventId"
    @saved="onTaskDialogSaved"
    @deleted="onEditDeleted"
  />
  <CalendarioEventoDetalleDialog
    v-model:open="eventEditOpen"
    v-model:event-id="eventEditId"
    @saved="onEditSaved"
    @deleted="onEditDeleted"
  />
</template>
