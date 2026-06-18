/** Contenedor <li> de evento/tarea en la grilla horaria (semana/día). */
export function timedGridItemLiClass(): string {
  return 'pointer-events-auto relative z-10 mt-px min-w-0 overflow-hidden'
}

/** Posición y layout del bloque coloreado dentro de la celda. */
export const timedGridBlockLayoutClass = [
  'absolute inset-x-1.5 inset-y-px z-[1]',
  'flex min-w-0 max-w-full flex-col overflow-hidden',
  'rounded px-1.5 py-px text-left text-white',
  'transition-[filter] hover:brightness-95',
].join(' ')
