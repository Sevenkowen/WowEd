<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { dayPopoverEventPillClass } from '@/utils/calendarioEventStyles'
import { dayPopoverTaskPillClass, taskDisplayTitle } from '@/utils/calendarioTaskStyles'
import { positionBelowAnchor } from '@/utils/calendarioPopoverPosition'

defineOptions({ name: 'CalendarioMesDiaPopover' })

const open = defineModel<boolean>('open', { default: false })
const date = defineModel<string | null>('date', { default: null })

const props = defineProps<{
  anchor: DOMRect | null
}>()

const emit = defineEmits<{
  'select-event': [event: CalEvent]
  'select-task': [task: CalTask]
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)

function getPanelRect(): DOMRect | null {
  return panelRef.value?.getBoundingClientRect() ?? null
}

defineExpose({ getPanelRect })

const { eventosDelDia } = useCalendarioEscolarEvents()
const { tareasDelDia } = useCalendarioEscolarTasks()

const events = computed(() => eventosDelDia(date.value))
const tasks = computed(() => tareasDelDia(date.value))

const weekdayShort = computed(() => {
  if (!date.value) return ''
  const [y, m, d] = date.value.split('-').map(Number)
  const raw = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(new Date(y, m - 1, d))
  return raw.replace('.', '').toUpperCase()
})

const dayNum = computed(() => date.value?.split('-').pop()?.replace(/^0/, '') ?? '')

const itemCount = computed(() => events.value.length + tasks.value.length)
const heightEstimate = computed(() => 72 + itemCount.value * 40 + 16)

const panelStyle = computed(() => {
  if (!props.anchor || !open.value) return { display: 'none' }
  const pos = positionBelowAnchor(props.anchor, 248, heightEstimate.value)
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

watch(open, (v) => {
  if (!v) emit('close')
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60]" @click="close">
      <div
        ref="panelRef"
        role="dialog"
        aria-label="Actividades del día"
        class="fixed z-[61] overflow-hidden rounded-xl bg-gray-50 shadow-lg ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10"
        :style="panelStyle"
        @click.stop
      >
        <div class="relative px-4 pt-3 pb-2">
          <button
            type="button"
            class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
            @click="close"
          >
            <span class="sr-only">Cerrar</span>
            <XMarkIcon class="size-4" aria-hidden="true" />
          </button>
          <p class="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {{ weekdayShort }}
          </p>
          <p class="text-2xl font-normal leading-none text-[#3c4043] dark:text-white">{{ dayNum }}</p>
        </div>

        <ul class="max-h-64 space-y-1 overflow-y-auto px-2 pb-2">
          <li v-for="ev in events" :key="`ev-${ev.id}`">
            <button type="button" :class="dayPopoverEventPillClass(ev)" @click="emit('select-event', ev)">
              {{ ev.name }}
            </button>
          </li>
          <li v-for="task in tasks" :key="`task-${task.id}`">
            <button type="button" :class="dayPopoverTaskPillClass()" @click="emit('select-task', task)">
              {{ taskDisplayTitle(task) }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
