import { apiFetch } from '@/api/http'
import {
  stripEmptyOptionalProfileFields,
  type UserProfileCreatePayload,
  type UserProfileOptional,
} from '@/types/userProfile'

export interface SuperadminInstitution {
  id: string
  name: string
  responsibleName: string | null
  country: string | null
  province: string | null
  city: string | null
  address: string | null
  cuit: string | null
  phone: string | null
  contactEmail: string | null
  isActive: boolean
  schoolCount: number
}

export interface InstitutionSchool {
  id: string
  name: string
  institutionId: string
  institutionName: string
  address: string | null
  city: string | null
  province: string | null
  cuit: string | null
  phone: string | null
  contactEmail: string | null
  directorName: string | null
  directorMembershipId: string | null
  shiftMorning: boolean
  shiftAfternoon: boolean
  shiftNight: boolean
}

export interface InstitutionMember {
  id: string
  membershipId: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  positionKey: string
  positionLabel: string
  schoolId: string
  schoolName: string | null
  profile?: UserProfileOptional
}

export interface SuperadminAdministrator {
  id: string
  membershipId?: string | null
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  positionKey: string
  positionLabel: string
  schoolId?: string | null
  schoolName?: string | null
  profile?: UserProfileOptional
  institutionId?: string | null
  institutionName?: string | null
  isUnassigned?: boolean
}

export interface UnassignedAdministrator {
  id: string
  displayName: string
  email: string
  username?: string | null
}

