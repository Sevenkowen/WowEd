<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ClockIcon } from '@heroicons/vue/20/solid'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { formatYmd, isDateBeforeToday, mondayIndex } from '@/utils/calendarioDates'
import { monthEventBubbleClass, eventTypeBgStyleFromEvent } from '@/utils/calendarioEventStyles'
import { monthTaskBubbleClass, taskDisplayTitle } from '@/utils/calendarioTaskStyles'
import { standaloneTasksForDay } from '@/utils/calendarioTaskLinks'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import {
  gcalBorder,
  gcalDayCell,
  gcalDayNum,
  gcalMoreLink,
  gcalMutedText,
  gcalOtherMonthOverlay,
  gcalPastDayOverlay,
  gcalShell,
  gcalTodayBadge,
  gcalWeekdayHeader,
} from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'
import CalendarioDiaEventosDialog from '@/components/calendario/CalendarioDiaEventosDialog.vue'
import CalendarioMesDiaPopover from '@/components/calendario/CalendarioMesDiaPopover.vue'
import CalendarioMesItemDetallePopover from '@/components/calendario/CalendarioMesItemDetallePopover.vue'
import CalendarioTareaDetalleDialog from '@/components/calendario/CalendarioTareaDetalleDialog.vue'
import CalendarioEventoDetalleDialog from '@/components/calendario/CalendarioEventoDetalleDialog.vue'
import type { CalendarioDetalle } from '@/components/calendario/CalendarioItemDetalleDialog.vue'

defineOptions({ name: 'CalendarioEscolarMonth' })

const schoolYear = defineModel<number>('schoolYear', { default: 2026 })
const selectedDate = defineModel<string | null>('selectedDate', { default: null })
const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  'add-event': [startTime?: string]
  'add-task': []
  refresh: []
}>()

const { porFecha } = useCalendarioEscolarEvents()
const { porFecha: tareasPorFecha } = useCalendarioEscolarTasks()

interface DayCell {
  date: string
  isCurrentMonth?: boolean
  isToday?: boolean
  isSelected?: boolean
  isPast?: boolean
  events: CalEvent[]
  tasks: CalTask[]
}

function dayItemCount(day: DayCell): number {
  return day.events.length + day.tasks.length
}

function hiddenDayItemCount(day: DayCell): number {
  const shownEvents = Math.min(day.events.length, 2)
  const shownTasks = Math.min(day.tasks.length, Math.max(0, 2 - shownEvents))
  return dayItemCount(day) - shownEvents - shownTasks
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

const view = ref(new Date(schoolYear.value, 4, 1))

watch(
  schoolYear,
  (y) => {
    if (view.value.getFullYear() !== y) {
      view.value = new Date(y, view.value.getMonth(), 1)
    }
  },
  { flush: 'sync' },
)

watch(view, () => {
  const y = view.value.getFullYear()
  if (schoolYear.value !== y) {
    schoolYear.value = y
  }
})

function buildMonth(y: number, m: number): DayCell[] {
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(1 - mondayIndex(first))
  const todayStr = formatYmd(new Date())
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = formatYmd(d)
    const isCurrentMonth = d.getMonth() === m && d.getFullYear() === y
    cells.push({
      date: dateStr,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isSelected: selectedDate.value === dateStr,
      isPast: isDateBeforeToday(dateStr),
      events: contentMode.value === 'tareas' ? [] : (porFecha.value[dateStr] ?? []),
      tasks: standaloneTasksForDay(tareasPorFecha.value[dateStr] ?? []),
    })
  }
  return cells
}

const days = computed(() => {
  const d = view.value
  return buildMonth(d.getFullYear(), d.getMonth())
})

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(view.value),
)

const monthDatetimeAttr = computed(() => `${view.value.getFullYear()}-${pad(view.value.getMonth() + 1)}`)

type MobileEventRow = CalEvent & { dayDate: string }

const mobileEvents = computed((): MobileEventRow[] => {
  const y = view.value.getFullYear()
  const m = view.value.getMonth()
  return days.value
    .filter((day) => {
      const [ys, ms] = day.date.split('-').map(Number)
      return day.events.length > 0 && ys === y && ms - 1 === m
    })
    .flatMap((day) => day.events.map((e) => ({ ...e, dayDate: day.date })))
})

function prevMonth(): void {
  const d = new Date(view.value)
  d.setMonth(d.getMonth() - 1)
  view.value = d
}

function nextMonth(): void {
  const d = new Date(view.value)
  d.setMonth(d.getMonth() + 1)
  view.value = d
}

function goToday(): void {
  view.value = new Date()
  selectedDate.value = formatYmd(new Date())
}

const dayEventsOpen = ref(false)
const dayPopoverOpen = ref(false)
const dayPopoverAnchor = ref<DOMRect | null>(null)
const detailOpen = ref(false)
const detailAnchor = ref<DOMRect | null>(null)
const detalle = ref<CalendarioDetalle | null>(null)
const dayPopoverRef = ref<InstanceType<typeof CalendarioMesDiaPopover> | null>(null)

