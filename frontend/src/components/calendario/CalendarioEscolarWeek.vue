<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { useCalendarioGridDrag, type CalendarioDragItem } from '@/composables/useCalendarioGridDrag'
import { useCalendarioGridResize } from '@/composables/useCalendarioGridResize'
import { taskTipoOf } from '@/data/calendarioTareaOptions'
import { sidebarTaskCardClass, sidebarTaskDotClass, taskDisplayTitle, taskDisplayTime, timedTaskBlockClass, timedTaskDragGhostClass, timedTaskDragPreviewClass, timedTaskResizeHandleClass, timedTaskTimeClass, timedTaskTitleClass } from '@/utils/calendarioTaskStyles'
import { gridSpanFromEvent, gridSpanFromTask, isAllDayEvent, minutesFromEvent, minutesFromTask, formatTimeLabel, formatEventTimeRange, parseTimeToMinutes } from '@/utils/calendarioEventTime'
import {
  timedEventBlockClass,
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
  parseYmd,
  startOfWeekMonday,
} from '@/utils/calendarioDates'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { gcalBorder, gcalShell, gcalTodayBadge } from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'
import CalendarioSlotCrearDialog from '@/components/calendario/CalendarioSlotCrearDialog.vue'

defineOptions({ name: 'CalendarioEscolarWeek' })

const schoolYear = defineModel<number>('schoolYear', { default: 2026 })
const selectedDate = defineModel<string | null>('selectedDate', { default: null })
const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  'add-event': [startTime?: string]
  'add-task': [startTime?: string]
  refresh: []
}>()
/** Misma grilla en cabecera y cuerpo: columna horas + 7 días */
const WEEK_GRID_COLS = 'grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]'
const DAY_START_HOUR = 7
const hours = Array.from({ length: 24 - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)
/** +1 fila vacía bajo cabecera de días (evita solapar la 1.ª media hora de 7:00) */
const GRID_ROWS = hours.length * 2 + 1
const gridBodyMinHeight = `${hours.length * 3.5 + 1.75}rem`
const gridRowsStyle = `repeat(${GRID_ROWS}, minmax(3.5rem, 1fr))`
const dayStartMinutes = DAY_START_HOUR * 60

const { porFecha: eventosPorFecha, moveEvent, resizeEvent } = useCalendarioEscolarEvents()
const { tareasDelDia, moveTask, resizeTask } = useCalendarioEscolarTasks()

const gridRef = ref<HTMLElement | null>(null)

function dateForDragItem(item: CalendarioDragItem): string | null {
  return weekDays.value[item.dayIndex]?.date ?? null
}

const { dragging, hover, beginDrag, isDraggingItem, isHoverCell, showDragPreview } = useCalendarioGridDrag({
  gridRef,
  dayCount: 7,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getDateForDayIndex: (i) => weekDays.value[i]?.date ?? null,
  canDrag: (item) => {
    const date = dateForDragItem(item)
    return !!date && !isDateBeforeToday(date)
  },
  onDrop: (item, date, startTime) => {
    if (item.kind === 'event') moveEvent(item.id, date, startTime)
    else moveTask(item.id, date, startTime)
  },
})

function dragItemClass(item: CalendarioDragItem, extra = ''): string {
  if (isDraggingItem(item)) {
    return [extra, timedTaskDragGhostClass()].filter(Boolean).join(' ')
  }
  const date = dateForDragItem(item)
  const dragCursor =
    date && !isDateBeforeToday(date)
      ? 'cursor-grab touch-none select-none active:cursor-grabbing'
      : 'cursor-default'
  return [extra, dragCursor].filter(Boolean).join(' ')
}

function dragEventClass(item: CalendarioDragItem, extra = ''): string {
  if (isDraggingItem(item)) {
    return [extra, timedEventDragGhostClass()].filter(Boolean).join(' ')
  }
  const date = dateForDragItem(item)
  const dragCursor =
    date && !isDateBeforeToday(date)
      ? 'cursor-grab touch-none select-none active:cursor-grabbing'
      : 'cursor-default'
  return [extra, dragCursor].filter(Boolean).join(' ')
}

function dragItemPayload(
  kind: CalendarioDragItem['kind'],
  id: string,
  span: number,
  colStart: number,
  gridRow: number,
): CalendarioDragItem {
  return { kind, id, span, dayIndex: colStart - 2, gridRow }
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

const weekStart = ref(startOfWeekMonday(selectedDate.value ? parseYmd(selectedDate.value) : new Date()))

watch(
  () => selectedDate.value,
  (d) => {
    if (!d) return
    const monday = startOfWeekMonday(parseYmd(d))
    if (formatYmd(monday) !== formatYmd(weekStart.value)) {
      weekStart.value = monday
    }
  },
)

watch(weekStart, () => {
  const y = weekStart.value.getFullYear()
  if (schoolYear.value !== y) schoolYear.value = y
})

const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const weekDaysLong = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

interface WeekDay {
  date: string
  dayNum: number
  shortLabel: string
  longLabel: string
  isToday: boolean
  isSelected: boolean
}

const todayStr = formatYmd(new Date())

const weekDays = computed((): WeekDay[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart.value, i)
    const date = formatYmd(d)
    return {
      date,
      dayNum: d.getDate(),
      shortLabel: weekDaysShort[i],
      longLabel: weekDaysLong[i],
      isToday: date === todayStr,
      isSelected: selectedDate.value === date,
    }
  })
})

