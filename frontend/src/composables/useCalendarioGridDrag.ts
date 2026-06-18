import { onBeforeUnmount, ref, type Ref } from 'vue'
import { isCalendarSlotCreateAllowed } from '@/utils/calendarioDates'
import { formatTimeLabel } from '@/utils/calendarioEventTime'

export type CalendarioDragKind = 'event' | 'task'

export interface CalendarioDragItem {
  kind: CalendarioDragKind
  id: string
  span: number
  dayIndex: number
  gridRow: number
}

export interface CalendarioGridDragConfig {
  gridRef: Ref<HTMLElement | null>
  dayCount: number
  gridRows: number
  dayStartMinutes: number
  slotMinutes?: number
  timeColRem?: number
  getDateForDayIndex: (dayIndex: number) => string | null
  canDrag?: (item: CalendarioDragItem) => boolean
  onDrop: (
    item: CalendarioDragItem,
    date: string,
    startTime: string,
  ) => void | boolean | Promise<void | boolean>
}

export interface CalendarioDragHover {
  dayIndex: number
  gridRow: number
  date: string
  startTime: string
}

export interface CalendarioDragOrigin {
  dayIndex: number
  gridRow: number
  date: string
  startTime: string
}

export interface CalendarioDragPendingDrop {
  item: CalendarioDragItem
  target: CalendarioDragHover
}

const DRAG_THRESHOLD_PX = 5

export function useCalendarioGridDrag(config: CalendarioGridDragConfig) {
  const slotMinutes = config.slotMinutes ?? 30
  const timeColRem = config.timeColRem ?? 3.5

  const dragging = ref<CalendarioDragItem | null>(null)
  const hover = ref<CalendarioDragHover | null>(null)
  const dragOrigin = ref<CalendarioDragOrigin | null>(null)
  const pendingDrop = ref<CalendarioDragPendingDrop | null>(null)
  const pointerId = ref<number | null>(null)
  const justDragged = ref(false)

  let startX = 0
  let startY = 0
  let pending: CalendarioDragItem | null = null

  function startTimeFromGridRow(gridRow: number): string {
    const slotIndex = gridRow - 2
    const minutes = config.dayStartMinutes + slotIndex * slotMinutes
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return formatTimeLabel(h, m)
  }

  function timeColWidthPx(): number {
    const rootFont =
      typeof document !== 'undefined'
        ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        : 16
    return timeColRem * rootFont
  }

  function pointerToHover(clientX: number, clientY: number): CalendarioDragHover | null {
    const el = config.gridRef.value
    if (!el) return null

    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const timeWidth = timeColWidthPx()
    const dayWidth = (rect.width - timeWidth) / config.dayCount

    if (x < timeWidth || dayWidth <= 0) return null

    const dayIndex = Math.min(config.dayCount - 1, Math.max(0, Math.floor((x - timeWidth) / dayWidth)))
    const date = config.getDateForDayIndex(dayIndex)
    if (!date) return null

    const rowHeight = rect.height / config.gridRows
    const gridRow = Math.min(config.gridRows - 1, Math.max(2, Math.floor(y / rowHeight)))
    const slotIndex = gridRow - 2
    const minutes = config.dayStartMinutes + slotIndex * slotMinutes
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h >= 24) return null

    return {
      dayIndex,
      gridRow,
      date,
      startTime: formatTimeLabel(h, m),
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (pointerId.value !== e.pointerId) return

    if (!dragging.value && pending) {
      const dx = Math.abs(e.clientX - startX)
      const dy = Math.abs(e.clientY - startY)
      if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return
      dragging.value = pending
      pending = null
      const date = config.getDateForDayIndex(dragging.value.dayIndex)
      if (date) {
        dragOrigin.value = {
          dayIndex: dragging.value.dayIndex,
          gridRow: dragging.value.gridRow,
          date,
          startTime: startTimeFromGridRow(dragging.value.gridRow),
        }
      }
    }

    if (!dragging.value) return
    hover.value = pointerToHover(e.clientX, e.clientY)
  }

  function clearPointerListeners() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  async function onPointerUp(e: PointerEvent) {
    if (pointerId.value !== e.pointerId) return

    const item = dragging.value ?? pending
    const target = hover.value
    const didDrag = !!dragging.value

    clearPointerListeners()
    pointerId.value = null
    pending = null
    dragging.value = null
    hover.value = null
    dragOrigin.value = null

    if (
      didDrag &&
      item &&
      target &&
      isCalendarSlotCreateAllowed(target.date, target.startTime)
    ) {
      pendingDrop.value = { item, target }
      justDragged.value = true

      try {
        await Promise.resolve(config.onDrop(item, target.date, target.startTime))
      } finally {
        pendingDrop.value = null
        window.setTimeout(() => {
          justDragged.value = false
        }, 200)
      }
    }
  }

  function beginDrag(item: CalendarioDragItem, e: PointerEvent) {
    if (pendingDrop.value) return
    if (config.canDrag && !config.canDrag(item)) return
    if (e.button !== 0) return

    pending = item
    startX = e.clientX
    startY = e.clientY
    pointerId.value = e.pointerId
    hover.value = pointerToHover(e.clientX, e.clientY)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function isDraggingItem(item: CalendarioDragItem): boolean {
    return dragging.value?.kind === item.kind && dragging.value.id === item.id
  }

  function isSyncingItem(item: CalendarioDragItem): boolean {
    const pending = pendingDrop.value
    if (!pending) return false
    return pending.item.kind === item.kind && pending.item.id === item.id
  }

  function pendingDropStartTime(id: string, kind: CalendarioDragKind): string | null {
    const pending = pendingDrop.value
    if (!pending || pending.item.kind !== kind || pending.item.id !== id) return null
    return pending.target.startTime
  }

  function isAtDragOrigin(): boolean {
    if (!dragging.value || !hover.value || !dragOrigin.value) return true
    return (
      dragOrigin.value.dayIndex === hover.value.dayIndex &&
      dragOrigin.value.gridRow === hover.value.gridRow
    )
  }

  function showDragPreview(): boolean {
    return (
      !!dragging.value &&
      !!hover.value &&
      !isAtDragOrigin() &&
      isCalendarSlotCreateAllowed(hover.value.date, hover.value.startTime)
    )
  }

  function isHoverCell(dayIndex: number, gridRow: number): boolean {
    return hover.value?.dayIndex === dayIndex && hover.value?.gridRow === gridRow
  }

  onBeforeUnmount(() => {
    clearPointerListeners()
  })

  return {
    dragging,
    hover,
    dragOrigin,
    pendingDrop,
    justDragged,
    beginDrag,
    isDraggingItem,
    isSyncingItem,
    pendingDropStartTime,
    isHoverCell,
    isAtDragOrigin,
    showDragPreview,
  }
}
