import { useCalendarioEscolarTasksApi } from '@/composables/useCalendarioEscolarTasksApi'
import type { CalTaskCuadrante, CalTaskTipo } from '@/data/calendarioTareaOptions'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { syncLinkedTasksAfterEventMove as syncLinkedTasksAfterEventMoveApi } from '@/composables/useCalendarioEscolarTasksApi'

export interface NuevaCalendarioTarea {
  date: string
  title: string
  description?: string
  tipo: CalTaskTipo
  cuadrante: CalTaskCuadrante
  eventId?: string | null
  time?: string | null
  endTime?: string | null
  allDay?: boolean
  recurrence?: CalRecurrencePreset
  assigneeIds?: string[]
}

export interface UpdateCalendarioTarea {
  title?: string
  description?: string
  date?: string
  tipo?: CalTaskTipo
  cuadrante?: CalTaskCuadrante
  eventId?: string | null
  time?: string | null
  endTime?: string | null
  allDay?: boolean
  completed?: boolean
  assigneeIds?: string[]
}

export function syncLinkedTasksAfterEventMove(eventId: string, newDate: string): void {
  syncLinkedTasksAfterEventMoveApi(eventId, newDate)
}

export function useCalendarioEscolarTasks() {
  return useCalendarioEscolarTasksApi()
}
