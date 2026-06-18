<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCalendarClock } from '@/composables/useCalendarClock'
import { useCalendarioNowLine } from '@/composables/useCalendarioNowLine'
import { useCalendarioPastSlots } from '@/composables/useCalendarioPastSlots'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { useCalendarioGridDrag, type CalendarioDragItem } from '@/composables/useCalendarioGridDrag'
import { useCalendarioGridResize } from '@/composables/useCalendarioGridResize'
import { taskDisplayTitle, taskDisplayTime, timedTaskBlockClass, timedTaskDragGhostClass, timedTaskDragPreviewClass, timedTaskResizeHandleClass, timedTaskTimeClass, timedTaskTitleClass } from '@/utils/calendarioTaskStyles'
import { standaloneTasksForDay, tasksLinkedToEvent } from '@/utils/calendarioTaskLinks'
import { gridSpanFromEvent, gridSpanFromTask, isAllDayEvent, minutesFromEvent, minutesFromTask, formatEventTimeRange, formatTimeLabel, parseTimeToMinutes } from '@/utils/calendarioEventTime'
import {
  timedEventBlockClass,
  eventTypeBgStyleFromEvent,
  timedEventDragGhostClass,
  timedEventDragPreviewClass,
  timedEventResizeHandleClass,
  timedEventTimeClass,
  timedEventTitleClass,
  monthEventBubbleClass,
} from '@/utils/calendarioEventStyles'
import {
  addDays,
  formatYmd,
  isDateBeforeToday,
  mondayIndex,
  parseYmd,
  startOfWeekMonday,
  todayYmd,
} from '@/utils/calendarioDates'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import {
  gcalPastSlotDisabled,
  gcalPastTodaySlot,
  gcalPastWeekColumn,
  gcalShell,
  gcalSurface,
  gcalTodayBadge,
  gcalWeekSlotAvailable,
  gcalWeekSlotHover,
  gcalWeekSlotHoverActive,
} from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'
import CalendarioNowLineOverlay from '@/components/calendario/CalendarioNowLineOverlay.vue'
import CalendarioEventTasksInline from '@/components/calendario/CalendarioEventTasksInline.vue'
import CalendarioSlotCrearDialog from '@/components/calendario/CalendarioSlotCrearDialog.vue'
import CalendarioItemDetalleDialog, {
  type CalendarioDetalle,
} from '@/components/calendario/CalendarioItemDetalleDialog.vue'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import {
  CALENDARIO_DAY_START_HOUR,
  calendarioGridMinHeight,
  calendarioGridRows,
  calendarioGridRowsStyle,
  calendarioHourCount,
  calendarioHourLabel,
} from '@/utils/calendarioGridConstants'
import { timedGridItemLiClass, timedGridResizingClass, timedGridSyncingClass } from '@/utils/calendarioTimedGridStyles'

defineOptions({ name: 'CalendarioEscolarDay' })

const schoolYear = defineModel<number>('schoolYear', { default: 2026 })
const selectedDate = defineModel<string | null>('selectedDate', { default: null })
const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  'add-event': [startTime?: string]
  'add-task': [startTime?: string]
  refresh: []
}>()
const DAY_GRID_COLS = 'grid-cols-[3.5rem_minmax(0,1fr)]'
const DAY_START_HOUR = CALENDARIO_DAY_START_HOUR
const hours = Array.from({ length: calendarioHourCount() }, (_, i) => DAY_START_HOUR + i)
const GRID_ROWS = calendarioGridRows(hours.length)
const gridBodyMinHeight = calendarioGridMinHeight(hours.length)
const gridRowsStyle = calendarioGridRowsStyle(hours.length)
const dayStartMinutes = DAY_START_HOUR * 60

const { porFecha: eventosPorFecha, moveEvent, resizeEvent } = useCalendarioEscolarEvents()
const { tareasDelDia, moveTask, resizeTask } = useCalendarioEscolarTasks()

const gridRef = ref<HTMLElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const now = useCalendarClock()

const todayStr = formatYmd(new Date())

const focusDay = ref(
  selectedDate.value ? parseYmd(selectedDate.value) : new Date(),
)

watch(
  () => selectedDate.value,
  (d) => {
    if (!d) return
    const parsed = parseYmd(d)
    if (formatYmd(parsed) !== formatYmd(focusDay.value)) {
      focusDay.value = parsed
    }
  },
)

