<script setup lang="ts">
import { computed } from 'vue'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { taskDisplayTitle } from '@/utils/calendarioTaskStyles'
import {
  eventTasksCountLabel,
  eventTasksListLimit,
  eventTasksMicroLabel,
  eventTasksTooltip,
  isMicroEventBlock,
  shouldCompactEventTasks,
} from '@/utils/calendarioTaskLinks'

defineOptions({ name: 'CalendarioEventTasksInline' })

export type EventTasksInlineSlotProps = {
  micro: boolean
  compact: boolean
  hideTime: boolean
}

const props = defineProps<{
  tasks: CalTask[]
  /** Franjas de 30 min del bloque del evento. */
  gridSpan: number
}>()

const emit = defineEmits<{
  'open-task': [task: CalTask]
  'open-event': []
}>()

const micro = computed(() => isMicroEventBlock(props.gridSpan) && props.tasks.length > 0)

const compact = computed(() => shouldCompactEventTasks(props.gridSpan, props.tasks.length))

const hideTime = computed(() => isMicroEventBlock(props.gridSpan))

const slotProps = computed<EventTasksInlineSlotProps>(() => ({
  micro: micro.value,
  compact: compact.value,
  hideTime: hideTime.value,
}))

const listLimit = computed(() => eventTasksListLimit(props.gridSpan, props.tasks.length))

const visibleTasks = computed(() => props.tasks.slice(0, listLimit.value))

const hiddenCount = computed(() => Math.max(0, props.tasks.length - listLimit.value))

const summaryLabel = computed(() => eventTasksCountLabel(props.tasks.length))

const microLabel = computed(() => eventTasksMicroLabel(props.tasks.length))

const tooltip = computed(() => eventTasksTooltip(props.tasks))

const compactBadgeClass =
  'inline-flex max-w-[5.5rem] shrink-0 items-center gap-1 rounded-full bg-black/25 px-1.5 py-px text-[10px] font-semibold leading-tight text-white shadow-sm backdrop-blur-[2px] hover:bg-black/35'

const microBadgeClass =
  'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/30 px-1 py-px text-[9px] font-bold leading-none text-white hover:bg-black/40'
</script>

<template>
  <template v-if="tasks.length === 0">
    <slot v-bind="slotProps" />
  </template>

  <template v-else-if="micro">
    <div class="flex min-h-0 flex-1 items-center gap-1">
      <div class="min-w-0 flex-1 overflow-hidden">
        <slot v-bind="slotProps" />
      </div>
      <button
        type="button"
        :class="microBadgeClass"
        :title="`${summaryLabel}: ${tooltip}`"
        :aria-label="`${summaryLabel}: ${tooltip}`"
        @click.stop="emit('open-event')"
      >
        <span class="size-1 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
        <span>{{ microLabel }}</span>
      </button>
    </div>
  </template>

  <template v-else-if="compact">
    <div class="flex min-h-0 items-start gap-0.5 pt-0.5">
      <div class="min-w-0 flex-1">
        <slot v-bind="slotProps" />
      </div>
      <button
        type="button"
        :class="[compactBadgeClass, 'mt-1']"
        :title="tooltip"
        :aria-label="`${summaryLabel}: ${tooltip}`"
        @click.stop="emit('open-event')"
      >
        <span class="size-1.5 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
        <span class="truncate">{{ summaryLabel }}</span>
      </button>
    </div>
  </template>

  <template v-else>
    <slot v-bind="slotProps" />
    <ul class="mt-0.5 shrink-0 space-y-px border-t border-white/25 pt-0.5">
      <li v-for="task in visibleTasks" :key="task.id">
        <button
          type="button"
          class="flex w-full min-w-0 items-center gap-1 rounded px-0.5 py-px text-left text-[10px] font-medium leading-tight text-white/95 hover:bg-white/15"
          :title="taskDisplayTitle(task)"
          @click.stop="emit('open-task', task)"
        >
          <span class="size-1.5 shrink-0 rounded-full bg-violet-300" aria-hidden="true" />
          <span class="truncate">{{ taskDisplayTitle(task) }}</span>
        </button>
      </li>
      <li v-if="hiddenCount > 0">
        <button
          type="button"
          class="mt-px inline-flex max-w-full items-center rounded-full bg-black/20 px-1.5 py-px text-[10px] font-semibold text-white/95 hover:bg-black/30"
          :title="tooltip"
          @click.stop="emit('open-event')"
        >
          +{{ hiddenCount }} más
        </button>
      </li>
    </ul>
  </template>
</template>
