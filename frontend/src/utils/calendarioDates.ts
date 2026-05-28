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
export function todayYmd(): string {
  return formatYmd(new Date())
}

/** true si la fecha es estrictamente anterior a hoy (hora local). */
export function isDateBeforeToday(ymd: string): boolean {
  return ymd < todayYmd()
}

export const CALENDAR_PAST_DATE_MESSAGE =
  'No podés crear eventos o tareas en fechas anteriores a hoy.'

export const CALENDAR_PAST_MODIFY_MESSAGE =
  'No podés mover ni cambiar la duración de eventos o tareas en fechas anteriores a hoy.'

/** false si la fecha origen o destino es anterior a hoy. */
export function isCalendarModifyAllowed(fromDate: string, toDate?: string): boolean {
  if (isDateBeforeToday(fromDate)) return false
  if (toDate !== undefined && isDateBeforeToday(toDate)) return false
  return true
}
