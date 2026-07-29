import { useCalendarioEscolarEventsApi } from '@/composables/useCalendarioEscolarEventsApi'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'

export interface NuevoCalendarioEvento {
  date: string
  title: string
  description?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  recurrence?: CalRecurrencePreset
  eventType?: string
  assigneeIds?: string[]
}

export interface UpdateCalendarioEvento {
  title?: string
  description?: string
  date?: string
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
  eventType?: string
  assigneeIds?: string[]
}

export function useCalendarioEscolarEvents() {
  return useCalendarioEscolarEventsApi()
}
