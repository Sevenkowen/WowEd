import { addDays, formatYmd, parseYmd } from '@/utils/calendarioDates'

export type CalRecurrencePreset =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly-nth-weekday'
  | 'monthly-last-weekday'
  | 'yearly'
  | 'weekdays'
  | 'custom'

export interface RecurrenceOption {
  id: CalRecurrencePreset
  label: string
}

const NTH_LABELS = ['', 'primer', 'segundo', 'tercer', 'cuarto'] as const

function capitalizeEs(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Posición del weekday en el mes: 1-4 o 'last' */
export function weekdayPositionInMonth(date: Date): number | 'last' {
  const weekday = date.getDay()
  const day = date.getDate()
  let nth = 0
  for (let d = 1; d <= day; d++) {
    if (new Date(date.getFullYear(), date.getMonth(), d).getDay() === weekday) nth++
  }
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  for (let d = lastDay; d >= 1; d--) {
    if (new Date(date.getFullYear(), date.getMonth(), d).getDay() === weekday) {
      return d === day ? 'last' : nth
    }
  }
  return nth
}

export function recurrenceOptionsForDate(dateYmd: string): RecurrenceOption[] {
  const d = parseYmd(dateYmd)
  const weekday = capitalizeEs(new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d))
  const day = d.getDate()
  const month = new Intl.DateTimeFormat('es', { month: 'long' }).format(d)
  const pos = weekdayPositionInMonth(d)
  const nthLabel = pos === 'last' ? 'último' : NTH_LABELS[pos] ?? 'último'

  return [
    { id: 'none', label: 'No se repite' },
    { id: 'daily', label: 'Todos los días' },
    { id: 'weekly', label: `Cada semana, el ${weekday.toLowerCase()}` },
    {
      id: 'monthly-nth-weekday',
      label: `Todos los meses, el ${nthLabel} ${weekday.toLowerCase()}`,
    },
    { id: 'monthly-last-weekday', label: `Todos los meses, el último ${weekday.toLowerCase()}` },
    { id: 'yearly', label: `Anualmente, el ${day} de ${month}` },
    { id: 'weekdays', label: 'Todos los días hábiles (de lunes a viernes)' },
    { id: 'custom', label: 'Personalizado...' },
  ]
}

function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day >= 1 && day <= 5
}

function dateWithNthWeekday(year: number, month: number, weekday: number, nth: number): Date | null {
  let count = 0
  const last = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, month, day)
    if (d.getDay() === weekday) {
      count++
      if (count === nth) return d
    }
  }
  return null
}

function dateWithLastWeekday(year: number, month: number, weekday: number): Date | null {
  const last = new Date(year, month + 1, 0).getDate()
  for (let day = last; day >= 1; day--) {
    const d = new Date(year, month, day)
    if (d.getDay() === weekday) return d
  }
  return null
}

const MAX_OCCURRENCES = 100
const DEFAULT_HORIZON_DAYS = 365

/** Genera fechas YYYY-MM-DD para una regla de recurrencia (excluye 'custom'). */
export function expandRecurrenceDates(
  startYmd: string,
  preset: CalRecurrencePreset,
  horizonDays = DEFAULT_HORIZON_DAYS,
): string[] {
  if (preset === 'none' || preset === 'custom') return [startYmd]

  const start = parseYmd(startYmd)
  const until = addDays(start, horizonDays)
  const dates: string[] = [startYmd]
  const startWeekday = start.getDay()
  const startDay = start.getDate()
  const startMonth = start.getMonth()
  const nth = weekdayPositionInMonth(start)

  if (preset === 'daily') {
    let cur = addDays(start, 1)
    while (cur <= until && dates.length < MAX_OCCURRENCES) {
      dates.push(formatYmd(cur))
      cur = addDays(cur, 1)
    }
    return dates
  }

  if (preset === 'weekly') {
    let cur = addDays(start, 7)
    while (cur <= until && dates.length < MAX_OCCURRENCES) {
      dates.push(formatYmd(cur))
      cur = addDays(cur, 7)
    }
    return dates
  }

  if (preset === 'weekdays') {
    let cur = addDays(start, 1)
    while (cur <= until && dates.length < MAX_OCCURRENCES) {
      if (isWeekday(cur)) dates.push(formatYmd(cur))
      cur = addDays(cur, 1)
    }
    return dates
  }

  if (preset === 'yearly') {
    for (let y = start.getFullYear() + 1; dates.length < MAX_OCCURRENCES; y++) {
      const d = new Date(y, startMonth, startDay)
      if (d.getMonth() !== startMonth) continue
      if (d > until) break
      dates.push(formatYmd(d))
    }
    return dates
  }

  if (preset === 'monthly-nth-weekday' || preset === 'monthly-last-weekday') {
    let year = start.getFullYear()
    let month = start.getMonth() + 1
    while (dates.length < MAX_OCCURRENCES) {
      if (month > 11) {
        month = 0
        year++
      }
      const next =
        preset === 'monthly-last-weekday'
          ? dateWithLastWeekday(year, month, startWeekday)
          : typeof nth === 'number'
            ? dateWithNthWeekday(year, month, startWeekday, nth)
            : null
      if (next && next > start && next <= until) {
        dates.push(formatYmd(next))
      }
      if (next && next > until) break
      month++
    }
    return dates
  }

  return dates
}
