import type { CalEvent } from '@/data/calendarioEscolarDemo'
import { resolveEventTypeColor } from '@/composables/useCalendarioCatalogs'
import { timedGridBlockLayoutClass } from '@/utils/calendarioTimedGridStyles'

type EventTypeStyle = {
  bubble: string
  card: string
  dot: string
  time: string
}

const monthBubbleBase =
  'block w-full min-w-0 truncate rounded px-1.5 py-px text-left text-[11px] font-normal leading-[18px] text-white transition-[filter] hover:brightness-95'

const sidebarCardBase = 'rounded-lg border px-3 py-2.5 text-sm ring-1 ring-inset'

const typeStyles: Record<string, EventTypeStyle> = {
  'Jornada Institucional': {
    bubble: `${monthBubbleBase} bg-[#039BE5]`,
    card: `${sidebarCardBase} border-sky-200 bg-sky-50 ring-sky-500/10 dark:border-sky-500/35 dark:bg-sky-950/45 dark:ring-sky-500/15`,
    dot: 'bg-sky-400',
    time: 'text-sky-800 dark:text-sky-300',
  },
  'Fecha Administrativa': {
    bubble: `${monthBubbleBase} bg-[#3F51B5]`,
    card: `${sidebarCardBase} border-indigo-200 bg-indigo-50 ring-indigo-500/10 dark:border-indigo-500/35 dark:bg-indigo-950/45 dark:ring-indigo-500/15`,
    dot: 'bg-indigo-500',
    time: 'text-indigo-800 dark:text-indigo-300',
  },
  'Evento Escolar': {
    bubble: `${monthBubbleBase} bg-[#F4511E]`,
    card: `${sidebarCardBase} border-orange-200 bg-orange-50 ring-orange-500/10 dark:border-orange-500/35 dark:bg-orange-950/40 dark:ring-orange-500/15`,
    dot: 'bg-orange-400',
    time: 'text-orange-800 dark:text-orange-300',
  },
  Feriado: {
    bubble: `${monthBubbleBase} bg-[#0B8043]`,
    card: `${sidebarCardBase} border-pink-200 bg-pink-50 ring-pink-500/10 dark:border-pink-500/35 dark:bg-pink-950/40 dark:ring-pink-500/15`,
    dot: 'bg-pink-400',
    time: 'text-pink-800 dark:text-pink-300',
  },
  Otro: {
    bubble: `${monthBubbleBase} bg-[#616161]`,
    card: `${sidebarCardBase} border-gray-200 bg-gray-50 ring-gray-500/10 dark:border-white/15 dark:bg-white/5 dark:ring-white/10`,
    dot: 'bg-gray-400',
    time: 'text-gray-600 dark:text-gray-400',
  },
}

const defaultStyle: EventTypeStyle = {
  bubble: `${monthBubbleBase} bg-[#7986CB]`,
  card: `${sidebarCardBase} border-emerald-200 bg-emerald-50 ring-emerald-500/10 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:ring-emerald-500/15`,
  dot: 'bg-emerald-600',
  time: 'text-emerald-800 dark:text-emerald-300',
}

function styleForEvent(event: CalEvent): EventTypeStyle {
  if (event.eventType && typeStyles[event.eventType]) {
    return typeStyles[event.eventType]
  }
  return defaultStyle
}

export function timedEventResizeHandleClass(): string {
  return 'absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-ns-resize touch-none'
}

export function timedEventDragGhostClass(): string {
  return 'pointer-events-none opacity-[0.38] saturate-[0.85]'
}

export function timedEventDragPreviewClass(): string {
  return 'pointer-events-none shadow-md ring-2 ring-indigo-500/35'
}

/** Bloque en vista día/semana (estilo Google Calendar) */
export function timedEventBlockClass(_event?: CalEvent): string {
  return timedGridBlockLayoutClass
}

export function eventTypeBgStyle(eventType?: string): { backgroundColor: string } {
  return { backgroundColor: resolveEventTypeColor(eventType) }
}

export function eventTypeBgStyleFromEvent(event: CalEvent): { backgroundColor: string } {
  return eventTypeBgStyle(event.eventType)
}

export function timedEventTimeClass(): string {
  return 'text-[10px] font-normal leading-tight text-white/90'
}

export function timedEventTitleClass(): string {
  return 'text-xs font-medium leading-snug text-white'
}

/** Burbuja en la grilla del calendario mensual */
export function monthEventBubbleClass(_event?: CalEvent): string {
  return `${monthBubbleBase} text-white transition-[filter] hover:brightness-95`
}

/** Tarjeta en el panel lateral de eventos del día */
export function sidebarEventCardClass(event: CalEvent): string {
  return styleForEvent(event).card
}

export function sidebarEventDotClass(event: CalEvent): string {
  return `size-2 shrink-0 rounded-full ${styleForEvent(event).dot}`
}

export function eventColorSquareClass(_event: CalEvent): string {
  return 'size-3.5 shrink-0 rounded-sm'
}

export function eventColorSquareStyle(event: CalEvent): { backgroundColor: string } {
  return eventTypeBgStyleFromEvent(event)
}

/** Píldora en popover de día (vista mensual) */
export function dayPopoverEventPillClass(event: CalEvent): string {
  return `${styleForEvent(event).bubble} w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-sm font-normal hover:brightness-95`
}

export function eventHeaderBgClass(_event: CalEvent): string {
  return ''
}

export function eventHeaderStyle(event: CalEvent): { backgroundColor: string } {
  return eventTypeBgStyleFromEvent(event)
}

export function sidebarEventTimeClass(event: CalEvent): string {
  return `mt-1 text-xs font-medium ${styleForEvent(event).time}`
}
