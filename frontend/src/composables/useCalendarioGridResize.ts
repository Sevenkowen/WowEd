import { onBeforeUnmount, ref, type Ref } from 'vue'
import { formatTimeLabel } from '@/utils/calendarioEventTime'

export interface CalendarioGridResizeConfig {
  gridRef: Ref<HTMLElement | null>
  gridRows: number
  dayStartMinutes: number
  slotMinutes?: number
  getStartGridRow: (taskId: string) => number | null
  canResize?: (id: string) => boolean
  onCommit: (taskId: string, endTime: string) => void
}

export interface CalendarioResizePreview {
  taskId: string
  endGridRow: number
  endTime: string
  gridSpan: number
}

export function useCalendarioGridResize(config: CalendarioGridResizeConfig) {
  const slotMinutes = config.slotMinutes ?? 30
  const resizing = ref(false)
  const preview = ref<CalendarioResizePreview | null>(null)
  const justResized = ref(false)

  let taskId: string | null = null
  let startGridRow = 0
  let pointerId: number | null = null

  function gridRowFromPointer(clientY: number): number | null {
    const el = config.gridRef.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.height - 1, clientY - rect.top))
    const rowHeight = rect.height / config.gridRows
    return Math.min(config.gridRows - 1, Math.max(2, Math.floor(y / rowHeight) + 1))
  }

  function endTimeFromGridRow(endGridRow: number): string {
    const endMinutes = config.dayStartMinutes + (endGridRow - 2 + 1) * slotMinutes
    return formatTimeLabel(Math.floor(endMinutes / 60) % 24, endMinutes % 60)
  }

  function updatePreview(clientY: number) {
    if (taskId === null) return
    const hoveredRow = gridRowFromPointer(clientY)
    if (hoveredRow === null) return
    const endGridRow = Math.max(startGridRow, hoveredRow)
    const gridSpan = endGridRow - startGridRow + 1
    preview.value = {
      taskId,
      endGridRow,
      endTime: endTimeFromGridRow(endGridRow),
      gridSpan,
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (pointerId !== e.pointerId) return
    updatePreview(e.clientY)
  }

  function onPointerUp(e: PointerEvent) {
    if (pointerId !== e.pointerId) return

    if (preview.value && taskId !== null) {
      config.onCommit(taskId, preview.value.endTime)
      justResized.value = true
      window.setTimeout(() => {
        justResized.value = false
      }, 200)
    }

    resizing.value = false
    preview.value = null
    taskId = null
    pointerId = null

    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  function beginResize(id: string, e: PointerEvent) {
    if (e.button !== 0) return
    if (config.canResize && !config.canResize(id)) return
    const row = config.getStartGridRow(id)
    if (row === null) return

    e.preventDefault()
    e.stopPropagation()

    taskId = id
    startGridRow = row
    pointerId = e.pointerId
    resizing.value = true
    updatePreview(e.clientY)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function previewSpan(id: string, defaultSpan: number): number {
    if (preview.value?.taskId === id) return preview.value.gridSpan
    return defaultSpan
  }

  function isResizingItem(id: string): boolean {
    return preview.value?.taskId === id
  }

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  })

  return {
    resizing,
    preview,
    justResized,
    beginResize,
    previewSpan,
    isResizingItem,
    /** @deprecated use isResizingItem */
    isResizingTask: isResizingItem,
  }
}
