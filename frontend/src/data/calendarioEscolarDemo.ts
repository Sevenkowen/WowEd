import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'

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
}

/** Eventos demo por fecha YYYY-MM-DD */
export const demoPorFecha: Record<string, CalEvent[]> = {
  '2026-05-05': [
    { id: '1', name: 'Reunión de equipo directivo', time: '10:00', datetime: '2026-05-05T10:00', href: '#' },
    { id: '2', name: 'Observación de clase', time: '14:00', datetime: '2026-05-05T14:00', href: '#' },
  ],
  '2026-05-12': [{ id: '3', name: 'Taller docente', time: '9:00', datetime: '2026-05-12T09:00', href: '#' }],
  '2026-05-13': [
    { id: '5', name: 'Jornada institucional', time: '14:00', datetime: '2026-05-13T14:00', href: '#' },
  ],
  '2026-05-14': [
    { id: '7', name: 'Reunión con familias', time: '18:30', datetime: '2026-05-14T18:30', href: '#' },
  ],
  '2026-05-15': [
    { id: '6', name: 'Entrega de informes trimestrales', time: '10:30', datetime: '2026-05-15T10:30', href: '#' },
  ],
  '2026-05-20': [{ id: '4', name: 'Consejo escolar', time: '18:00', datetime: '2026-05-20T18:00', href: '#' }],
}

/** @deprecated Usar useCalendarioEscolarEvents().eventosDelDia */
export function eventosDelDia(ymd: string | null): CalEvent[] {
  if (!ymd) return []
  return demoPorFecha[ymd] ?? []
}