export interface PaginatedAdministrators {
  items: SuperadminAdministrator[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SuperadminPersonnelRole {
  key: string
  label: string
  membershipId?: string | null
  removable?: boolean
  institutionId?: string | null
  roleCode?: string | null
  isSystemReserved?: boolean
}

export interface SuperadminPersonnel {
  id: string
  displayName: string
  email: string
  dni: string | null
  cuil: string | null
  phone: string | null
  profile: UserProfileOptional
  roles: SuperadminPersonnelRole[]
  isActive: boolean
  mustChangePassword: boolean
  isOwner: boolean
  canEdit: boolean
  canDelete: boolean
  institutionId?: string | null
  schoolId?: string | null
  membershipId?: string | null
  positionKey?: string | null
}

export interface PaginatedPersonnel {
  items: SuperadminPersonnel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginatedInstitutions {
  items: SuperadminInstitution[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PersonnelQueryParams {
  page?: number
  pageSize?: number
  search?: string
  institutionId?: string
}

export interface InstitutionsQueryParams {
  page?: number
  pageSize?: number
  search?: string
}

function buildPersonnelQuery(params?: PersonnelQueryParams): string {
  const searchParams = new URLSearchParams()
  if (params?.page != null) searchParams.set('page', String(params.page))
  if (params?.pageSize != null) searchParams.set('pageSize', String(params.pageSize))
  if (params?.search?.trim()) searchParams.set('search', params.search.trim())
  if (params?.institutionId?.trim()) searchParams.set('institutionId', params.institutionId.trim())
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildInstitutionsQuery(params?: InstitutionsQueryParams): string {
  const searchParams = new URLSearchParams()
  if (params?.page != null) searchParams.set('page', String(params.page))
  if (params?.pageSize != null) searchParams.set('pageSize', String(params.pageSize))
  if (params?.search?.trim()) searchParams.set('search', params.search.trim())
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export interface SuperadminRole {
  id: string
  name: string
  description: string
  scopeLabel: string
  scopeType: 'system' | 'institution'
  institutionId?: string | null
  roleCode?: string | null
  isSystemReserved: boolean
  canEdit: boolean
  canDelete: boolean
  allowedModules: string[]
}

export interface SuperadminDashboardStats {
  institutionCount: number
  userCount: number
  schoolCount: number
  personnelCount: number
  customRoleCount: number
  authMethod: string
  passwordHash: string
  multiTenantIsolation: boolean
}

export interface SuperadminGrade {
  id: string
  name: string
  institutionId: string
  institutionName: string
  schoolId: string | null
  schoolName: string
  subjectCount: number
}

export interface SuperadminSubjectAssignment {
  id: string
  subject: string
  gradeName: string
  schoolName: string
  institutionName: string
  institutionId: string
  teacherName: string
}

export interface SuperadminAcademicStructure {
  schools: InstitutionSchool[]
  grades: SuperadminGrade[]
  subjectAssignments: SuperadminSubjectAssignment[]
}

export function fetchSuperadminPersonnel(params?: PersonnelQueryParams): Promise<PaginatedPersonnel> {
  return apiFetch<PaginatedPersonnel>(`/superadmin/personnel${buildPersonnelQuery(params)}`)
}

export function updateSuperadminPersonnel(
  userId: string,
  payload: UserProfileOptional & {
    isActive?: boolean
    mustChangePassword?: boolean
    password?: string
    positionKey?: string
    roleKeys?: string[]
    schoolId?: string
    institutionId?: string
    membershipId?: string
  },
): Promise<SuperadminPersonnel> {
  return apiFetch<SuperadminPersonnel>(`/superadmin/personnel/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
  })
}

export function deleteSuperadminPersonnel(userId: string): Promise<void> {
  return apiFetch<void>(`/superadmin/personnel/${userId}`, { method: 'DELETE' })
}

export function fetchSuperadminRoles(): Promise<SuperadminRole[]> {
  return apiFetch<SuperadminRole[]>('/superadmin/roles')
}

export function createSuperadminRole(payload: {
  institutionId: string
  name: string
  description?: string
  allowedModules?: string[]
}): Promise<SuperadminRole> {
  return apiFetch<SuperadminRole>('/superadmin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSuperadminRole(
  roleId: string,
  payload: { name: string; description?: string; allowedModules?: string[] },
): Promise<SuperadminRole> {
  return apiFetch<SuperadminRole>(`/superadmin/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteSuperadminRole(roleId: string): Promise<void> {
  return apiFetch<void>(`/superadmin/roles/${roleId}`, { method: 'DELETE' })
}

export function fetchSuperadminInstitutions(
  params?: InstitutionsQueryParams,
): Promise<PaginatedInstitutions> {
  return apiFetch<PaginatedInstitutions>(`/superadmin/institutions${buildInstitutionsQuery(params)}`)
}

export async function fetchAllSuperadminInstitutions(): Promise<SuperadminInstitution[]> {
  const pageSize = 100
  const first = await fetchSuperadminInstitutions({ page: 1, pageSize })
  if (first.totalPages <= 1) return first.items

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      fetchSuperadminInstitutions({ page: index + 2, pageSize }),
    ),
  )
  return [...first.items, ...rest.flatMap((page) => page.items)]
}

export function createSuperadminInstitution(payload: {
  name: string
  country?: string
  province?: string
  city?: string
  address?: string
  cuit?: string
  phone?: string
  contactEmail?: string
  defaultSchoolName?: string
  administratorUserId: string
}): Promise<SuperadminInstitution> {
  return apiFetch<SuperadminInstitution>('/superadmin/institutions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSuperadminInstitution(
  institutionId: string,
  payload: {
    name: string
    country?: string
    province?: string
    city?: string
    address?: string
    cuit?: string
    phone?: string
    contactEmail?: string
    administratorUserId?: string
  },
): Promise<SuperadminInstitution> {
  return apiFetch<SuperadminInstitution>(`/superadmin/institutions/${institutionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteSuperadminInstitution(institutionId: string): Promise<void> {
  return apiFetch<void>(`/superadmin/institutions/${institutionId}`, { method: 'DELETE' })
}

export function fetchSuperadminSchools(institutionId: string): Promise<InstitutionSchool[]> {
  return apiFetch<InstitutionSchool[]>(`/superadmin/institutions/${institutionId}/schools`)
}

export function createSuperadminSchool(
  institutionId: string,
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
  return apiFetch<InstitutionSchool>(`/superadmin/institutions/${institutionId}/schools`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSuperadminSchool(
  institutionId: string,
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
  return apiFetch<InstitutionSchool>(
    `/superadmin/institutions/${institutionId}/schools/${schoolId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export function deleteSuperadminSchool(institutionId: string, schoolId: string): Promise<void> {
  return apiFetch<void>(`/superadmin/institutions/${institutionId}/schools/${schoolId}`, {
    method: 'DELETE',
  })
}

export function fetchSuperadminDashboardStats(): Promise<SuperadminDashboardStats> {
  return apiFetch<SuperadminDashboardStats>('/superadmin/dashboard-stats')
}

export function fetchSuperadminAcademicStructure(): Promise<SuperadminAcademicStructure> {
  return apiFetch<SuperadminAcademicStructure>('/superadmin/academic-structure')
}

export function fetchRepresentanteLegal(institutionId: string): Promise<InstitutionMember | null> {
  return apiFetch<InstitutionMember | null>(
    `/superadmin/institutions/${institutionId}/representante-legal`,
  )
}

export function createRepresentanteLegal(
  institutionId: string,
  payload: UserProfileCreatePayload & {
    password: string
    schoolId?: string
  },
): Promise<InstitutionMember> {
  return apiFetch<InstitutionMember>(
    `/superadmin/institutions/${institutionId}/representante-legal`,
    {
      method: 'POST',
      body: JSON.stringify(stripEmptyOptionalProfileFields({ ...payload, positionKey: 'representante_legal' })),
    },
  )
}

export function fetchSuperadminLeadershipTeam(institutionId: string): Promise<InstitutionMember[]> {
  return apiFetch<InstitutionMember[]>(
    `/superadmin/institutions/${institutionId}/leadership-team`,
  )
}

export function createSuperadminLeadershipMember(
  institutionId: string,
  payload: UserProfileCreatePayload & {
    password: string
    schoolId?: string
    positionKey: string
  },
): Promise<InstitutionMember> {
  return apiFetch<InstitutionMember>(
    `/superadmin/institutions/${institutionId}/leadership-team`,
    {
      method: 'POST',
      body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
    },
  )
}

export function fetchSuperadminAdministradores(institutionId: string): Promise<InstitutionMember[]> {
  return apiFetch<InstitutionMember[]>(
    `/superadmin/institutions/${institutionId}/administradores`,
  )
}

export interface AdministratorsQueryParams {
  page?: number
  pageSize?: number
  search?: string
}

function buildAdministratorsQuery(params?: AdministratorsQueryParams): string {
  if (!params) return ''
  const query = new URLSearchParams()
  if (params.page != null) query.set('page', String(params.page))
  if (params.pageSize != null) query.set('pageSize', String(params.pageSize))
  if (params.search?.trim()) query.set('search', params.search.trim())
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export function fetchSuperadminAdministradoresList(
  params?: AdministratorsQueryParams,
): Promise<PaginatedAdministrators> {
  return apiFetch<PaginatedAdministrators>(`/superadmin/administradores${buildAdministratorsQuery(params)}`)
}

export function fetchUnassignedAdministradores(): Promise<UnassignedAdministrator[]> {
  return apiFetch<UnassignedAdministrator[]>('/superadmin/administradores/unassigned')
}

export function createPoolAdministrador(
  payload: UserProfileCreatePayload & { password: string },
): Promise<UnassignedAdministrator> {
  return apiFetch<UnassignedAdministrator>('/superadmin/administradores/pool', {
    method: 'POST',
    body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
  })
}

export function createSuperadminAdministrador(
  institutionId: string,
  payload: UserProfileCreatePayload & {
    password: string
    schoolId?: string
  },
): Promise<InstitutionMember> {
  return apiFetch<InstitutionMember>(
    `/superadmin/institutions/${institutionId}/administradores`,
    {
      method: 'POST',
      body: JSON.stringify(stripEmptyOptionalProfileFields({ ...payload, positionKey: 'administrador' })),
    },
  )
}

export interface BulkPersonnelRowResult {
  row: number
  status: 'created' | 'linked' | 'failed'
  userId?: string | null
  username?: string | null
  error?: string | null
}

export interface BulkPersonnelImportResult {
  created: number
  linked: number
  failed: number
  results: BulkPersonnelRowResult[]
}

export type BulkPersonnelImportRow = UserProfileCreatePayload & {
  password: string
  positionKey: string
  schoolId?: string
  schoolName?: string
}

export function bulkImportSuperadminPersonnel(
  institutionId: string,
  rows: BulkPersonnelImportRow[],
): Promise<BulkPersonnelImportResult> {
  return apiFetch<BulkPersonnelImportResult>(
    `/superadmin/institutions/${institutionId}/personnel/bulk`,
    {
      method: 'POST',
      body: JSON.stringify({ rows: rows.map((row) => stripEmptyOptionalProfileFields(row)) }),
    },
  )
}
