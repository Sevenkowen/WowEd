import { apiFetch, withInstitution, withInstitutionBody } from '@/api/http'

export type ObjectiveStatus = 'En Progreso' | 'Completado' | 'Retrasado'

export interface ObjectiveDto {
  id: string
  title: string
  description?: string | null
  indicators: string[]
  responsables: string[]
  plazo?: string | null
  status: ObjectiveStatus | string
  area?: string | null
  owner?: string | null
  progress_pct: number
  sort_order: number
}

type ObjectivesListResponse = { items: ObjectiveDto[] }

export async function fetchObjectives(): Promise<ObjectiveDto[]> {
  const data = await apiFetch<ObjectivesListResponse>(withInstitution('/objectives'))
  return data.items ?? []
}

export interface CreateObjectivePayload {
  title: string
  description?: string
  indicators?: string[]
  responsables?: string[]
  plazo?: string
  status?: string
  area?: string
  owner?: string
  progress_pct?: number
}

export async function apiCreateObjective(payload: CreateObjectivePayload): Promise<ObjectiveDto> {
  return apiFetch<ObjectiveDto>(withInstitution('/objectives'), {
    method: 'POST',
    body: JSON.stringify(withInstitutionBody(payload)),
  })
}

export interface UpdateObjectivePayload {
  title?: string
  description?: string
  indicators?: string[]
  responsables?: string[]
  plazo?: string
  status?: string
  area?: string
  owner?: string
  progress_pct?: number
  sort_order?: number
}

export async function apiUpdateObjective(id: string, patch: UpdateObjectivePayload): Promise<ObjectiveDto> {
  return apiFetch<ObjectiveDto>(`/objectives/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteObjective(id: string): Promise<void> {
  await apiFetch<void>(`/objectives/${id}`, { method: 'DELETE' })
}
