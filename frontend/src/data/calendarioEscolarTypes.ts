import type { CalTaskCuadrante, CalTaskTipo } from '@/data/calendarioTareaOptions'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'

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
}