const taskEditOpen = ref(false)
const taskEditId = ref<string | null>(null)
const eventEditOpen = ref(false)
const eventEditId = ref<string | null>(null)

function onDetailEdit(item: CalendarioDetalle) {
  if (item.type === 'task') {
    taskEditId.value = item.task.id
    taskEditOpen.value = true
  } else {
    eventEditId.value = item.event.id
    eventEditOpen.value = true
  }
}

function isDesktopMonth(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
}

function openDayPopover(date: string, anchor: DOMRect) {
  selectedDate.value = date
  dayPopoverAnchor.value = anchor
  dayPopoverOpen.value = true
  detailOpen.value = false
  detalle.value = null
}

function openDetail(item: CalendarioDetalle, anchor: DOMRect) {
  detalle.value = item
  detailAnchor.value = anchor
  detailOpen.value = true
}

function selectDayFromElement(date: string, el: HTMLElement): void {
  const day = days.value.find((d) => d.date === date)
  const hasItems = day ? dayItemCount(day) > 0 : false

  if (isDateBeforeToday(date) && !hasItems) return

  selectedDate.value = date

  if (isDesktopMonth() && hasItems) {
    openDayPopover(date, el.getBoundingClientRect())
    return
  }

  dayEventsOpen.value = true
}

function selectDay(date: string, e: MouseEvent): void {
  selectDayFromElement(date, e.currentTarget as HTMLElement)
}

function selectDayKeydown(date: string, e: KeyboardEvent): void {
  selectDayFromElement(date, e.currentTarget as HTMLElement)
}

function onEventBubbleClick(event: CalEvent, e: MouseEvent): void {
  e.stopPropagation()
  selectedDate.value = event.datetime.slice(0, 10)

  if (isDesktopMonth()) {
    openDetail({ type: 'event', event }, (e.currentTarget as HTMLElement).getBoundingClientRect())
    dayPopoverOpen.value = false
    return
  }

  dayEventsOpen.value = true
}

function onTaskBubbleClick(task: CalTask, e: MouseEvent): void {
  e.stopPropagation()
  selectedDate.value = task.date

  if (isDesktopMonth()) {
    openDetail({ type: 'task', task }, (e.currentTarget as HTMLElement).getBoundingClientRect())
    dayPopoverOpen.value = false
    return
  }

  dayEventsOpen.value = true
}

function onMoreClick(date: string, e: MouseEvent): void {
  e.stopPropagation()
  if (isDesktopMonth()) {
    openDayPopover(date, (e.currentTarget as HTMLElement).closest('[role="button"]')!.getBoundingClientRect())
    return
  }
  selectedDate.value = date
  dayEventsOpen.value = true
}

function onSelectEventFromPopover(event: CalEvent): void {
  const anchor = dayPopoverRef.value?.getPanelRect() ?? dayPopoverAnchor.value
  if (!anchor) return
  openDetail({ type: 'event', event }, anchor)
}

function onSelectTaskFromPopover(task: CalTask): void {
  const anchor = dayPopoverRef.value?.getPanelRect() ?? dayPopoverAnchor.value
  if (!anchor) return
  openDetail({ type: 'task', task }, anchor)
}

function onDayPopoverClose(): void {
  if (!detailOpen.value) {
    dayPopoverAnchor.value = null
  }
}

function onDetailClose(): void {
  detailAnchor.value = null
  detalle.value = null
}

const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const
</script>

