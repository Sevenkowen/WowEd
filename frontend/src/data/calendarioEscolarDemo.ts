/** @deprecated Los datos demo ya no se usan en runtime; tipos en calendarioEscolarTypes. */
export type { CalEvent } from '@/data/calendarioEscolarTypes'

/** @deprecated Solo referencia histórica; el calendario usa la API. */
export const demoPorFecha: Record<string, import('@/data/calendarioEscolarTypes').CalEvent[]> = {}