const weekTitle = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  if (!start || !end) return ''
  const startD = parseYmd(start.date)
  const endD = parseYmd(end.date)
  const fmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })
  if (startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear()) {
    return `${start.dayNum} – ${end.dayNum} de ${fmt.format(endD).split(' de ').slice(1).join(' de ')}`
  }
  return `${fmt.format(startD)} – ${fmt.format(endD)}`
})

const weekDatetimeAttr = computed(() => {
  const d = weekStart.value
  return `${d.getFullYear()}-W${padWeek(d)}`
})

function padWeek(d: Date): string {
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return week < 10 ? `0${week}` : String(week)
}

function hourLabel(h: number): string {
  if (h === 0) return '12AM'
  if (h < 12) return `${h}AM`
  if (h === 12) return '12PM'
  return `${h - 12}PM`
}

type WeekTimedEvent = CalEvent & {
  date: string
  colStart: number
  gridRow: number
  gridSpan: number
}

const weekEvents = computed((): WeekTimedEvent[] => {
  const items: WeekTimedEvent[] = []
  weekDays.value.forEach((day, dayIndex) => {
    const events = eventosPorFecha.value[day.date] ?? []
    for (const ev of events) {
      if (isAllDayEvent(ev)) continue
      const minutes = minutesFromEvent(ev)
      if (minutes === null) continue
      const slot = Math.floor((minutes - dayStartMinutes) / 30)
      const span = gridSpanFromEvent(ev)
      if (slot < 0 || 2 + slot + span - 1 > GRID_ROWS) continue
      items.push({
        ...ev,
        date: day.date,
        colStart: dayIndex + 2,
        gridRow: 2 + slot,
        gridSpan: span,
      })
    }
  })
  return items
})

type WeekTimedTask = CalTask & {
  date: string
  colStart: number
  gridRow: number
  gridSpan: number
}

const weekTimedTasks = computed((): WeekTimedTask[] => {
  const items: WeekTimedTask[] = []
  weekDays.value.forEach((day, dayIndex) => {
    for (const task of weekTasksForDay(day.date)) {
      if (task.eventId || !task.time) continue
      const minutes = minutesFromTask(task)
      if (minutes === null) continue
      const slot = Math.floor((minutes - dayStartMinutes) / 30)
      const span = gridSpanFromTask(task)
      if (slot < 0 || 2 + slot + span - 1 > GRID_ROWS) continue
      items.push({
        ...task,
        date: day.date,
        colStart: dayIndex + 2,
        gridRow: 2 + slot,
        gridSpan: span,
      })
    }
  })
  return items
})

const taskGridRowById = computed(() => {
  const map = new Map<string, number>()
  for (const task of weekTimedTasks.value) {
    map.set(task.id, task.gridRow)
  }
  return map
})

const eventGridRowById = computed(() => {
  const map = new Map<string, number>()
  for (const ev of weekEvents.value) {
    map.set(ev.id, ev.gridRow)
  }
  return map
})

const {
  beginResize: beginTaskResize,
  previewSpan: taskPreviewSpan,
  isResizingItem: isResizingTask,
  preview: taskResizePreview,
} = useCalendarioGridResize({
  gridRef,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getStartGridRow: (id) => taskGridRowById.value.get(id) ?? null,
  canResize: (id) => {
    const task = weekTimedTasks.value.find((t) => t.id === id)
    if (task) return !isDateBeforeToday(task.date)
    const ev = weekEvents.value.find((e) => e.id === id)
    return ev ? !isDateBeforeToday(ev.date) : false
  },
  onCommit: (id, endTime) => resizeTask(id, endTime),
})

