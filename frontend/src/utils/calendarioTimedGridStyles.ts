/** Contenedor <li> de evento/tarea en la grilla horaria (semana/día). */
export function timedGridItemLiClass(): string {
  return 'pointer-events-auto relative z-10 mt-px min-w-0 overflow-hidden transition-[grid-row] duration-200 ease-out'
}

/** Posición y layout del bloque coloreado dentro de la celda. */
export const timedGridBlockLayoutClass = [
  'absolute inset-x-1.5 inset-y-px z-[1]',
  'flex min-w-0 max-w-full flex-col overflow-hidden',
  'rounded px-1.5 py-px text-left text-white',
  'transition-[filter,box-shadow] duration-200 hover:brightness-95',
].join(' ')

/** Mientras el servidor confirma un cambio de duración. */
export function timedGridSyncingClass(): string {
  return 'animate-cal-sync-pending ring-2 ring-white/70'
}

/** Durante el arrastre del asa de redimensionado. */
export function timedGridResizingClass(): string {
  return 'ring-2 ring-white/50 brightness-105'
}
