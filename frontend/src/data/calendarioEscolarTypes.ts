import type { CalTaskCuadrante, CalTaskTipo } from '@/data/calendarioTareaOptions'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'

export interface CalAssignee {
  id: string
  displayName: string
  email?: string
  /** false si el usuario ya no pertenece a la institución (p. ej. fue dado de baja del equipo). */
  active?: boolean
}

export interface CalEvent {
  id: string
  name: string
  time: string
  /** Inicio ISO local (YYYY-MM-DDTHH:mm) */
  datetime: string
  /** Fin ISO local; usado en vista día/semana para la duración */
  endDatetime?: string
  href: string
  description?: string
  eventType?: string
  /** Evento de día completo (sin franja horaria en la grilla). */
  allDay?: boolean
  recurrence?: CalRecurrencePreset
  assignees?: CalAssignee[]
}

/** Tarea del calendario escolar; puede vincularse a un evento o ser suelta. */
export interface CalTask {
  id: string
  /** Fecha YYYY-MM-DD */
  date: string
  title: string
  description?: string
  tipo?: CalTaskTipo
  cuadrante?: CalTaskCuadrante
  /** Si está definido, la tarea pertenece a ese evento del mismo día. */
  eventId?: string | null
  /** Marca si la tarea fue completada. */
  completed?: boolean
  /** Hora HH:mm; opcional. Si está definida, aparece en la grilla del calendario. */
  time?: string
  /** Hora de fin HH:mm; opcional. Define la duración en la grilla. */
  endTime?: string
  /** Sin horario concreto; ocupa el día completo en listados. */
  allDay?: boolean
  /** Regla de repetición con la que se creó la instancia. */
  recurrence?: CalRecurrencePreset
  /** Personas asignadas a la tarea. */
  assignees?: CalAssignee[]
}
