const baseUrl = import.meta.env.VITE_API_URL ?? '/api'

/** Misma institución por defecto que el backend (single-tenant en dev). */
const FALLBACK_INSTITUTION_ID = '00000000-0000-0000-0000-000000000001'

const TOKEN_KEY = 'wowed-auth-token'

function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!item || typeof item !== 'object') return JSON.stringify(item)
        const record = item as { loc?: unknown[]; msg?: string }
        const msg = record.msg?.replace(/^Value error,\s*/i, '') ?? JSON.stringify(item)
        const field = Array.isArray(record.loc)
          ? record.loc.filter((part) => part !== 'body').join('.')
          : ''
        return field ? `${field}: ${msg}` : msg
      })
      .join(' · ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return String(detail)
}

export function useApi(): boolean {
  return import.meta.env.VITE_USE_API === 'true'
}

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function institutionId(): string | undefined {
  try {
    const raw = localStorage.getItem('wowed-auth-user')
    if (raw) {
      const user = JSON.parse(raw) as { institution_id?: string }
      if (user.institution_id?.trim()) return user.institution_id.trim()
    }
  } catch {
    /* ignore */
  }
  const fromEnv = import.meta.env.VITE_INSTITUTION_ID as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim()
  if (useApi()) return FALLBACK_INSTITUTION_ID
  return undefined
}

export function institutionQueryParam(): string {
  const id = institutionId()
  return id ? `institution_id=${encodeURIComponent(id)}` : ''
}

export function withInstitutionId(path: string, institutionId: string): string {
  const q = `institution_id=${encodeURIComponent(institutionId)}`
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`
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
  const authToken = getStoredAuthToken()
  const timeoutMs = 20_000
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signal =
    init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, timeoutSignal])
      : init?.signal ?? timeoutSignal
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error(
        'La API no respondió a tiempo. Verificá que el backend (puerto 8000) y el túnel SSH a PostgreSQL estén activos.',
      )
    }
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
    throw new Error(formatApiErrorDetail(detail))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
