import { apiFetch, withInstitution, withInstitutionBody } from '@/api/http'

export type QuadrantId = 'ui' | 'nui' | 'uni' | 'nuni'
export type DayId = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes'
export type BlockType = 'P' | 'A' | 'SC' | 'F' | 'PE'
export type DelegatedStatus = 'En progreso' | 'Pendiente' | 'Completada'

export interface MatrixTaskDto {
  id: string
  text: string
}

export interface ScheduleBlockDto {
  id: string
  start: string
  end: string
  type: BlockType | string
  title: string
}

export interface DelegatedTaskDto {
  id: string
  title: string
  assignee: string
  due: string
  followUp: string
  status: DelegatedStatus | string
}

export interface WeeklyPlannerDto {
  year: number
  week: number
  foco: string
  matrix: Record<QuadrantId, MatrixTaskDto[]>
  schedule: Record<DayId, ScheduleBlockDto[]>
  delegated: DelegatedTaskDto[]
}

export async function fetchWeeklyPlanner(year: number, week: number): Promise<WeeklyPlannerDto> {
  const params = new URLSearchParams({ year: String(year), week: String(week) })
  const inst = withInstitution(`/weekly-planner?${params}`)
  return apiFetch<WeeklyPlannerDto>(inst)
}

export async function saveWeeklyPlanner(body: WeeklyPlannerDto): Promise<WeeklyPlannerDto> {
  return apiFetch<WeeklyPlannerDto>(withInstitution('/weekly-planner'), {
    method: 'PUT',
    body: JSON.stringify(withInstitutionBody(body)),
  })
}
