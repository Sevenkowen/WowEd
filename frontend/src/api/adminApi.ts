import { apiFetch } from '@/api/http'
import type {
  BulkPersonnelImportResult,
  BulkPersonnelImportRow,
  InstitutionSchool,
  PaginatedPersonnel,
  PersonnelQueryParams,
  SuperadminAcademicStructure,
  SuperadminPersonnel,
  SuperadminRole,
} from '@/api/superadminApi'
import {
  stripEmptyOptionalProfileFields,
  type UserProfileCreatePayload,
  type UserProfileOptional,
} from '@/types/userProfile'

export interface AdminDashboardStats {
  institutionId: string
  institutionName: string
  userCount: number
  schoolCount: number
  personnelCount: number
  customRoleCount: number
  authMethod: string
  passwordHash: string
  multiTenantIsolation: boolean
}

export function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiFetch<AdminDashboardStats>('/institution/admin/dashboard-stats')
}

export function fetchAdminPersonnel(params?: PersonnelQueryParams): Promise<PaginatedPersonnel> {
  const searchParams = new URLSearchParams()
  if (params?.page != null) searchParams.set('page', String(params.page))
  if (params?.pageSize != null) searchParams.set('pageSize', String(params.pageSize))
  if (params?.search?.trim()) searchParams.set('search', params.search.trim())
  const query = searchParams.toString()
  return apiFetch<PaginatedPersonnel>(`/institution/admin/personnel${query ? `?${query}` : ''}`)
}

export function createAdminPersonnel(
  payload: UserProfileCreatePayload & {
    password: string
    schoolId?: string
    positionKey: string
  },
): Promise<SuperadminPersonnel> {
  return apiFetch<SuperadminPersonnel>('/institution/admin/personnel', {
    method: 'POST',
    body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
  })
}

export function updateAdminPersonnel(
  userId: string,
  payload: UserProfileOptional & {
    isActive?: boolean
    mustChangePassword?: boolean
    password?: string
    positionKey?: string
    roleKeys?: string[]
    schoolId?: string
    membershipId?: string
  },
): Promise<SuperadminPersonnel> {
  return apiFetch<SuperadminPersonnel>(`/institution/admin/personnel/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
  })
}

export function deleteAdminPersonnel(userId: string): Promise<void> {
  return apiFetch<void>(`/institution/admin/personnel/${userId}`, { method: 'DELETE' })
}

export function fetchAdminRoles(): Promise<SuperadminRole[]> {
  return apiFetch<SuperadminRole[]>('/institution/admin/roles')
}

export function createAdminRole(payload: {
  name: string
  description?: string
  allowedModules?: string[]
}): Promise<SuperadminRole> {
  return apiFetch<SuperadminRole>('/institution/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminRole(
  roleId: string,
  payload: { name: string; description?: string; allowedModules?: string[] },
): Promise<SuperadminRole> {
  return apiFetch<SuperadminRole>(`/institution/admin/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminRole(roleId: string): Promise<void> {
  return apiFetch<void>(`/institution/admin/roles/${roleId}`, { method: 'DELETE' })
}

export function fetchAdminSchools(): Promise<InstitutionSchool[]> {
  return apiFetch<InstitutionSchool[]>('/institution/admin/schools')
}

export function createAdminSchool(payload: {
  name: string
  address?: string
  city?: string
  province?: string
  cuit?: string
  phone?: string
  contactEmail?: string
  directorMembershipId?: string
  shiftMorning?: boolean
  shiftAfternoon?: boolean
  shiftNight?: boolean
}): Promise<InstitutionSchool> {
  return apiFetch<InstitutionSchool>('/institution/admin/schools', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminSchool(
  schoolId: string,
  payload: {
    name: string
    address?: string
    city?: string
    province?: string
    cuit?: string
    phone?: string
    contactEmail?: string
    directorMembershipId?: string
    shiftMorning?: boolean
    shiftAfternoon?: boolean
    shiftNight?: boolean
  },
): Promise<InstitutionSchool> {
  return apiFetch<InstitutionSchool>(`/institution/admin/schools/${schoolId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminSchool(schoolId: string): Promise<void> {
  return apiFetch<void>(`/institution/admin/schools/${schoolId}`, { method: 'DELETE' })
}

export function fetchAdminAcademicStructure(): Promise<SuperadminAcademicStructure> {
  return apiFetch<SuperadminAcademicStructure>('/institution/admin/academic-structure')
}

export function bulkImportAdminPersonnel(rows: BulkPersonnelImportRow[]): Promise<BulkPersonnelImportResult> {
  return apiFetch<BulkPersonnelImportResult>('/institution/admin/personnel/bulk', {
    method: 'POST',
    body: JSON.stringify({
      rows: rows.map((row) => stripEmptyOptionalProfileFields(row)),
    }),
  })
}
