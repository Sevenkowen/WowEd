import { apiFetch } from '@/api/http'

export interface DirectorContext {
  school_id: string
  school_name: string
  institution_id: string
  institution_name: string | null
  role: string
}

export interface AuthUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string
  role: string
  school_id: string | null
  school_name: string | null
  institution_id: string | null
  institution_name: string | null
  is_superadmin?: boolean
  is_owner?: boolean
  must_change_password?: boolean
  allowedModules?: string[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
  contexts: DirectorContext[]
}

export function loginApi(login: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
}

export function meApi(): Promise<{ user: AuthUser; contexts: DirectorContext[] }> {
  return apiFetch<{ user: AuthUser; contexts: DirectorContext[] }>('/auth/me')
}

export function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}
