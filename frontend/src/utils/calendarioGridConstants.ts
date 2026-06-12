/** Hora de inicio de la grilla semana/día (12 AM / 00:00, como Google Calendar). */
export const CALENDARIO_DAY_START_HOUR = 0

/** Altura visual de cada franja de 30 min (sin línea intermedia; el snap sigue en medias horas). */
export const CALENDARIO_SLOT_HEIGHT_REM = 1.5

/** 24 filas horarias: 12 AM … 11 PM. */
export function calendarioHourCount(): number {
  return 24 - CALENDARIO_DAY_START_HOUR
}

/** Etiqueta de hora en eje izquierdo (estilo Google: «12 AM», «1 AM», … «11 PM»). */
export function calendarioHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

/** +1 fila de relleno bajo cabeceras de día. */
export function calendarioGridRows(hourCount = calendarioHourCount()): number {
  return hourCount * 2 + 1
}

export function calendarioGridRowsStyle(hourCount = calendarioHourCount()): string {
  return `repeat(${calendarioGridRows(hourCount)}, minmax(${CALENDARIO_SLOT_HEIGHT_REM}rem, 1fr))`
}

export function calendarioGridMinHeight(hourCount = calendarioHourCount()): string {
  return `${hourCount * CALENDARIO_SLOT_HEIGHT_REM * 2 + CALENDARIO_SLOT_HEIGHT_REM}rem`
}