<template>
  <div :class="gcalShell">
    <CalendarioEscolarNavToolbar
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      :title="monthTitle"
      :datetime="monthDatetimeAttr"
      @prev="prevMonth"
      @next="nextMonth"
      @today="goToday"
      @refresh="$emit('refresh')"
    />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div :class="['grid shrink-0 grid-cols-7 border-b', gcalBorder]">
        <div
          v-for="(wd, i) in weekDays"
          :key="i"
          :class="['bg-gray-50 dark:bg-gray-800', gcalWeekdayHeader]"
        >
          <span class="sm:hidden">{{ wd.slice(0, 1) }}</span>
          <span class="hidden sm:inline">{{ wd }}</span>
        </div>
      </div>

      <div class="hidden min-h-0 flex-1 grid-cols-7 grid-rows-6 lg:grid">
        <div
          v-for="day in days"
          :key="day.date"
          role="button"
          tabindex="0"
          :class="[
            gcalDayCell,
            day.isPast && dayItemCount(day) === 0
              ? 'cursor-default hover:bg-gray-50 dark:hover:bg-gray-800'
              : '',
            day.isPast ? 'opacity-60' : '',
          ]"
          @click="selectDay(day.date, $event)"
          @keydown.enter.prevent="selectDayKeydown(day.date, $event)"
        >
          <div v-if="!day.isCurrentMonth" :class="gcalOtherMonthOverlay" aria-hidden="true" />
          <div v-if="day.isPast" :class="gcalPastDayOverlay" aria-hidden="true" />
          <time
            :datetime="day.date"
            :class="[
              gcalDayNum,
              day.isToday ? gcalTodayBadge : '',
              !day.isCurrentMonth && !day.isToday ? gcalMutedText : '',
            ]"
          >
            {{ day.date.split('-').pop()!.replace(/^0/, '') }}
          </time>
          <ol v-if="dayItemCount(day) > 0" class="relative z-[1] mt-0.5 min-h-0 flex-1 space-y-px overflow-y-auto">
            <li v-for="event in day.events.slice(0, 2)" :key="`ev-${event.id}`">
              <button
                type="button"
                :class="monthEventBubbleClass(event)"
                :style="eventTypeBgStyleFromEvent(event)"
                :title="event.name"
                @click="onEventBubbleClick(event, $event)"
              >
                {{ event.name }}
              </button>
            </li>
            <li
              v-for="task in day.tasks.slice(0, Math.max(0, 2 - day.events.length))"
              :key="`task-${task.id}`"
            >
              <button
                type="button"
                :class="monthTaskBubbleClass()"
                :title="taskDisplayTitle(task)"
                @click="onTaskBubbleClick(task, $event)"
              >
                {{ taskDisplayTitle(task) }}
              </button>
            </li>
            <li v-if="hiddenDayItemCount(day) > 0">
              <button type="button" :class="gcalMoreLink" @click="onMoreClick(day.date, $event)">
                +{{ hiddenDayItemCount(day) }} más
              </button>
            </li>
          </ol>
        </div>
      </div>

      <div
        class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:hidden [scrollbar-gutter:stable]"
      >
        <div class="grid w-full shrink-0 grid-cols-7 grid-rows-6">
          <button
            v-for="day in days"
            :key="day.date"
            type="button"
            :class="[
              gcalDayCell,
              'h-14 border-0',
              !day.isCurrentMonth ? 'opacity-60' : '',
              day.isPast && dayItemCount(day) === 0
                ? 'cursor-default hover:bg-gray-50 dark:hover:bg-gray-800'
                : '',
              day.isPast ? 'opacity-55' : '',
            ]"
            @click="selectDay(day.date, $event)"
          >
            <div v-if="day.isPast" :class="gcalPastDayOverlay" aria-hidden="true" />
            <time
              :datetime="day.date"
              :class="[gcalDayNum, day.isToday ? gcalTodayBadge : '']"
            >
              {{ day.date.split('-').pop()!.replace(/^0/, '') }}
            </time>
            <span class="sr-only">{{ dayItemCount(day) }} actividades</span>
            <span v-if="dayItemCount(day) > 0" class="-mx-0.5 mt-auto flex flex-wrap-reverse px-0.5">
              <span
                v-for="event in day.events"
                :key="`dot-ev-${event.id}`"
                class="mx-0.5 mb-1 size-1.5 rounded-full bg-[#039BE5]"
              />
              <span
                v-for="task in day.tasks"
                :key="`dot-task-${task.id}`"
                class="mx-0.5 mb-1 size-1.5 rounded-full bg-[#8E24AA]"
              />
            </span>
          </button>
        </div>

        <div
          class="relative shrink-0 border-t bg-gray-50 px-4 py-6 sm:px-6 dark:border-white/10 dark:bg-gray-900"
          :class="gcalBorder"
        >
          <ol
            v-if="mobileEvents.length > 0"
            class="divide-y overflow-hidden rounded-lg border bg-white text-sm shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-[#292a2d]"
            :class="gcalBorder"
          >
            <li
              v-for="event in mobileEvents"
              :key="`${event.id}-${event.dayDate}`"
              class="group flex p-4 pr-6 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <div class="flex-auto">
                <p class="font-medium text-[#3c4043] dark:text-white">{{ event.name }}</p>
                <time :datetime="event.datetime" class="mt-2 flex items-center text-gray-500 dark:text-gray-300">
                  <ClockIcon class="mr-2 size-5 shrink-0 text-gray-500" aria-hidden="true" />
                  {{ event.time }}
                </time>
              </div>
            </li>
          </ol>
          <p v-else class="text-center text-sm text-gray-500 dark:text-gray-400">No hay eventos este mes.</p>
        </div>
      </div>
    </div>

    <CalendarioMesDiaPopover
      ref="dayPopoverRef"
      v-model:open="dayPopoverOpen"
      v-model:date="selectedDate"
      :anchor="dayPopoverAnchor"
      @select-event="onSelectEventFromPopover"
      @select-task="onSelectTaskFromPopover"
      @close="onDayPopoverClose"
    />

    <CalendarioMesItemDetallePopover
      v-model:open="detailOpen"
      v-model:detalle="detalle"
      :anchor="detailAnchor"
      @close="onDetailClose"
      @edit="onDetailEdit"
      @deleted="onDetailClose"
    />

    <CalendarioTareaDetalleDialog v-model:open="taskEditOpen" v-model:task-id="taskEditId" />
    <CalendarioEventoDetalleDialog v-model:open="eventEditOpen" v-model:event-id="eventEditId" />

    <CalendarioDiaEventosDialog
      v-model:open="dayEventsOpen"
      v-model:date="selectedDate"
      @add-event="(t) => $emit('add-event', t)"
      @add-task="$emit('add-task')"
    />
  </div>
</template>
