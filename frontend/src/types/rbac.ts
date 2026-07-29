import type { Component } from 'vue'
import type {
  BulkPersonnelImportResult,
  BulkPersonnelImportRow,
  InstitutionSchool,
  PaginatedPersonnel,
  PersonnelQueryParams,
  SuperadminAcademicStructure,
  SuperadminInstitution,
  SuperadminPersonnel,
  SuperadminRole,
} from '@/api/superadminApi'
import type { LeadershipMember, LeadershipPosition } from '@/api/institutionApi'
import type { Teacher } from '@/api/structureApi'
import type { UserProfileCreatePayload, UserProfileOptional } from '@/types/userProfile'

/** Ámbito de jurisdicción del módulo RBAC */
export type RbacScopeKind = 'platform' | 'institution'

/** Claves estables de módulos — base para asignación dinámica por rol */
export type RbacModuleKey =
  | 'dashboard'
  | 'institutions'
  | 'administradores'
  | 'personnel'
  | 'roles'
  | 'estructura'

export interface RbacModuleDefinition {
  key: RbacModuleKey
  label: string
  scopes: RbacScopeKind[]
  routes: Partial<Record<RbacScopeKind, string>>
  /** Roles de plataforma que tienen este módulo por defecto (hasta permisos dinámicos) */
  defaultPlatformRoles?: string[]
}

export interface RbacDashboardStats {
  personnelCount: number
  schoolCount: number
  customRoleCount: number
  institutionCount?: number
  userCount?: number
  institutionName?: string
  authMethod: string
  passwordHash: string
  multiTenantIsolation: boolean
}

export interface RbacDashboardCard {
  eyebrow: string
  title: string
  linkLabel?: string
  to?: string
  icon: Component
  stat?: string
  status?: string
  static?: boolean
}

export interface RbacPersonnelCreatePayload extends UserProfileCreatePayload {
  password: string
  schoolId?: string
  positionKey: string
  institutionId?: string
}

export interface RbacPersonnelApi {
  fetchPersonnel: (params?: PersonnelQueryParams) => Promise<PaginatedPersonnel>
  updatePersonnel: (
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
  ) => Promise<SuperadminPersonnel>
  deletePersonnel: (userId: string) => Promise<void>
  createPersonnel: (payload: RbacPersonnelCreatePayload) => Promise<string>
  bulkImportPersonnel?: (
    institutionId: string | undefined,
    rows: BulkPersonnelImportRow[],
  ) => Promise<BulkPersonnelImportResult>
  fetchSchools: (institutionId?: string) => Promise<{ id: string; name: string }[]>
}

export interface RbacPersonnelModuleConfig {
  scope: RbacScopeKind
  moduleKey: RbacModuleKey
  estructuraRoute: string
  createModalHint: string
  editDisabledTitle: string
  deleteDisabledTitle: string
  blockedCreateRoles: readonly string[]
  defaultCreateRole: string
  showInstitutionPicker: boolean
  api: RbacPersonnelApi
  fetchRoles: () => Promise<SuperadminRole[]>
  getInstitutions?: () => Promise<{ id: string; name: string }[]>
  getDefaultInstitutionId?: () => string | undefined
  onInstitutionChange?: (institutionId: string) => void
}

export interface RbacRolesApi {
  fetchRoles: () => Promise<SuperadminRole[]>
  createRole: (payload: {
    name: string
    description?: string
    institutionId?: string
    allowedModules?: string[]
  }) => Promise<SuperadminRole>
  updateRole: (
    roleId: string,
    payload: { name: string; description?: string; allowedModules?: string[] },
  ) => Promise<SuperadminRole>
  deleteRole: (roleId: string) => Promise<void>
}

export interface RbacRolesModuleConfig {
  scope: RbacScopeKind
  moduleKey: RbacModuleKey
  subtitle: string
  showInstitutionPicker: boolean
  api: RbacRolesApi
  getInstitutions?: () => Promise<{ id: string; name: string }[]>
  getDefaultInstitutionId?: () => string | undefined
  onInstitutionChange?: (institutionId: string) => void
  institutionLabel?: () => string | undefined
}

export interface RbacDashboardModuleConfig {
  scope: RbacScopeKind
  moduleKey: RbacModuleKey
  title: string
  sessionBadge: string
  roleLabel: string
  roleDescription: (ctx: { institutionName?: string }) => string
  statsSummary: (stats: RbacDashboardStats) => string
  buildCards: (stats: RbacDashboardStats | null, loading: boolean) => RbacDashboardCard[]
  fetchStats: () => Promise<RbacDashboardStats>
}

export interface RbacEstructuraApi {
  fetchStructure: () => Promise<SuperadminAcademicStructure>
  createSchool: (payload: {
    institutionId?: string
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
  }) => Promise<InstitutionSchool>
  updateSchool: (
    schoolId: string,
    payload: {
      institutionId?: string
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
  ) => Promise<InstitutionSchool>
  deleteSchool: (schoolId: string, institutionId?: string) => Promise<void>
  fetchInstitutions?: () => Promise<SuperadminInstitution[]>
  fetchDirectors: (institutionId?: string) => Promise<LeadershipMember[]>
  fetchTeachers: (institutionId: string) => Promise<Teacher[]>
}

export type RbacEstructuraSection = 'colegios' | 'profesores'

export interface RbacEstructuraModuleConfig {
  scope: RbacScopeKind
  moduleKey: RbacModuleKey
  showInstitutionPicker: boolean
  schoolsListTitle: string
  api: RbacEstructuraApi
  resolveInstitutionId: () => string | undefined
  fetchInstitutions?: () => Promise<SuperadminInstitution[]>
}

export type { LeadershipPosition, PaginatedPersonnel, PersonnelQueryParams, SuperadminPersonnel, SuperadminRole, SuperadminAcademicStructure }
