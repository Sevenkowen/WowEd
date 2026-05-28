import { apiFetch } from '@/api/http'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'

type PorFechaEvents = { por_fecha: Record<string, CalEvent[]> }
type PorFechaTasks = { por_fecha: Record<string, CalTask[]> }

export async function fetchEventsPorFecha(from?: string, to?: string): Promise<Record<string, CalEvent[]>> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const q = params.toString()
  const data = await apiFetch<PorFechaEvents>(`/calendar/events${q ? `?${q}` : ''}`)
  return data.por_fecha ?? {}
}

export async function fetchTasksPorFecha(from?: string, to?: string): Promise<Record<string, CalTask[]>> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const q = params.toString()
  const data = await apiFetch<PorFechaTasks>(`/calendar/tasks${q ? `?${q}` : ''}`)
  return data.por_fecha ?? {}
}

export interface CreateEventPayload {
  date: string
  title: string
  description?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  eventType?: string
  recurrence?: CalRecurrencePreset
}

export async function apiCreateEvent(payload: CreateEventPayload): Promise<CalEvent> {
  return apiFetch<CalEvent>('/calendar/events', {
    method: 'POST',
    body: JSON.stringify({
      date: payload.date,
      title: payload.title,
      description: payload.description,
      start_time: payload.startTime,
      end_time: payload.endTime,
      all_day: payload.allDay ?? false,
      event_type: payload.eventType,
      recurrence: payload.recurrence ?? 'none',
    }),
  })
}

export async function apiMoveEvent(id: string, date: string, startTime: string): Promise<CalEvent> {
  return apiFetch<CalEvent>(`/calendar/events/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ date, start_time: startTime }),
  })
}

export async function apiResizeEvent(id: string, endTime: string): Promise<CalEvent> {
  return apiFetch<CalEvent>(`/calendar/events/${id}/resize`, {
    method: 'PATCH',
    body: JSON.stringify({ end_time: endTime }),
  })
}

export interface CreateTaskPayload {
  date: string
  title: string
  description?: string
  tipo?: string
  cuadrante?: string
  eventId?: string | null
  time?: string | null
  endTime?: string | null
  allDay?: boolean
  completed?: boolean
  recurrence?: CalRecurrencePreset
}

export async function apiCreateTask(payload: CreateTaskPayload): Promise<CalTask> {
  return apiFetch<CalTask>('/calendar/tasks', {
    method: 'POST',
    body: JSON.stringify({
      date: payload.date,
      title: payload.title,
      description: payload.description,
      tipo: payload.tipo,
      cuadrante: payload.cuadrante,
      event_id: payload.eventId,
      time: payload.time,
      end_time: payload.endTime,
      all_day: payload.allDay ?? false,
      completed: payload.completed ?? false,
      recurrence: payload.recurrence ?? 'none',
    }),
  })
}

export async function apiMoveTask(id: string, date: string, time: string | null): Promise<CalTask> {
  return apiFetch<CalTask>(`/calendar/tasks/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ date, time }),
  })
}

export async function apiResizeTask(id: string, endTime: string): Promise<CalTask> {
  return apiFetch<CalTask>(`/calendar/tasks/${id}/resize`, {
    method: 'PATCH',
    body: JSON.stringify({ end_time: endTime }),
  })
}

export async function apiPatchTask(id: string, patch: { completed?: boolean }): Promise<CalTask> {
  return apiFetch<CalTask>(`/calendar/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
