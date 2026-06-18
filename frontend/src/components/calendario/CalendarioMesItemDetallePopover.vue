<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Bars3BottomLeftIcon,
  CalendarIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import { tasksLinkedToEvent } from '@/utils/calendarioTaskLinks'
import { eventColorSquareClass } from '@/utils/calendarioEventStyles'
import { taskDisplayTitle } from '@/utils/calendarioTaskStyles'
import { isCalendarModifyAllowed } from '@/utils/calendarioDates'
import { positionBesideAnchor } from '@/utils/calendarioPopoverPosition'
import type { CalendarioDetalle } from '@/components/calendario/CalendarioItemDetalleDialog.vue'

defineOptions({ name: 'CalendarioMesItemDetallePopover' })

const open = defineModel<boolean>('open', { default: false })
const detalle = defineModel<CalendarioDetalle | null>('detalle', { default: null })

const props = defineProps<{
  anchor: DOMRect | null
}>()

const emit = defineEmits<{
  close: []
  edit: [detalle: CalendarioDetalle]
  deleted: []
  'view-event': [eventId: string]
}>()

const { isUserEvent, porFecha: eventosPorFecha, deleteEvent } = useCalendarioEscolarEvents()
const { tareasDelDia, deleteTask } = useCalendarioEscolarTasks()

const confirmDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const isEvent = computed(() => detalle.value?.type === 'event')
const eventDetail = computed(() => (detalle.value?.type === 'event' ? detalle.value.event : null))
const taskDetail = computed(() => (detalle.value?.type === 'task' ? detalle.value.task : null))

const canModify = computed(() => {
  if (!detalle.value) return false
  if (detalle.value.type === 'task') {
    return isCalendarModifyAllowed(detalle.value.task.date)
  }
  return isCalendarModifyAllowed(detalle.value.event.datetime.slice(0, 10))
})

const title = computed(() => {
  if (!detalle.value) return ''
  return detalle.value.type === 'event'
    ? detalle.value.event.name
    : taskDisplayTitle(detalle.value.task)
})

const dateLabel = computed(() => {
  if (!detalle.value) return ''
  const ymd =
    detalle.value.type === 'event'
      ? detalle.value.event.datetime.slice(0, 10)
      : detalle.value.task.date
  const [y, m, d] = ymd.split('-').map(Number)
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const panelStyle = computed(() => {
  if (!props.anchor || !open.value) return { display: 'none' }
  const pos = positionBesideAnchor(props.anchor, 360, 320)
  return {
    top: `${pos.top}px`,
    left: `${pos.left}px`,
    width: `${pos.width}px`,
  }
})

watch(
  () => detalle.value,
  () => {
    confirmDelete.value = false
    deleteError.value = ''
  },
)

function close() {
  open.value = false
  confirmDelete.value = false
  deleteError.value = ''
  emit('close')
}

const eventLinkedTasks = computed(() => {
  if (!eventDetail.value) return []
  const date = eventDetail.value.datetime.slice(0, 10)
  return tasksLinkedToEvent(tareasDelDia(date), eventDetail.value.id)
})

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

function viewLinkedEvent() {
  if (detalle.value?.type !== 'task' || !detalle.value.task.eventId) return
  const ev = findEventById(detalle.value.task.eventId)
  if (!ev) return
  detalle.value = { type: 'event', event: ev }
  emit('view-event', ev.id)
}

function startEdit() {
  if (!detalle.value || !canModify.value) return
  emit('edit', detalle.value)
  close()
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
    emit('deleted')
    close()
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && detalle" class="fixed inset-0 z-[70]" @click="close">
      <div
        role="dialog"
        :aria-label="title"
        class="fixed z-[71] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-[#292a2d] dark:ring-white/10"
        :style="panelStyle"
        @click.stop
      >
        <div class="flex items-center justify-end gap-0.5 px-3 pt-3">
          <button
            v-if="canModify"
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/10"
            aria-label="Editar"
            @click="startEdit"
          >
            <PencilIcon class="size-5" aria-hidden="true" />
          </button>
          <button
            v-if="canModify"
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            :aria-label="confirmDelete ? 'Confirmar eliminación' : 'Eliminar'"
            :disabled="deleting"
            @click="onDelete"
          >
            <TrashIcon class="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/10"
            @click="close"
          >
            <span class="sr-only">Cerrar</span>
            <XMarkIcon class="size-5" aria-hidden="true" />
          </button>
        </div>

        <div class="px-6 pt-1 pb-6">
          <div class="flex items-start gap-3">
            <span
              v-if="isEvent && eventDetail"
              :class="eventColorSquareClass(eventDetail)"
              aria-hidden="true"
            />
            <span
              v-else
              class="mt-0.5 size-3.5 shrink-0 rounded-sm bg-[#8E24AA]"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-normal leading-snug text-[#3c4043] dark:text-white">
                {{ title }}
              </h2>
              <p class="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">
                {{ dateLabel }}
              </p>
            </div>
          </div>

          <p
            v-if="confirmDelete"
            class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            ¿Eliminar {{ isEvent ? 'este evento' : 'esta tarea' }}? Tocá el ícono de papelera otra vez para confirmar.
          </p>
          <p v-if="deleteError" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ deleteError }}</p>

          <ul class="mt-6 space-y-4 text-sm text-[#3c4043] dark:text-gray-200">
            <template v-if="eventDetail">
              <li class="flex items-start gap-4">
                <Bars3BottomLeftIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{{ eventDetail.description || 'Sin descripción' }}</span>
              </li>
              <li class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <div>
                  <p>{{ eventDetail.time }}</p>
                  <p class="mt-0.5 text-gray-500 dark:text-gray-400">
                    {{ eventDetail.eventType || 'Calendario escolar' }}
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-4">
                <LockClosedIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{{ isUserEvent(eventDetail.id) ? 'Privado' : 'Público' }}</span>
              </li>
              <li v-if="eventLinkedTasks.length > 0" class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-violet-500" aria-hidden="true" />
                <div class="min-w-0 flex-1 space-y-1.5">
                  <p class="text-xs font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
                    Tareas vinculadas
                  </p>
                  <button
                    v-for="task in eventLinkedTasks"
                    :key="task.id"
                    type="button"
                    class="flex w-full items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/80 px-2.5 py-2 text-left text-sm font-medium text-violet-900 hover:bg-violet-100/90 dark:border-violet-500/30 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
                    @click="openLinkedTask(task)"
                  >
                    <span class="size-2 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
                    <span class="truncate">{{ taskDisplayTitle(task) }}</span>
                  </button>
                </div>
              </li>
            </template>

            <template v-else-if="taskDetail">
              <li class="flex items-start gap-4">
                <Bars3BottomLeftIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{{ taskDetail.description || 'Sin descripción' }}</span>
              </li>
              <li class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <div>
                  <p>{{ taskTipoOf(taskDetail) }} · {{ taskCuadranteOf(taskDetail) }}</p>
                  <p v-if="taskDetail.time" class="mt-0.5 text-gray-500 dark:text-gray-400">
                    {{ taskDetail.time }}
                  </p>
                </div>
              </li>
              <li v-if="taskDetail.eventId && eventNameById(taskDetail.eventId)" class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <button
                  type="button"
                  class="text-left text-indigo-600 hover:underline dark:text-indigo-400"
                  @click="viewLinkedEvent"
                >
                  {{ eventNameById(taskDetail.eventId) }}
                </button>
              </li>
              <li class="flex items-start gap-4">
                <LockClosedIcon class="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>Privado</span>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>
