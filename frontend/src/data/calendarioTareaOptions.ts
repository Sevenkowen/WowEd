import type { CalTask } from '@/data/calendarioEscolarTypes'

export type CalTaskTipo =
  | 'Pedagógico'
  | 'Administrativo'
  | 'Socio-comunicativo'
  | 'Flexible'
  | 'Personal'

export type CalTaskCuadrante =
  | 'Urgente e Importante'
  | 'No Urgente pero Importante'
  | 'Urgente pero No Importante'
  | 'No Urgente ni Importante'

export type TaskTipoOption = { id: number; name: CalTaskTipo }
export type TaskCuadranteOption = { id: number; name: CalTaskCuadrante }

export const taskTipos: TaskTipoOption[] = [
  { id: 1, name: 'Pedagógico' },
  { id: 2, name: 'Administrativo' },
  { id: 3, name: 'Socio-comunicativo' },
  { id: 4, name: 'Flexible' },
  { id: 5, name: 'Personal' },
]

export const taskCuadrantes: TaskCuadranteOption[] = [
  { id: 1, name: 'Urgente e Importante' },
  { id: 2, name: 'No Urgente pero Importante' },
  { id: 3, name: 'Urgente pero No Importante' },
  { id: 4, name: 'No Urgente ni Importante' },
]

export const DEFAULT_TASK_TIPO = taskTipos[0]
export const DEFAULT_TASK_CUADRANTE = taskCuadrantes[0]

export function taskTipoOf(task: CalTask): CalTaskTipo {
  return task.tipo ?? DEFAULT_TASK_TIPO.name
}

export function taskCuadranteOf(task: CalTask): CalTaskCuadrante {
  return task.cuadrante ?? DEFAULT_TASK_CUADRANTE.name
}
