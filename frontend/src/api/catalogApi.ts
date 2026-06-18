import { apiFetch, withInstitution, withInstitutionBody } from '@/api/http'
import type { CalendarioCatalogItem } from '@/data/calendarioCatalogDefaults'

type CatalogListResponse = { items: CalendarioCatalogItem[] }

export async function fetchEventTypes(): Promise<CalendarioCatalogItem[]> {
  const data = await apiFetch<CatalogListResponse>(withInstitution('/catalog/event-types'))
  return data.items ?? []
}

export async function fetchTaskTypes(): Promise<CalendarioCatalogItem[]> {
  const data = await apiFetch<CatalogListResponse>(withInstitution('/catalog/task-types'))
  return data.items ?? []
}

export async function apiCreateEventType(name: string, color: string): Promise<CalendarioCatalogItem> {
  return apiFetch<CalendarioCatalogItem>(withInstitution('/catalog/event-types'), {
    method: 'POST',
    body: JSON.stringify(withInstitutionBody({ name, color })),
  })
}

export async function apiUpdateEventType(
  id: string,
  patch: { name?: string; color?: string },
): Promise<CalendarioCatalogItem> {
  return apiFetch<CalendarioCatalogItem>(`/catalog/event-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteEventType(id: string): Promise<void> {
  await apiFetch<void>(withInstitution(`/catalog/event-types/${id}`), { method: 'DELETE' })
}

export async function apiCreateTaskType(name: string): Promise<CalendarioCatalogItem> {
  return apiFetch<CalendarioCatalogItem>(withInstitution('/catalog/task-types'), {
    method: 'POST',
    body: JSON.stringify(withInstitutionBody({ name })),
  })
}

export async function apiUpdateTaskType(id: string, name: string): Promise<CalendarioCatalogItem> {
  return apiFetch<CalendarioCatalogItem>(`/catalog/task-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function apiDeleteTaskType(id: string): Promise<void> {
  await apiFetch<void>(withInstitution(`/catalog/task-types/${id}`), { method: 'DELETE' })
}
