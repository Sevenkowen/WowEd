const baseUrl = import.meta.env.VITE_API_URL ?? '/api'

/** Misma institución por defecto que el backend (single-tenant en dev). */
const FALLBACK_INSTITUTION_ID = '00000000-0000-0000-0000-000000000001'

export function useApi(): boolean {
  return import.meta.env.VITE_USE_API === 'true'
}

export function institutionId(): string | undefined {
  const fromEnv = import.meta.env.VITE_INSTITUTION_ID as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim()
  if (useApi()) return FALLBACK_INSTITUTION_ID
  return undefined
}

export function institutionQueryParam(): string {
  const id = institutionId()
  return id ? `institution_id=${encodeURIComponent(id)}` : ''
}

export function withInstitution(path: string): string {
  const q = institutionQueryParam()
  if (!q) return path
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`
}

export function withInstitutionBody<T extends object>(
  payload: T,
): T & { institution_id?: string } {
  const id = institutionId()
  return id ? { ...payload, institution_id: id } : payload
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new Error(
      'No se pudo conectar con la API. Verificá que el backend esté corriendo (puerto 8000) y que VITE_API_URL sea /api en desarrollo.',
    )
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? body.message ?? detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
