/**
 * Tokens del calendario alineados con MainLayout / Sidebar (gray + indigo).
 */

/** Contenedor del calendario (toolbar + marco); coincide con el fondo de la app. */
export const gcalShell =
  'flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900'

/** Área de la grilla / tabla: un tono más oscuro que el fondo general. */
export const gcalSurface =
  'bg-gray-50 dark:bg-gray-800'

export const gcalBorder = 'border-gray-200 dark:border-white/10'

export const gcalMutedText = 'text-gray-500 dark:text-gray-400'

export const gcalBodyText = 'text-gray-900 dark:text-gray-100'

export const gcalAccentText = 'text-indigo-600 dark:text-indigo-400'

export const gcalTodayBadge =
  'rounded-full bg-indigo-600 font-medium text-white dark:bg-indigo-500'

export const gcalDayCell =
  'group relative flex min-h-0 cursor-pointer flex-col border-b border-r bg-gray-50 p-1 text-left transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-gray-800 dark:hover:bg-gray-700/50'

export const gcalDayNum =
  'ml-auto flex size-6 shrink-0 items-center justify-center text-xs leading-none text-gray-800 dark:text-gray-200'

export const gcalOtherMonthOverlay =
  'pointer-events-none absolute inset-0 bg-gray-50/80 dark:bg-black/20'

/** Días anteriores a hoy (vista mes). */
export const gcalPastDayOverlay =
  'pointer-events-none absolute inset-0 z-[1] bg-gray-100/75 dark:bg-black/25'

/** Franjas disponibles en grilla semana/día. */
export const gcalWeekSlotAvailable =
  'bg-gray-50 dark:bg-gray-800'

/** Día completo pasado (columna entera en semana). */
export const gcalPastWeekColumn =
  'bg-gray-100 dark:bg-gray-900'

/** Franja pasada de hoy (fondo sólido; el pseudo-elemento fallaba en la 1.ª fila horaria). */
export const gcalPastTodaySlot =
  'bg-gray-100 dark:bg-gray-900'

export const gcalPastSlotDisabled =
  'pointer-events-none cursor-default bg-transparent'

/** Hover / selección de franja disponible. */
export const gcalWeekSlotHover =
  'cursor-pointer hover:bg-indigo-50/90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/35 dark:hover:bg-indigo-500/10'

export const gcalWeekSlotHoverActive =
  'bg-indigo-50 ring-2 ring-inset ring-indigo-500/25 dark:bg-indigo-500/12 dark:ring-indigo-400/35'

export const gcalWeekdayHeader =
  'py-2 text-center text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400'

export const gcalMoreLink =
  'block truncate px-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'

export const gcalNavIconBtn =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10'

export const gcalHoyBtn =
  'inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10'

export const gcalTitle =
  'truncate text-xl font-normal capitalize text-gray-900 dark:text-gray-100 sm:text-[1.375rem] sm:leading-7'

/** Cabecera de día pasado en semana (solo lectura si hay ítems). */
export const gcalPastDayHeader =
  'cursor-default opacity-60 hover:bg-transparent dark:hover:bg-transparent'

export const gcalPastDayHeaderWithItems =
  'cursor-pointer opacity-70 hover:bg-gray-50 dark:hover:bg-white/5'

export const gcalPillBorder = 'border border-gray-200 dark:border-white/20'

/** Altura uniforme (40px) para botones de la toolbar del calendario. */
export const gcalToolbarBtn =
  'inline-flex h-10 shrink-0 items-center justify-center text-sm font-medium leading-none'

/** Botón cuadrado de icono en la toolbar (calendario / tareas). */
export const gcalToolbarIconBtn =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center leading-none'

export const gcalToggleActive =
  'bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-indigo-400'

export const gcalToggleIdle =
  'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10'

export const gcalPrimaryBtn =
  'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400'

export const gcalCard =
  'border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800'

export const gcalSubtleSurface = 'bg-gray-50 dark:bg-gray-800'

/** Indicador de hora actual en grilla semana/día. */
export const gcalNowLine =
  'h-0.5 flex-1 bg-indigo-500 shadow-sm shadow-indigo-500/30 dark:bg-indigo-400'

export const gcalNowDot =
  'size-2.5 shrink-0 rounded-full bg-indigo-500 ring-2 ring-white dark:bg-indigo-400 dark:ring-gray-900'
