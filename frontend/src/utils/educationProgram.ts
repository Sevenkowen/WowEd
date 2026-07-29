/** Etiqueta legible para nivel + turno (evita el críptico "Primario (General)"). */
export function formatEducationProgramLabel(educationLevel: string, shift: string): string {
  return `${educationLevel} — turno ${shift}`
}

/** Tooltip cuando el turno es el valor por defecto. */
export function educationProgramShiftTitle(shift: string): string {
  if (shift === 'General') {
    return 'Turno general: un solo horario, sin división mañana/tarde'
  }
  return `Turno ${shift} de este nivel educativo`
}

export const EDUCATION_PROGRAM_SHIFT_HELP =
  'Horario en que cursa este nivel. "General" = un solo turno (sin mañana/tarde separados).'

export const EDUCATION_PROGRAM_SHIFT_PLACEHOLDER = 'General (único turno)'
