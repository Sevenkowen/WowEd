import type { CalEvent } from '@/data/calendarioEscolarTypes'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { endMinutesFromEvent, isAllDayEvent, minutesFromEvent, parseTimeToMinutes } from '@/utils/calendarioEventTime'
import { isDateBeforeToday, todayYmd } from '@/utils/calendarioDates'

/** Bloques con horario en grilla día/semana (mismo color, más oscuro). */
export const calPastTimedBlockClass =
  'brightness-[0.65] saturate-[0.78] hover:brightness-[0.68]'

/** Tarjetas y burbujas en listados / mes. */
export const calPastSurfaceClass = 'brightness-[0.68] saturate-[0.75] opacity-90'

export function calPastClass(elapsed: boolean, surface = false): string {
  if (!elapsed) return ''
  return surface ? calPastSurfaceClass : calPastTimedBlockClass
}

export interface CalendarTimedLike {
  date: string
  time?: string | null
  endTime?: string | null
  allDay?: boolean
}

/** Día anterior a hoy, o hoy con franja ya terminada. */
export function isCalendarTimedItemElapsed(
  item: CalendarTimedLike,
  now: Date = new Date(),
): boolean {
  if (isDateBeforeToday(item.date, now)) return true
  if (item.allDay || !item.time?.trim()) return false
  if (item.date !== todayYmd(now)) return false
  const endRef = item.endTime?.trim() || item.time.trim()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return parseTimeToMinutes(endRef) <= nowMinutes
}

export function isCalendarTaskElapsed(task: CalTask, now: Date = new Date()): boolean {
  return isCalendarTimedItemElapsed(
    {
      date: task.date,
      time: task.time,
      endTime: task.endTime,
      allDay: task.allDay,
    },
    now,
  )
}

export function isCalendarEventElapsed(
  event: CalEvent,
  date?: string,
  now: Date = new Date(),
): boolean {
  const ymd = date ?? event.datetime.slice(0, 10)
  if (isDateBeforeToday(ymd, now)) return true
  if (isAllDayEvent(event)) return false
  const start = minutesFromEvent(event)
  if (start === null) return false
  if (ymd !== todayYmd(now)) return false
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return endMinutesFromEvent(event) <= nowMinutes
}