watch(focusDay, () => {
  const ymd = formatYmd(focusDay.value)
  if (selectedDate.value !== ymd) selectedDate.value = ymd
  const y = focusDay.value.getFullYear()
  if (schoolYear.value !== y) schoolYear.value = y
})

const miniMonth = ref(new Date(focusDay.value.getFullYear(), focusDay.value.getMonth(), 1))

watch(focusDay, (d) => {
  if (d.getMonth() !== miniMonth.value.getMonth() || d.getFullYear() !== miniMonth.value.getFullYear()) {
    miniMonth.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
})

const dayYmd = computed(() => formatYmd(focusDay.value))

const { showNowLine, nowLineTopPercent, nowLineLabel, scrollToNowCentered } = useCalendarioNowLine({
  now,
  dayStartMinutes,
  gridRows: GRID_ROWS,
  isTodayVisible: () => dayYmd.value === todayYmd(now.value),
})

function alignScrollToNow(): void {
  void scrollToNowCentered(scrollContainerRef.value, gridRef.value)
}

watch(showNowLine, (visible) => {
  if (visible) alignScrollToNow()
})

watch(dayYmd, () => {
  if (showNowLine.value) alignScrollToNow()
})

onMounted(() => {
  if (showNowLine.value) alignScrollToNow()
})
const { isSlotDisabled: isDaySlotDisabled } = useCalendarioPastSlots(
  now,
  dayStartMinutes,
  GRID_ROWS,
  () => [{ date: dayYmd.value }],
)

const {
  dragging,
  hover,
  beginDrag,
  isDraggingItem,
  isSyncingItem: isSyncingDragItem,
  pendingDropStartTime,
  isHoverCell,
  justDragged,
  showDragPreview,
} = useCalendarioGridDrag({
  gridRef,
  dayCount: 1,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getDateForDayIndex: () => dayYmd.value,
  canDrag: () => !isDateBeforeToday(dayYmd.value),
  onDrop: async (item, date, startTime) => {
    if (item.kind === 'event') await moveEvent(item.id, date, startTime)
    else await moveTask(item.id, date, startTime)
    selectedDate.value = date
  },
})

function dragItemClass(item: CalendarioDragItem, extra = ''): string {
  if (isDraggingItem(item)) {
    return [extra, timedTaskDragGhostClass()].filter(Boolean).join(' ')
  }
  const dragCursor = isDateBeforeToday(dayYmd.value)
    ? 'cursor-default'
    : 'cursor-grab touch-none select-none active:cursor-grabbing'
  return [extra, dragCursor].filter(Boolean).join(' ')
}

function dragEventClass(item: CalendarioDragItem, extra = ''): string {
  if (isDraggingItem(item)) {
    return [extra, timedEventDragGhostClass()].filter(Boolean).join(' ')
  }
  const dragCursor = isDateBeforeToday(dayYmd.value)
    ? 'cursor-default'
    : 'cursor-grab touch-none select-none active:cursor-grabbing'
  return [extra, dragCursor].filter(Boolean).join(' ')
}

function dragItemPayload(
  kind: CalendarioDragItem['kind'],
  id: string,
  span: number,
  gridRow: number,
): CalendarioDragItem {
  return { kind, id, span, dayIndex: 0, gridRow }
}

function dragPreviewTimeLabel(span: number, startTime: string): string {
  const startMin = parseTimeToMinutes(startTime)
  const endMin = startMin + span * 30
  const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  return formatEventTimeRange(startTime, endTime)
}

function onItemPointerDown(item: CalendarioDragItem, e: PointerEvent) {
  if ((e.target as HTMLElement).closest('[data-cal-resize]')) return
  beginDrag(item, e)
}

const weekStart = computed(() => startOfWeekMonday(focusDay.value))

const weekStripShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

interface StripDay {
  date: string
  dayNum: number
  shortLabel: string
  isToday: boolean
  isSelected: boolean
}

const weekStrip = computed((): StripDay[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart.value, i)
    const date = formatYmd(d)
    return {
      date,
      dayNum: d.getDate(),
      shortLabel: weekStripShort[i],
      isToday: date === todayStr,
      isSelected: formatYmd(focusDay.value) === date,
    }
  })
})

const dayTitleLong = computed(() =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(focusDay.value),
)

const weekdayName = computed(() =>
  new Intl.DateTimeFormat('es', { weekday: 'long' }).format(focusDay.value),
)

