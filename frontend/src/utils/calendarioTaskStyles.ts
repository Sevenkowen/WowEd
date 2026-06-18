import type { CalTask } from '@/data/calendarioEscolarTypes'
import { formatEventTimeRange } from '@/utils/calendarioEventTime'
import { timedGridBlockLayoutClass } from '@/utils/calendarioTimedGridStyles'

const monthBubbleBase =
  'block w-full min-w-0 truncate rounded px-1.5 py-px text-left text-[11px] font-normal leading-[18px] transition-[filter]'

const sidebarCardBase =
  'rounded-lg border border-dashed px-3 py-2.5 text-sm ring-1 ring-inset border-violet-300 bg-violet-50 ring-violet-500/10 dark:border-violet-500/40 dark:bg-violet-950/40 dark:ring-violet-500/15'

const linkedCardBase =
  'rounded-lg border px-3 py-2.5 text-sm ring-1 ring-inset border-violet-200/80 bg-violet-50/80 ring-violet-500/10 dark:border-violet-500/30 dark:bg-violet-950/30 dark:ring-violet-500/15'

export function monthTaskBubbleClass(): string {
  return `${monthBubbleBase} bg-[#8E24AA] text-white hover:brightness-95`
}

export function dayPopoverTaskPillClass(): string {
  return `${monthBubbleBase} w-full cursor-pointer rounded bg-[#8E24AA] px-2.5 py-1.5 text-left text-sm font-normal text-white hover:brightness-95`
}

export function sidebarTaskCardClass(linked: boolean): string {
  return linked ? linkedCardBase : sidebarCardBase
}

export function sidebarTaskDotClass(): string {
  return 'size-2 shrink-0 rounded-full bg-violet-500'
}

export function sidebarTaskMetaClass(): string {
  return 'mt-1 text-xs font-medium text-violet-700 dark:text-violet-300'
}

export function taskDisplayTitle(task: CalTask): string {
  return task.title
}

export function taskDisplayTime(task: CalTask): string | null {
  if (!task.time) return null
  if (task.endTime && task.endTime !== task.time) {
    return formatEventTimeRange(task.time, task.endTime)
  }
  return task.time
}

export function timedTaskBlockClass(): string {
  return `${timedGridBlockLayoutClass} bg-[#8E24AA]`
}

export function timedTaskResizeHandleClass(): string {
  return 'absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-ns-resize touch-none'
}

export function timedTaskDragGhostClass(): string {
  return 'pointer-events-none opacity-[0.38] saturate-[0.85]'
}

export function timedTaskDragPreviewClass(): string {
  return 'pointer-events-none shadow-md ring-2 ring-indigo-500/35'
}

export function timedTaskTimeClass(): string {
  return 'text-[10px] font-normal leading-tight text-white/90'
}

export function timedTaskTitleClass(): string {
  return 'text-xs font-medium leading-snug text-white'
}
