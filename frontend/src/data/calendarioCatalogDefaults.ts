export interface CalendarioCatalogItem {
  id: string
  name: string
  /** Color de fondo (tipos de evento). */
  color?: string
}

export const DEFAULT_EVENT_CATALOG: CalendarioCatalogItem[] = [
  { id: 'ev-1', name: 'Evento Escolar', color: '#F4511E' },
  { id: 'ev-2', name: 'Jornada Institucional', color: '#039BE5' },
  { id: 'ev-3', name: 'Fecha Administrativa', color: '#3F51B5' },
  { id: 'ev-4', name: 'Otro', color: '#616161' },
]

export const DEFAULT_TASK_CATALOG: CalendarioCatalogItem[] = [
  { id: 'task-1', name: 'Pedagógico' },
  { id: 'task-2', name: 'Administrativo' },
  { id: 'task-3', name: 'Socio-comunicativo' },
  { id: 'task-4', name: 'Flexible' },
  { id: 'task-5', name: 'Personal' },
]

/** Colores heredados para eventos demo / tipos no listados en el catálogo. */
export const LEGACY_EVENT_TYPE_COLORS: Record<string, string> = {
  Feriado: '#0B8043',
  'Evento Escolar': '#F4511E',
  'Jornada Institucional': '#039BE5',
  'Fecha Administrativa': '#3F51B5',
  Otro: '#616161',
}

export const EVENT_COLOR_PRESETS = [
  '#F4511E',
  '#039BE5',
  '#3F51B5',
  '#0B8043',
  '#8E24AA',
  '#E67C73',
  '#F6BF26',
  '#616161',
] as const