const dayDatetimeAttr = computed(() => formatYmd(focusDay.value))

interface MiniDay {
  date: string
  isCurrentMonth?: boolean
  isToday?: boolean
  isSelected?: boolean
}

function buildMiniMonth(y: number, m: number): MiniDay[] {
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(1 - mondayIndex(first))
  const cells: MiniDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = formatYmd(d)
    cells.push({
      date: dateStr,
      isCurrentMonth: d.getMonth() === m && d.getFullYear() === y,
      isToday: dateStr === todayStr,
      isSelected: formatYmd(focusDay.value) === dateStr,
    })
  }
  return cells
}

const miniDays = computed(() => {
  const d = miniMonth.value
  return buildMiniMonth(d.getFullYear(), d.getMonth())
})

const miniMonthTitle = computed(() =>
  new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(miniMonth.value),
)

const miniMonthDatetimeAttr = computed(() => {
  const d = miniMonth.value
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
})

const miniWeekLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

interface DaySlot {
  key: string
  startTime: string
  gridRow: number
}

const clickableSlots = computed((): DaySlot[] => {
  const slots: DaySlot[] = []
  for (let row = 2; row < GRID_ROWS; row++) {
    const slotIndex = row - 2
    const minutes = dayStartMinutes + slotIndex * 30
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push({
      key: `slot-${row}`,
      startTime: formatTimeLabel(h, m),
      gridRow: row,
    })
  }
  return slots
})

const slotCrearOpen = ref(false)
const selectedSlotTime = ref<string | null>(null)

function isSlotDisabled(startTime: string): boolean {
  return isDaySlotDisabled(dayYmd.value, startTime)
}

function slotCellClass(time: string): string {
  if (isDateBeforeToday(dayYmd.value, now.value)) return gcalPastWeekColumn
  if (isSlotDisabled(time)) return gcalPastTodaySlot
  return gcalWeekSlotAvailable
}

function padCellClass(): string {
  return slotCellClass(formatTimeLabel(DAY_START_HOUR, 0))
}

function hourGridRow(hourIndex: number, half: 'a' | 'b'): number {
  return half === 'a' ? 2 + hourIndex * 2 : 3 + hourIndex * 2
}

function onSlotClick(startTime: string) {
  if (isSlotDisabled(startTime)) return
  selectedDate.value = dayYmd.value
  selectedSlotTime.value = startTime
  slotCrearOpen.value = true
}

type DayTimedEvent = CalEvent & {
  gridRow: number
  gridSpan: number
}

const dayEvents = computed((): DayTimedEvent[] => {
  if (contentMode.value === 'tareas') return []
  const items: DayTimedEvent[] = []
  const events = eventosPorFecha.value[formatYmd(focusDay.value)] ?? []
  for (const ev of events) {
    if (isAllDayEvent(ev)) continue
    const minutes = minutesFromEvent(ev)
    if (minutes === null) continue
    const slot = Math.floor((minutes - dayStartMinutes) / 30)
    const span = gridSpanFromEvent(ev)
    if (slot < 0 || 2 + slot + span - 1 > GRID_ROWS) continue
    items.push({
      ...ev,
      gridRow: 2 + slot,
      gridSpan: span,
    })
  }
  return items
})

const allDayEvents = computed(() => {
  if (contentMode.value === 'tareas') return []
  return (eventosPorFecha.value[formatYmd(focusDay.value)] ?? []).filter((ev) => isAllDayEvent(ev))
})

type DayTimedTask = CalTask & {
  gridRow: number
  gridSpan: number
}

const dayTimedTasks = computed((): DayTimedTask[] => {
  const items: DayTimedTask[] = []
  for (const task of dayTasks.value) {
    if (task.eventId || !task.time) continue
    const minutes = minutesFromTask(task)
    if (minutes === null) continue
    const slot = Math.floor((minutes - dayStartMinutes) / 30)
    const span = gridSpanFromTask(task)
    if (slot < 0 || 2 + slot + span - 1 > GRID_ROWS) continue
    items.push({ ...task, gridRow: 2 + slot, gridSpan: span })
  }
  return items
})

const taskGridRowById = computed(() => {
  const map = new Map<string, number>()
  for (const task of dayTimedTasks.value) {
    map.set(task.id, task.gridRow)
  }
  return map
})