const {
  beginResize: beginEventResize,
  previewSpan: eventPreviewSpan,
  isResizingItem: isResizingEvent,
  preview: eventResizePreview,
} = useCalendarioGridResize({
  gridRef,
  gridRows: GRID_ROWS,
  dayStartMinutes,
  getStartGridRow: (id) => eventGridRowById.value.get(id) ?? null,
  canResize: (id) => {
    const task = weekTimedTasks.value.find((t) => t.id === id)
    if (task) return !isDateBeforeToday(task.date)
    const ev = weekEvents.value.find((e) => e.id === id)
    return ev ? !isDateBeforeToday(ev.date) : false
  },
  onCommit: (id, endTime) => resizeEvent(id, endTime),
})

function taskSpan(task: WeekTimedTask): number {
  return taskPreviewSpan(task.id, task.gridSpan)
}

function eventSpan(ev: WeekTimedEvent): number {
  return eventPreviewSpan(ev.id, ev.gridSpan)
}

function taskTimeLabel(task: CalTask): string {
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

function weekAllDayEvents(date: string) {
  return (eventosPorFecha.value[date] ?? []).filter((ev) => isAllDayEvent(ev))
}

const hasWeekAllDayEvents = computed(() =>
  weekDays.value.some((day) => weekAllDayEvents(day.date).length > 0),
)

function eventTimeLabel(ev: CalEvent): string {
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
  return weekTimedTasks.value.find((t) => t.id === dragging.value!.id) ?? null
})

const dragPreviewEvent = computed(() => {
  if (!dragging.value || dragging.value.kind !== 'event') return null
  return weekEvents.value.find((e) => e.id === dragging.value!.id) ?? null
})

interface WeekSlot {
  key: string
  date: string
  startTime: string
  gridRow: number
  colStart: number
}

const clickableSlots = computed((): WeekSlot[] => {
  const slots: WeekSlot[] = []
  weekDays.value.forEach((day, dayIndex) => {
    for (let row = 2; row < GRID_ROWS; row++) {
      const slotIndex = row - 2
      const minutes = dayStartMinutes + slotIndex * 30
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      slots.push({
        key: `${day.date}-${row}`,
        date: day.date,
        startTime: formatTimeLabel(h, m),
        gridRow: row,
        colStart: dayIndex + 2,
      })
    }
  })
  return slots
})

const slotCrearOpen = ref(false)
const selectedSlotTime = ref<string | null>(null)

function prevWeek() {
  weekStart.value = addDays(weekStart.value, -7)
}

function nextWeek() {
  weekStart.value = addDays(weekStart.value, 7)
}

function goToday() {
  const today = new Date()
  weekStart.value = startOfWeekMonday(today)
  selectedDate.value = formatYmd(today)
}

function selectDay(date: string) {
  if (isDateBeforeToday(date)) return
  selectedDate.value = date
  selectedSlotTime.value = null
  slotCrearOpen.value = true
}

function onSlotClick(date: string, startTime: string) {
  if (isDateBeforeToday(date)) return
  selectedDate.value = date
  selectedSlotTime.value = startTime
  slotCrearOpen.value = true
}

function weekTasksForDay(date: string) {
  return tareasDelDia(date)
}

function weekTasksSinHorario(date: string) {
  return weekTasksForDay(date).filter((t) => !t.time && !t.eventId)
}

const hasWeekTasks = computed(() =>
  weekDays.value.some((day) => weekTasksSinHorario(day.date).length > 0),
)

function linkedEventName(eventId: string): string | null {
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === eventId)
    if (ev) return ev.name
  }
  return null
}

</script>

