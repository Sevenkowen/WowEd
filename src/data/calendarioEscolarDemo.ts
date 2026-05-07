export interface CalEvent {
  id: number
  name: string
  time: string
  datetime: string
  href: string
}

/** Eventos demo por fecha YYYY-MM-DD */
export const demoPorFecha: Record<string, CalEvent[]> = {
  '2026-05-05': [
    { id: 1, name: 'Reunión de equipo directivo', time: '10:00', datetime: '2026-05-05T10:00', href: '#' },
    { id: 2, name: 'Observación de clase', time: '14:00', datetime: '2026-05-05T14:00', href: '#' },
  ],
  '2026-05-12': [{ id: 3, name: 'Taller docente', time: '9:00', datetime: '2026-05-12T09:00', href: '#' }],
  '2026-05-20': [{ id: 4, name: 'Consejo escolar', time: '18:00', datetime: '2026-05-20T18:00', href: '#' }],
}

export function eventosDelDia(ymd: string | null): CalEvent[] {
  if (!ymd) return []
  return demoPorFecha[ymd] ?? []
}
