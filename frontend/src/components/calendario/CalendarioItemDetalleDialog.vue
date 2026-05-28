<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import {
  sidebarEventCardClass,
  sidebarEventDotClass,
  sidebarEventTimeClass,
} from '@/utils/calendarioEventStyles'
import {
  sidebarTaskCardClass,
  sidebarTaskDotClass,
  taskDisplayTitle,
} from '@/utils/calendarioTaskStyles'

export type CalendarioDetalle =
  | { type: 'event'; event: CalEvent }
  | { type: 'task'; task: CalTask }

defineOptions({ name: 'CalendarioItemDetalleDialog' })

const open = defineModel<boolean>('open', { default: false })
const detalle = defineModel<CalendarioDetalle | null>('detalle', { default: null })

const emit = defineEmits<{
  'view-event': [eventId: string]
}>()

const { porFecha: eventosPorFecha } = useCalendarioEscolarEvents()

const isEvent = computed(() => detalle.value?.type === 'event')

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

function eventNameById(eventId: string): string | null {
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === eventId)
    if (ev) return ev.name
  }
  return null
}

function findEventById(eventId: string): CalEvent | null {
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === eventId)
    if (ev) return ev
  }
  return null
}

function close() {
  open.value = false
}

function viewLinkedEvent() {
  if (detalle.value?.type !== 'task' || !detalle.value.task.eventId) return
  const ev = findEventById(detalle.value.task.eventId)
  if (!ev) return
  detalle.value = { type: 'event', event: ev }
  emit('view-event', ev.id)
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
              class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-white/10">
                <div class="min-w-0">
                  <p
                    class="text-xs font-semibold tracking-wide uppercase"
                    :class="isEvent ? 'text-indigo-600 dark:text-indigo-400' : 'text-violet-600 dark:text-violet-400'"
                  >
                    {{ isEvent ? 'Evento' : 'Tarea' }}
                  </p>
                  <DialogTitle class="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {{ title }}
                  </DialogTitle>
                  <p class="mt-1 text-sm capitalize text-gray-600 dark:text-gray-400">
                    <time v-if="dateAttr" :datetime="dateAttr">{{ dateLabel }}</time>
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="close"
                >
                  <span class="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <div class="px-5 py-4">
                <div
                  v-if="eventDetail"
                  :class="sidebarEventCardClass(eventDetail)"
                >
                  <div class="flex items-start gap-2.5">
                    <span :class="[sidebarEventDotClass(eventDetail), 'mt-1.5']" aria-hidden="true" />
                    <dl class="min-w-0 flex-1 space-y-3 text-sm">
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Horario</dt>
                        <dd :class="sidebarEventTimeClass(eventDetail)">
                          <time :datetime="eventDetail.datetime">{{ eventDetail.time }}</time>
                        </dd>
                      </div>
                      <div v-if="eventDetail.eventType">
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo de evento</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ eventDetail.eventType }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</dt>
                        <dd class="mt-0.5 leading-relaxed text-gray-700 dark:text-gray-300">
                          {{ eventDetail.description || 'Sin descripción.' }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div
                  v-else-if="taskDetail"
                  :class="sidebarTaskCardClass(!!taskDetail.eventId)"
                >
                  <div class="flex items-start gap-2.5">
                    <span :class="[sidebarTaskDotClass(), 'mt-1.5']" aria-hidden="true" />
                    <dl class="min-w-0 flex-1 space-y-3 text-sm">
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ taskTipoOf(taskDetail) }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cuadrante</dt>
                        <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">
                          {{ taskCuadranteOf(taskDetail) }}
                        </dd>
                      </div>
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
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</dt>
                        <dd class="mt-0.5 leading-relaxed text-gray-700 dark:text-gray-300">
                          {{ taskDetail.description || 'Sin descripción.' }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <div class="border-t border-gray-200 px-5 py-4 dark:border-white/10">
                <button
                  type="button"
                  class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                  @click="close"
                >
                  Cerrar
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