<template>
  <div :class="gcalShell">
    <CalendarioEscolarNavToolbar
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      :title="weekTitle"
      :datetime="weekDatetimeAttr"
      @prev="prevWeek"
      @next="nextWeek"
      @today="goToday"
      @refresh="$emit('refresh')"
    />

    <div class="isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#202124]">
      <div
        class="grid shrink-0 divide-x bg-white text-sm/6 text-[#70757a] dark:divide-white/10 dark:bg-[#202124]"
        :class="[WEEK_GRID_COLS, gcalBorder, 'border-b']"
      >
        <div aria-hidden="true"></div>
        <button
          v-for="day in weekDays"
          :key="day.date"
          type="button"
          class="flex flex-col items-center justify-center gap-1 py-2.5 hover:bg-[#f1f3f4] sm:flex-row sm:gap-1.5 sm:py-3 dark:hover:bg-white/5"
          @click="selectDay(day.date)"
        >
          <span class="text-[11px] font-medium uppercase sm:hidden">{{ day.shortLabel }}</span>
          <span class="hidden text-[11px] font-medium uppercase sm:inline">{{ day.longLabel }}</span>
          <span
            :class="[
              'flex size-8 items-center justify-center text-sm font-normal text-[#3c4043] dark:text-gray-100',
              day.isToday ? gcalTodayBadge : '',
            ]"
          >{{ day.dayNum }}</span>
        </button>
      </div>

      <div
        v-if="hasWeekAllDayEvents"
        class="grid shrink-0 divide-x divide-gray-200 border-b border-gray-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-gray-900"
        :class="WEEK_GRID_COLS"
      >
        <div class="px-2 py-2 text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
          Todo el día
        </div>
        <div
          v-for="day in weekDays"
          :key="`allday-${day.date}`"
          class="flex flex-wrap gap-1 px-1.5 py-2"
        >
          <span
            v-for="ev in weekAllDayEvents(day.date)"
            :key="ev.id"
            :class="[monthEventBubbleClass(ev), 'max-w-full']"
            :title="ev.name"
          >
            {{ ev.name }}
          </span>
        </div>
      </div>

      <div
        v-if="hasWeekTasks"
        class="grid shrink-0 divide-x divide-gray-200 border-b border-gray-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-gray-900"
        :class="WEEK_GRID_COLS"
      >
        <div class="px-2 py-2 text-[10px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
          Tareas
        </div>
        <div
          v-for="day in weekDays"
          :key="`tasks-${day.date}`"
          class="space-y-1.5 px-1.5 py-2"
        >
          <div
            v-for="task in weekTasksSinHorario(day.date)"
            :key="task.id"
            :class="[sidebarTaskCardClass(!!task.eventId), 'text-xs']"
          >
            <div class="flex items-start gap-1.5">
              <span :class="[sidebarTaskDotClass(), 'mt-0.5']" aria-hidden="true" />
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-900 dark:text-white">{{ taskDisplayTitle(task) }}</p>
                <p class="truncate text-[10px] text-gray-500 dark:text-gray-400">{{ taskTipoOf(task) }}</p>
                <p
                  v-if="task.eventId && linkedEventName(task.eventId)"
                  class="truncate text-[10px] font-medium text-violet-700 dark:text-violet-300"
                >
                  {{ linkedEventName(task.eventId) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <div class="min-w-[40rem]">
          <div
            ref="gridRef"
            class="relative grid divide-x divide-gray-200 dark:divide-white/5"
            :class="WEEK_GRID_COLS"
            :style="{ gridTemplateRows: gridRowsStyle, minHeight: gridBodyMinHeight }"
          >
          <div class="sticky left-0 z-10 bg-gray-50 dark:bg-gray-950" aria-hidden="true"></div>
          <div
            v-for="dayIndex in 7"
            :key="`pad-${dayIndex}`"
            class="border-t border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-gray-950"
          ></div>

          <template v-for="h in hours" :key="h">
            <div
              class="sticky left-0 z-10 bg-gray-50 px-1 text-right text-xs/5 text-gray-500 dark:bg-gray-950 dark:text-gray-400"
            >
              <span class="-mt-2 block pr-1">{{ hourLabel(h) }}</span>
            </div>
            <div
              v-for="dayIndex in 7"
              :key="`${h}-a-${dayIndex}`"
              class="border-t border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-gray-950"
            ></div>
            <div
              class="sticky left-0 z-10 border-t border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-gray-950"
              aria-hidden="true"
            ></div>
            <div
              v-for="dayIndex in 7"
              :key="`${h}-b-${dayIndex}`"
              class="border-t border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-gray-950"
            ></div>
          </template>

          <ol
            class="pointer-events-none absolute inset-0 grid"
            :class="WEEK_GRID_COLS"
            :style="{ gridTemplateRows: gridRowsStyle }"
          >
            <li
              v-for="slot in clickableSlots"
              :key="slot.key"
              class="pointer-events-auto relative z-[5]"
              :class="isHoverCell(slot.colStart - 2, slot.gridRow) ? 'z-[15]' : ''"
              :style="{ gridRow: `${slot.gridRow} / span 1`, gridColumnStart: slot.colStart }"
            >
              <button
                type="button"
                class="absolute inset-0 cursor-pointer hover:bg-[#1a73e8]/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a73e8] dark:hover:bg-[#8ab4f8]/10"
                :class="isHoverCell(slot.colStart - 2, slot.gridRow) && !dragging ? 'bg-[#1a73e8]/15 ring-2 ring-inset ring-[#1a73e8]/40' : ''"
                :aria-label="`Crear actividad el ${slot.date} a las ${slot.startTime}`"
                @click="!dragging && onSlotClick(slot.date, slot.startTime)"
              />
            </li>
            <li
              v-for="task in weekTimedTasks"
              :key="`task-${task.id}-${task.date}`"
              class="pointer-events-auto relative z-10 mt-px min-w-0"
              :class="[
                isDraggingItem(dragItemPayload('task', task.id, taskSpan(task), task.colStart, task.gridRow)) ? 'z-20' : '',
                isResizingTask(task.id) ? 'z-30' : '',
              ]"
              :style="{ gridRow: `${task.gridRow} / span ${taskSpan(task)}`, gridColumnStart: task.colStart }"
            >
              <div
                :class="[
                  timedTaskBlockClass(),
                  dragItemClass(dragItemPayload('task', task.id, taskSpan(task), task.colStart, task.gridRow)),
                  isResizingTask(task.id) ? 'ring-2 ring-white/50' : '',
                ]"
                @pointerdown="onItemPointerDown(dragItemPayload('task', task.id, taskSpan(task), task.colStart, task.gridRow), $event)"
              >
                <p :class="timedTaskTitleClass()">{{ taskDisplayTitle(task) }}</p>
                <p :class="timedTaskTimeClass()">{{ taskTimeLabel(task) }}</p>
                <div
                  v-if="!isDateBeforeToday(task.date) && !isDraggingItem(dragItemPayload('task', task.id, taskSpan(task), task.colStart, task.gridRow))"
                  data-cal-resize
                  :class="timedTaskResizeHandleClass()"
                  aria-label="Ajustar duración de la tarea"
                  @pointerdown="onTaskResizePointerDown(task.id, $event)"
                />
              </div>
            </li>
            <li
              v-for="ev in weekEvents"
              :key="`${ev.id}-${ev.date}`"
              class="pointer-events-auto relative z-10 mt-px min-w-0 before:pointer-events-none before:absolute before:inset-1 before:z-0 before:rounded-lg before:bg-gray-50 dark:before:bg-gray-950"
              :class="[
                isDraggingItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.colStart, ev.gridRow)) ? 'z-20' : '',
                isResizingEvent(ev.id) ? 'z-30' : '',
              ]"
              :style="{ gridRow: `${ev.gridRow} / span ${eventSpan(ev)}`, gridColumnStart: ev.colStart }"
            >
              <div
                :class="[
                  timedEventBlockClass(ev),
                  dragEventClass(dragItemPayload('event', ev.id, eventSpan(ev), ev.colStart, ev.gridRow)),
                  isResizingEvent(ev.id) ? 'ring-2 ring-white/50' : '',
                ]"
                @pointerdown="onItemPointerDown(dragItemPayload('event', ev.id, eventSpan(ev), ev.colStart, ev.gridRow), $event)"
              >
                <p :class="timedEventTitleClass()">{{ ev.name }}</p>
                <p :class="timedEventTimeClass()">
                  <time :datetime="ev.datetime">{{ eventTimeLabel(ev) }}</time>
                </p>
                <div
                  v-if="!isDateBeforeToday(ev.date) && !isDraggingItem(dragItemPayload('event', ev.id, eventSpan(ev), ev.colStart, ev.gridRow))"
                  data-cal-resize
                  :class="timedEventResizeHandleClass()"
                  aria-label="Ajustar duración del evento"
                  @pointerdown="onEventResizePointerDown(ev.id, $event)"
                />
              </div>
            </li>
            <li
              v-if="showDragPreview() && hover && dragPreviewTask"
              class="pointer-events-none relative z-30 mt-px min-w-0"
              :style="{ gridRow: `${hover.gridRow} / span ${dragging!.span}`, gridColumnStart: hover.dayIndex + 2 }"
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
              class="pointer-events-none relative z-30 mt-px min-w-0"
              :style="{ gridRow: `${hover.gridRow} / span ${dragging!.span}`, gridColumnStart: hover.dayIndex + 2 }"
            >
              <div :class="[timedEventBlockClass(dragPreviewEvent), timedEventDragPreviewClass()]">
                <p :class="timedEventTitleClass()">{{ dragPreviewEvent.name }}</p>
                <p :class="timedEventTimeClass()">
                  {{ dragPreviewTimeLabel(dragging!.span, hover.startTime) }}
                </p>
              </div>
            </li>
          </ol>
          </div>
        </div>
      </div>
    </div>

    <CalendarioSlotCrearDialog
      v-model:open="slotCrearOpen"
      v-model:date="selectedDate"
      :slot-time="selectedSlotTime"
      @add-event="$emit('add-event', $event)"
      @add-task="$emit('add-task', $event)"
    />
  </div>
</template>