const eventGridRowById = computed(() => {
  const map = new Map<string, number>()
  for (const ev of dayEvents.value) {
    map.set(ev.id, ev.gridRow)
  }
  return map
})

const {
  beginResize: beginTaskResize,
  previewSpan: taskPreviewSpan,
  isResizingItem: isResizingTask,
  isSyncingItem: isSyncingTask,
  pendingEndTime: taskPendingEndTime,
  preview: taskResizePreview,
  justResized: justTaskResized,
} = useCalendarioGridResize({
  gridRef,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getStartGridRow: (id) => taskGridRowById.value.get(id) ?? null,
  canResize: () => !isDateBeforeToday(dayYmd.value),
  onCommit: (id, endTime) => resizeTask(id, endTime),
})

const {
  beginResize: beginEventResize,
  previewSpan: eventPreviewSpan,
  isResizingItem: isResizingEvent,
  isSyncingItem: isSyncingEvent,
  pendingEndTime: eventPendingEndTime,
  preview: eventResizePreview,
  justResized: justEventResized,
} = useCalendarioGridResize({
  gridRef,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getStartGridRow: (id) => eventGridRowById.value.get(id) ?? null,
  canResize: () => !isDateBeforeToday(dayYmd.value),
  onCommit: (id, endTime) => resizeEvent(id, endTime),
})

const justResized = computed(() => justTaskResized.value || justEventResized.value)

function taskSpan(task: DayTimedTask): number {
  return taskPreviewSpan(task.id, task.gridSpan)
}

function eventSpan(ev: DayTimedEvent): number {
  return eventPreviewSpan(ev.id, ev.gridSpan)
}

function timedGridBlockStateClass(
  isResizing: boolean,
  isSyncingResize: boolean,
  isSyncingDrag: boolean,
): string {
  if (isResizing) return timedGridResizingClass()
  if (isSyncingResize || isSyncingDrag) return timedGridSyncingClass()
  return ''
}

function taskTimeLabel(task: CalTask): string {
  const pendingStart = pendingDropStartTime(task.id, 'task')
  if (pendingStart && task.time) {
    const span = gridSpanFromTask(task)
    return dragPreviewTimeLabel(span, pendingStart)
  }
  const pendingEnd = taskPendingEndTime(task.id)
  if (pendingEnd && task.time) {
    return formatEventTimeRange(task.time, pendingEnd)
  }
  if (isResizingTask(task.id) && taskResizePreview.value && task.time) {
    return formatEventTimeRange(task.time, taskResizePreview.value.endTime)
  }
  return taskDisplayTime(task) ?? task.time ?? ''
}

function eventStartTime(ev: CalEvent): string {
  const min = minutesFromEvent(ev)
  if (min === null) return '00:00'
  return formatTimeLabel(Math.floor(min / 60) % 24, min % 60)
}

function eventTimeLabel(ev: CalEvent): string {
  const pendingStart = pendingDropStartTime(ev.id, 'event')
  if (pendingStart) {
    const span = gridSpanFromEvent(ev)
    return dragPreviewTimeLabel(span, pendingStart)
  }
  const pendingEnd = eventPendingEndTime(ev.id)
  if (pendingEnd) {
    return formatEventTimeRange(eventStartTime(ev), pendingEnd)
  }
  if (isResizingEvent(ev.id) && eventResizePreview.value) {
    return formatEventTimeRange(eventStartTime(ev), eventResizePreview.value.endTime)
  }
  return ev.time
}

function onTaskResizePointerDown(taskId: string, e: PointerEvent) {
  e.stopPropagation()
  beginTaskResize(taskId, e)
}

function onEventResizePointerDown(eventId: string, e: PointerEvent) {
  e.stopPropagation()
  beginEventResize(eventId, e)
}

const dragPreviewTask = computed(() => {
  if (!dragging.value || dragging.value.kind !== 'task') return null
  return dayTimedTasks.value.find((t) => t.id === dragging.value!.id) ?? null
})

const dragPreviewEvent = computed(() => {
  if (!dragging.value || dragging.value.kind !== 'event') return null
  return dayEvents.value.find((e) => e.id === dragging.value!.id) ?? null
})

const dayTasks = computed(() => tareasDelDia(formatYmd(focusDay.value)))

/** Tareas sueltas sin horario fijo en la grilla. */
const standaloneTasks = computed(() =>
  standaloneTasksForDay(dayTasks.value).filter((t) => !t.time),
)

