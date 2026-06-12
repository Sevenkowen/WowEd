import { parseTimeToMinutes } from '@/utils/calendarioEventTime'

export type CalendarioDisplayView = 'dia' | 'semana' | 'mes' | 'anio'

/** Modo del panel derecho del toolbar (calendario vs tareas). */
export type CalendarioContentMode = 'calendario' | 'tareas'

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() - mondayIndex(copy))
  return copy
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, day ?? 1)
}

/** Fecha local de hoy en YYYY-MM-DD. */
export function todayYmd(now: Date = new Date()): string {
  return formatYmd(now)
}

/** true si la fecha es estrictamente anterior a hoy (hora local). */
export function isDateBeforeToday(ymd: string, now: Date = new Date()): boolean {
  return ymd < todayYmd(now)
}

export const CALENDAR_PAST_DATE_MESSAGE =
  'No podés crear eventos o tareas en fechas anteriores a hoy.'

export const CALENDAR_PAST_MODIFY_MESSAGE =
  'No podés mover ni cambiar la duración de eventos o tareas en fechas anteriores a hoy.'

export const CALENDAR_PAST_SLOT_MESSAGE =
  'No podés crear eventos o tareas en horarios que ya pasaron hoy.'

/** true si la franja (inicio HH:mm) ya transcurrió hoy, o el día es anterior a hoy. */
export function isSlotInPast(date: string, startTime: string, now: Date = new Date()): boolean {
  if (isDateBeforeToday(date, now)) return true
  if (date !== todayYmd(now)) return false
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  // Bloquear en cuanto empezó la franja (p. ej. a las 7:05, 7:00 ya no es seleccionable).
  return parseTimeToMinutes(startTime) <= nowMinutes
}

/** false si no se puede crear en esa fecha/franja (día pasado u hora ya transcurrida hoy). */
export function isCalendarSlotCreateAllowed(
  date: string,
  startTime?: string | null,
  now: Date = new Date(),
): boolean {
  if (isDateBeforeToday(date, now)) return false
  if (date > todayYmd(now)) return true
  if (!startTime) return true
  return !isSlotInPast(date, startTime, now)
}

/** false si la fecha origen o destino es anterior a hoy, o el destino es una franja pasada hoy. */
export function isCalendarModifyAllowed(
  fromDate: string,
  toDate?: string,
  toStartTime?: string | null,
): boolean {
  if (isDateBeforeToday(fromDate)) return false
  if (toDate === undefined) return true
  if (isDateBeforeToday(toDate)) return false
  if (toStartTime && !isCalendarSlotCreateAllowed(toDate, toStartTime)) return false
  return true
}
