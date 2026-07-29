import type { CalEvent } from '@/data/calendarioEscolarTypes'
import type { CalTask } from '@/data/calendarioEscolarTypes'

export const ALL_DAY_EVENT_LABEL = 'Todo el día'

export function isAllDayEvent(event: CalEvent): boolean {
  return event.allDay === true
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function minutesFromTask(task: CalTask): number | null {
  if (!task.time) return null
  return parseTimeToMinutes(task.time)
}

export function endMinutesFromTask(task: CalTask): number {
  if (!task.time) return 0
  if (task.endTime) return parseTimeToMinutes(task.endTime)
  return parseTimeToMinutes(task.time) + 30
}

/** Filas de media hora en grilla (mín. 1) */
export function gridSpanFromTask(task: CalTask): number {
  if (!task.time) return 1
  const start = parseTimeToMinutes(task.time)
  const end = Math.max(start + 30, endMinutesFromTask(task))
  return Math.max(1, Math.ceil((end - start) / 30))
}

export function minutesFromEvent(event: CalEvent): number | null {
  if (isAllDayEvent(event)) return null
  const dt = new Date(event.datetime)
  if (!isNaN(dt.getTime())) return dt.getHours() * 60 + dt.getMinutes()
  const [h, m] = event.time.replace(/\s/g, '').split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function endMinutesFromEvent(event: CalEvent): number {
  if (isAllDayEvent(event)) return 24 * 60
  if (event.endDatetime) {
    const dt = new Date(event.endDatetime)
    if (!isNaN(dt.getTime())) return dt.getHours() * 60 + dt.getMinutes()
  }
  const start = minutesFromEvent(event)
  if (start === null) return 24 * 60
  return start + 60
}

/** Filas de media hora que ocupa el evento en la grilla (mín. 1) */
export function gridSpanFromEvent(event: CalEvent): number {
  if (isAllDayEvent(event)) return 0
  const start = minutesFromEvent(event)
  if (start === null) return 0
  const end = Math.max(start + 30, endMinutesFromEvent(event))
  return Math.max(1, Math.ceil((end - start) / 30))
}

export function formatTimeLabel(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatEventTimeRange(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = formatTimeLabel(sh ?? 0, sm ?? 0)
  const end = formatTimeLabel(eh ?? 0, em ?? 0)
  return start === end ? start : `${start} – ${end}`
}

export function buildEventDatetime(dateYmd: string, time: string): string {
  const [h, m] = time.split(':')
  return `${dateYmd}T${String(h).padStart(2, '0')}:${String(m ?? '00').padStart(2, '0')}`
}

/** Aplica nuevo fin horario a un evento (actualización optimista en UI). */
export function resizeCalEvent(source: CalEvent, date: string, newEndTime: string): CalEvent {
  if (isAllDayEvent(source)) {
    return { ...source, datetime: `${date}T00:00` }
  }
  const startMin = minutesFromEvent(source)
  if (startMin === null) return source
  let endMin = parseTimeToMinutes(newEndTime)
  if (endMin <= startMin) endMin = startMin + 30
  const startTime = formatTimeLabel(Math.floor(startMin / 60) % 24, startMin % 60)
  const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  return {
    ...source,
    datetime: buildEventDatetime(date, startTime),
    endDatetime: buildEventDatetime(date, endTime),
    time: formatEventTimeRange(startTime, endTime),
  }
}

/** Aplica nuevo fin horario a una tarea (actualización optimista en UI). */
export function resizeCalTask(source: CalTask, newEndTime: string): CalTask {
  if (!source.time) return source
  const startMin = parseTimeToMinutes(source.time)
  let endMin = parseTimeToMinutes(newEndTime)
  if (endMin <= startMin) endMin = startMin + 30
  const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  return { ...source, endTime }
}

/** Mueve un evento a otra fecha/hora conservando la duración (actualización optimista en UI). */
export function moveCalEvent(source: CalEvent, newDate: string, newStartTime: string): CalEvent {
  if (isAllDayEvent(source)) {
    return {
      ...source,
      datetime: `${newDate}T00:00`,
      time: ALL_DAY_EVENT_LABEL,
      endDatetime: undefined,
    }
  }
  const startMin = minutesFromEvent(source)
  const duration =
    startMin === null
      ? 60
      : Math.max(30, endMinutesFromEvent(source) - startMin)
  const newStartMin = parseTimeToMinutes(newStartTime)
  const endMin = newStartMin + duration
  const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)

  return {
    ...source,
    datetime: buildEventDatetime(newDate, newStartTime),
    endDatetime: buildEventDatetime(newDate, endTime),
    time: formatEventTimeRange(newStartTime, endTime),
  }
}

/** Mueve una tarea a otra fecha/hora conservando la duración (actualización optimista en UI). */
export function moveCalTask(source: CalTask, newDate: string, newTime: string | null): CalTask {
  let eventId = source.eventId ?? null
  if (eventId && newDate !== source.date) eventId = null

  const startRaw = newTime?.trim()
  if (!startRaw) {
    return {
      ...source,
      date: newDate,
      eventId,
      time: undefined,
    }
  }

  let endTime = source.endTime
  if (source.time) {
    const startMin = parseTimeToMinutes(source.time)
    const duration = Math.max(30, endMinutesFromTask(source) - startMin)
    const newStartMin = parseTimeToMinutes(startRaw)
    const endMin = newStartMin + duration
    endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  } else if (!endTime) {
    const newStartMin = parseTimeToMinutes(startRaw)
    const endMin = newStartMin + 30
    endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  }

  return {
    ...source,
    date: newDate,
    eventId,
    time: startRaw,
    endTime,
  }
}