function tasksForEvent(eventId: string): CalTask[] {
  return tasksLinkedToEvent(dayTasks.value, eventId)
}

function prevDay() {
  focusDay.value = addDays(focusDay.value, -1)
}

function nextDay() {
  focusDay.value = addDays(focusDay.value, 1)
}

function goToday() {
  const today = new Date()
  focusDay.value = today
  selectedDate.value = formatYmd(today)
}

function selectDay(date: string) {
  focusDay.value = parseYmd(date)
}

function prevMiniMonth() {
  const d = new Date(miniMonth.value)
  d.setMonth(d.getMonth() - 1)
  miniMonth.value = d
}

function nextMiniMonth() {
  const d = new Date(miniMonth.value)
  d.setMonth(d.getMonth() + 1)
  miniMonth.value = d
}

function miniDayNum(ymd: string): string {
  return String(parseYmd(ymd).getDate())
}

const detalleOpen = ref(false)
const detalle = ref<CalendarioDetalle | null>(null)

function openEventDetail(event: CalEvent) {
  detalle.value = { type: 'event', event }
  detalleOpen.value = true
}

function openTaskDetail(task: CalTask) {
  detalle.value = { type: 'task', task }
  detalleOpen.value = true
}

</script>

<template>
  <div :class="gcalShell">
    <CalendarioEscolarNavToolbar
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      :title="dayTitleLong"
      :datetime="dayDatetimeAttr"
      :subtitle="weekdayName"
      @prev="prevDay"
      @next="nextDay"
      @today="goToday"
      @refresh="$emit('refresh')"
    />

    <div :class="['isolate flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row', gcalSurface]">
      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          v-if="allDayEvents.length > 0"
          class="relative z-50 shrink-0 border-b border-gray-200 bg-white/80 px-4 py-2 dark:border-white/10 dark:bg-gray-900/80"
        >
          <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
            <span class="shrink-0 pt-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Todo el día
            </span>
            <div
              v-for="ev in allDayEvents"
              :key="ev.id"
              class="flex min-w-0 max-w-full flex-col gap-0.5"
            >
              <button
                type="button"
                :class="[monthEventBubbleClass(ev), 'max-w-full cursor-pointer']"
                :style="eventTypeBgStyleFromEvent(ev)"
                @click="openEventDetail(ev)"
              >
                {{ ev.name }}
              </button>
              <ul
                v-if="tasksForEvent(ev.id).length > 0"
                class="space-y-0.5 border-l-2 border-violet-400/60 pl-1.5 dark:border-violet-500/50"
              >
                <li v-for="task in tasksForEvent(ev.id)" :key="task.id">
                  <button
                    type="button"
                    class="inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] font-medium text-violet-800 hover:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                    @click.stop="openTaskDetail(task)"
                  >
                    <span class="size-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
                    <span class="truncate">{{ taskDisplayTitle(task) }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          v-if="standaloneTasks.length > 0"
          class="relative z-50 shrink-0 border-b border-gray-200 bg-white/80 px-4 py-2 dark:border-white/10 dark:bg-gray-900/80"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span class="shrink-0 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Sin horario
            </span>
            <button
              v-for="task in standaloneTasks"
              :key="task.id"
              type="button"
              class="inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-violet-400/70 bg-violet-50/80 px-2 py-1 text-left text-xs font-medium text-violet-900 transition-colors hover:bg-violet-100/90 dark:border-violet-500/50 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950/80"
              @click="openTaskDetail(task)"
            >
              <span class="size-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
              <span class="truncate">{{ taskDisplayTitle(task) }}</span>
            </button>
          </div>
        </div>
        <div
          class="grid shrink-0 grid-cols-7 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 text-xs text-gray-500 ring-1 ring-gray-200 md:hidden dark:divide-white/10 dark:border-white/10 dark:bg-gray-950 dark:ring-white/20"
        >
          <button
            v-for="day in weekStrip"
            :key="day.date"
            type="button"
            class="flex flex-col items-center pt-3 pb-1.5 hover:bg-gray-100/80 dark:hover:bg-white/5"
            @click="selectDay(day.date)"
          >
            <span>{{ day.shortLabel }}</span>
            <span
              :class="[
                'mt-3 flex size-8 items-center justify-center text-base font-normal text-[#3c4043] dark:text-gray-100',
                day.isSelected || day.isToday ? gcalTodayBadge : '',
              ]"
            >{{ day.dayNum }}</span>
          </button>
        </div>

        <div class="gcal-grid-with-gutter min-h-0 flex-1 overflow-hidden">
          <div
            class="gcal-scroll-viewport min-h-0 flex-1 border-r border-gray-200 dark:border-white/10"
          >
            <div ref="scrollContainerRef" class="gcal-scroll-outside h-full min-h-0">
              <div class="min-w-[16rem]">
            <div
              ref="gridRef"
              class="relative grid divide-x divide-gray-200 overflow-hidden dark:divide-white/5"
              :class="DAY_GRID_COLS"
              :style="{ gridTemplateRows: gridRowsStyle, minHeight: gridBodyMinHeight }"
            >
              <div
                :class="gcalWeekSlotAvailable"
                style="grid-row: 1; grid-column: 1"
                aria-hidden="true"
              ></div>
              <div
                :class="['border-t border-gray-200 dark:border-white/5', padCellClass()]"
                style="grid-row: 1; grid-column: 2"
                aria-hidden="true"
              ></div>

              <template v-for="(h, hourIndex) in hours" :key="h">
                <div
                  :class="['sticky left-0 z-10 px-1 text-right text-[10px] leading-none text-gray-500 dark:text-gray-400', gcalWeekSlotAvailable]"
                  :style="{ gridRow: `${hourGridRow(hourIndex, 'a')} / span 2`, gridColumn: 1 }"
                >
                  <span class="relative -top-2 block pr-1">{{ calendarioHourLabel(h) }}</span>
                </div>
                <div
                  :class="[
                    'border-t border-gray-200 dark:border-white/5',
                    slotCellClass(formatTimeLabel(h, 0)),
                  ]"
                  :style="{ gridRow: hourGridRow(hourIndex, 'a'), gridColumn: 2 }"
                ></div>
                <div
                  :class="slotCellClass(formatTimeLabel(h, 30))"
                  :style="{ gridRow: hourGridRow(hourIndex, 'b'), gridColumn: 2 }"
                ></div>
              </template>

              <ol
                class="pointer-events-none absolute inset-0 grid overflow-hidden"
                :class="DAY_GRID_COLS"
                :style="{ gridTemplateRows: gridRowsStyle }"
              >
                <li
                  v-for="slot in clickableSlots"
                  :key="slot.key"
                  class="pointer-events-auto relative col-start-2 z-[5]"
                  :class="isHoverCell(0, slot.gridRow) && !dragging ? 'z-[15]' : ''"
                  :style="{ gridRow: `${slot.gridRow} / span 1` }"
                >
                  <button
                    type="button"
                    class="absolute inset-0 focus:outline-none"
                    :class="
                      isSlotDisabled(slot.startTime)
                        ? gcalPastSlotDisabled
                        : [
                            gcalWeekSlotHover,
                            isHoverCell(0, slot.gridRow) && !dragging
                              ? gcalWeekSlotHoverActive
                              : '',
                          ]
                    "
                    :aria-label="
                      isSlotDisabled(slot.startTime)
                        ? `No disponible ${slot.startTime}`
                        : `Crear actividad a las ${slot.startTime}`
                    "
                    :disabled="isSlotDisabled(slot.startTime)"
                    @click="!dragging && onSlotClick(slot.startTime)"
                  />
                </li>
                <li
                  v-for="task in dayTimedTasks"
                  :key="`timed-task-${task.id}`"
                  class="col-start-2"
                  :class="[
                    timedGridItemLiClass(),
                    isDraggingItem(dragItemPayload('task', task.id, taskSpan(task), task.gridRow)) ? 'z-20' : '',
                    isResizingTask(task.id) || isSyncingTask(task.id) || isSyncingDragItem(dragItemPayload('task', task.id, taskSpan(task), task.gridRow)) ? 'z-30' : '',
                  ]"
                  :style="{ gridRow: `${task.gridRow} / span ${taskSpan(task)}` }"
                >
                  <div
                    :class="[
                      timedTaskBlockClass(),
                      dragItemClass(dragItemPayload('task', task.id, taskSpan(task), task.gridRow)),
                      'group text-left',
                      timedGridBlockStateClass(
                        isResizingTask(task.id),
                        isSyncingTask(task.id),
                        isSyncingDragItem(dragItemPayload('task', task.id, taskSpan(task), task.gridRow)),
                      ),
                    ]"
                    @pointerdown="onItemPointerDown(dragItemPayload('task', task.id, taskSpan(task), task.gridRow), $event)"
                    @click="!justDragged && !justResized && openTaskDetail(task)"
                  >
                    <p :class="timedTaskTitleClass()">{{ taskDisplayTitle(task) }}</p>
                    <p :class="timedTaskTimeClass()">{{ taskTimeLabel(task) }}</p>
                    <div
                      v-if="!isDateBeforeToday(dayYmd) && !isDraggingItem(dragItemPayload('task', task.id, taskSpan(task), task.gridRow)) && !isSyncingTask(task.id) && !isSyncingDragItem(dragItemPayload('task', task.id, taskSpan(task), task.gridRow))"
                      data-cal-resize
                      :class="timedTaskResizeHandleClass()"
                      aria-label="Ajustar duración de la tarea"
                      @pointerdown="onTaskResizePointerDown(task.id, $event)"
                    />
                  </div>
                </li>
                <li
                  v-for="ev in dayEvents"
                  :key="ev.id"
                  class="col-start-2"
                  :class="[
                    timedGridItemLiClass(),
                    isDraggingItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow)) ? 'z-20' : '',
                    isResizingEvent(ev.id) || isSyncingEvent(ev.id) || isSyncingDragItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow)) ? 'z-30' : '',
                  ]"
                  :style="{ gridRow: `${ev.gridRow} / span ${eventSpan(ev)}` }"
                >
                  <div
                    :class="[
                      timedEventBlockClass(ev),
                      dragEventClass(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow)),
                      'group flex min-h-0 flex-col',
                      eventSpan(ev) === 1 ? 'justify-center' : '',
                      timedGridBlockStateClass(
                        isResizingEvent(ev.id),
                        isSyncingEvent(ev.id),
                        isSyncingDragItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow)),
                      ),
                    ]"
                    :style="eventTypeBgStyleFromEvent(ev)"
                    @pointerdown="onItemPointerDown(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow), $event)"
                  >
                    <CalendarioEventTasksInline
                      :tasks="tasksForEvent(ev.id)"
                      :grid-span="eventSpan(ev)"
                      @open-task="openTaskDetail"
                      @open-event="openEventDetail(ev)"
                    >
                      <template #default="{ micro, hideTime }">
                        <button
                          type="button"
                          class="w-full shrink-0 cursor-pointer text-left focus:outline-none"
                          :class="micro ? 'flex h-full items-center' : ''"
                          :title="hideTime ? `${ev.name} · ${eventTimeLabel(ev)}` : undefined"
                          @click="!justDragged && !justResized && openEventDetail(ev)"
                        >
                          <p :class="[timedEventTitleClass(), micro && 'truncate leading-tight']">{{ ev.name }}</p>
                          <p v-if="!hideTime" :class="timedEventTimeClass()">
                            <time :datetime="ev.datetime">{{ eventTimeLabel(ev) }}</time>
                          </p>
                        </button>
                      </template>
                    </CalendarioEventTasksInline>
                    <div
                      v-if="!isDateBeforeToday(dayYmd) && !isDraggingItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow)) && !isSyncingEvent(ev.id) && !isSyncingDragItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.gridRow))"
                      data-cal-resize
                      :class="timedEventResizeHandleClass()"
                      aria-label="Ajustar duración del evento"
                      @pointerdown="onEventResizePointerDown(ev.id, $event)"
                    />
                  </div>
                </li>
                <li
                  v-if="showDragPreview() && hover && dragPreviewTask"
                  class="pointer-events-none relative col-start-2 z-30 mt-px min-w-0"
                  :style="{ gridRow: `${hover.gridRow} / span ${dragging!.span}` }"
                >
                  <div :class="[timedTaskBlockClass(), timedTaskDragPreviewClass()]">
                    <p :class="timedTaskTitleClass()">{{ taskDisplayTitle(dragPreviewTask) }}</p>
                    <p :class="timedTaskTimeClass()">
                      {{ dragPreviewTimeLabel(dragging!.span, hover.startTime) }}
                    </p>
                  </div>
                </li>
                <li
                  v-if="showDragPreview() && hover && dragPreviewEvent"
                  class="pointer-events-none relative col-start-2 z-30 mt-px min-w-0"
                  :style="{ gridRow: `${hover.gridRow} / span ${dragging!.span}` }"
                >
                  <div
                    :class="[timedEventBlockClass(dragPreviewEvent), timedEventDragPreviewClass()]"
                    :style="eventTypeBgStyleFromEvent(dragPreviewEvent)"
                  >
                    <p :class="timedEventTitleClass()">{{ dragPreviewEvent.name }}</p>
                    <p :class="timedEventTimeClass()">
                      {{ dragPreviewTimeLabel(dragging!.span, hover.startTime) }}
                    </p>
                  </div>
                </li>
              </ol>

              <CalendarioNowLineOverlay
                :show="showNowLine"
                :top-percent="nowLineTopPercent"
                :label="nowLineLabel"
              />
            </div>
              </div>
            </div>
          </div>
          <div class="gcal-scrollbar-gutter" aria-hidden="true"></div>
        </div>
      </div>

      <aside
        class="hidden w-80 max-w-xs shrink-0 flex-col border-l border-gray-200 px-6 py-6 md:flex dark:border-white/10"
      >
        <div class="flex items-center text-center text-gray-900 dark:text-white">
          <button
            type="button"
            class="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            @click="prevMiniMonth"
          >
            <span class="sr-only">Mes anterior</span>
            <ChevronLeftIcon class="size-5" aria-hidden="true" />
          </button>
          <div class="flex-auto text-sm font-semibold capitalize">
            <time :datetime="miniMonthDatetimeAttr">{{ miniMonthTitle }}</time>
          </div>
          <button
            type="button"
            class="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            @click="nextMiniMonth"
          >
            <span class="sr-only">Mes siguiente</span>
            <ChevronRightIcon class="size-5" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-6 grid grid-cols-7 text-center text-xs/6 font-medium text-gray-500 dark:text-gray-400">
          <div v-for="(label, i) in miniWeekLabels" :key="i">{{ label }}</div>
        </div>
        <div
          class="isolate mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-gray-200 text-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10"
        >
          <button
            v-for="day in miniDays"
            :key="day.date"
            type="button"
            :data-is-current-month="day.isCurrentMonth ? '' : undefined"
            :data-is-selected="day.isSelected ? '' : undefined"
            :data-is-today="day.isToday ? '' : undefined"
            class="py-1.5 not-data-is-current-month:bg-gray-100 not-data-is-selected:not-data-is-current-month:not-data-is-today:text-gray-400 first:rounded-tl-lg last:rounded-br-lg hover:bg-gray-50 focus:z-10 data-is-current-month:bg-white not-data-is-selected:data-is-current-month:not-data-is-today:text-gray-900 data-is-current-month:hover:bg-gray-50/80 data-is-selected:font-semibold data-is-selected:text-white data-is-today:font-semibold data-is-today:not-data-is-selected:text-indigo-600 nth-36:rounded-bl-lg nth-7:rounded-tr-lg dark:not-data-is-current-month:bg-gray-900/75 dark:not-data-is-selected:not-data-is-current-month:not-data-is-today:text-gray-500 dark:data-is-current-month:bg-gray-950 dark:not-data-is-selected:data-is-current-month:not-data-is-today:text-white dark:data-is-current-month:hover:bg-gray-900/50 dark:data-is-today:not-data-is-selected:text-indigo-400"
            @click="selectDay(day.date)"
          >
            <time
              :datetime="day.date"
              class="mx-auto flex size-7 items-center justify-center rounded-full in-data-is-selected:not-in-data-is-today:bg-indigo-600 in-data-is-selected:in-data-is-today:bg-indigo-600 in-data-is-selected:text-white in-data-is-today:bg-indigo-600 in-data-is-today:font-medium in-data-is-today:text-white dark:in-data-is-selected:not-in-data-is-today:bg-indigo-500 dark:in-data-is-selected:in-data-is-today:bg-indigo-500 dark:in-data-is-today:bg-indigo-500"
            >{{ miniDayNum(day.date) }}</time>
          </button>
        </div>
      </aside>
    </div>

    <CalendarioItemDetalleDialog v-model:open="detalleOpen" v-model:detalle="detalle" />

    <CalendarioSlotCrearDialog
      v-model:open="slotCrearOpen"
      v-model:date="selectedDate"
      :slot-time="selectedSlotTime"
      @add-event="$emit('add-event', $event)"
      @add-task="$emit('add-task', $event)"
    />
  </div>
</template>
