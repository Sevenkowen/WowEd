<script setup lang="ts">
import { computed } from 'vue'
import {
  Bars3BottomLeftIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  LockClosedIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import { eventColorSquareClass } from '@/utils/calendarioEventStyles'
import { taskDisplayTitle } from '@/utils/calendarioTaskStyles'
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
  'view-event': [eventId: string]
}>()

const { isUserEvent, porFecha: eventosPorFecha } = useCalendarioEscolarEvents()

const isEvent = computed(() => detalle.value?.type === 'event')
const eventDetail = computed(() => (detalle.value?.type === 'event' ? detalle.value.event : null))
const taskDetail = computed(() => (detalle.value?.type === 'task' ? detalle.value.task : null))

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

function close() {
  open.value = false
  emit('close')
}

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

function viewLinkedEvent() {
  if (detalle.value?.type !== 'task' || !detalle.value.task.eventId) return
  const ev = findEventById(detalle.value.task.eventId)
  if (!ev) return
  detalle.value = { type: 'event', event: ev }
  emit('view-event', ev.id)
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
            v-if="isEvent && eventDetail && isUserEvent(eventDetail.id)"
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-[#70757a] hover:bg-[#f1f3f4] dark:text-gray-400 dark:hover:bg-white/10"
            aria-label="Eliminar evento"
          >
            <TrashIcon class="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-[#70757a] hover:bg-[#f1f3f4] dark:text-gray-400 dark:hover:bg-white/10"
            aria-label="Más opciones"
          >
            <EllipsisVerticalIcon class="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-[#70757a] hover:bg-[#f1f3f4] dark:text-gray-400 dark:hover:bg-white/10"
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
              <p class="mt-1 text-sm capitalize text-[#70757a] dark:text-gray-400">
                {{ dateLabel }}
              </p>
            </div>
          </div>

          <ul class="mt-6 space-y-4 text-sm text-[#3c4043] dark:text-gray-200">
            <template v-if="eventDetail">
              <li class="flex items-start gap-4">
                <Bars3BottomLeftIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <span>{{ eventDetail.description || 'Sin descripción' }}</span>
              </li>
              <li class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <div>
                  <p>{{ eventDetail.time }}</p>
                  <p class="mt-0.5 text-[#70757a] dark:text-gray-400">
                    {{ eventDetail.eventType || 'Calendario escolar' }}
                  </p>
                </div>
              </li>
              <li class="flex items-start gap-4">
                <LockClosedIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <span>{{ isUserEvent(eventDetail.id) ? 'Privado' : 'Público' }}</span>
              </li>
            </template>

            <template v-else-if="taskDetail">
              <li class="flex items-start gap-4">
                <Bars3BottomLeftIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <span>{{ taskDetail.description || 'Sin descripción' }}</span>
              </li>
              <li class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <div>
                  <p>{{ taskTipoOf(taskDetail) }} · {{ taskCuadranteOf(taskDetail) }}</p>
                  <p v-if="taskDetail.time" class="mt-0.5 text-[#70757a] dark:text-gray-400">
                    {{ taskDetail.time }}
                  </p>
                </div>
              </li>
              <li v-if="taskDetail.eventId && eventNameById(taskDetail.eventId)" class="flex items-start gap-4">
                <CalendarIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <button
                  type="button"
                  class="text-left text-[#1a73e8] hover:underline dark:text-[#8ab4f8]"
                  @click="viewLinkedEvent"
                >
                  {{ eventNameById(taskDetail.eventId) }}
                </button>
              </li>
              <li class="flex items-start gap-4">
                <LockClosedIcon class="mt-0.5 size-5 shrink-0 text-[#70757a]" aria-hidden="true" />
                <span>Privado</span>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>
