import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioCatalogs } from '@/composables/useCalendarioCatalogs'
import { DEFAULT_TASK_CATALOG } from '@/data/calendarioCatalogDefaults'

export type CalTaskTipo = string

export type CalTaskCuadrante =
  | 'Urgente e Importante'
  | 'No Urgente pero Importante'
  | 'Urgente pero No Importante'
  | 'No Urgente ni Importante'

export type TaskTipoOption = { id: string; name: string }
export type TaskCuadranteOption = { id: number; name: CalTaskCuadrante }

export const taskCuadrantes: TaskCuadranteOption[] = [
  { id: 1, name: 'Urgente e Importante' },
  { id: 2, name: 'No Urgente pero Importante' },
  { id: 3, name: 'Urgente pero No Importante' },
  { id: 4, name: 'No Urgente ni Importante' },
]

export const DEFAULT_TASK_CUADRANTE = taskCuadrantes[0]

/** @deprecated Usar `useCalendarioCatalogs().taskTipoOptions` */
export function taskTipos(): TaskTipoOption[] {
  const { taskTipoOptions } = useCalendarioCatalogs()
  return taskTipoOptions.value
}

export function defaultTaskTipo(): TaskTipoOption {
  const { defaultTaskTipo } = useCalendarioCatalogs()
  return defaultTaskTipo.value
}

export function taskTipoOf(task: CalTask): CalTaskTipo {
  return task.tipo ?? defaultTaskTipo().name
}

export function taskCuadranteOf(task: CalTask): CalTaskCuadrante {
  return task.cuadrante ?? DEFAULT_TASK_CUADRANTE.name
}

/** Fallback estático si el composable no está disponible aún. */
export const DEFAULT_TASK_TIPO: TaskTipoOption = {
  id: DEFAULT_TASK_CATALOG[0].id,
  name: DEFAULT_TASK_CATALOG[0].name,
}
