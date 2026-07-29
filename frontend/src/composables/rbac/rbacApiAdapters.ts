import {
  bulkImportAdminPersonnel,
  createAdminPersonnel,
  createAdminRole,
  createAdminSchool,
  deleteAdminPersonnel,
  deleteAdminRole,
  deleteAdminSchool,
  fetchAdminAcademicStructure,
  fetchAdminDashboardStats,
  fetchAdminPersonnel,
  fetchAdminRoles,
  fetchAdminSchools,
  updateAdminPersonnel,
  updateAdminRole,
  updateAdminSchool,
} from '@/api/adminApi'
import { fetchLeadershipTeam } from '@/api/institutionApi'
import {
  bulkImportSuperadminPersonnel,
  createRepresentanteLegal,
  createSuperadminLeadershipMember,
  createSuperadminRole,
  createSuperadminSchool,
  deleteSuperadminPersonnel,
  deleteSuperadminRole,
  deleteSuperadminSchool,
  fetchSuperadminAcademicStructure,
  fetchSuperadminDashboardStats,
  fetchAllSuperadminInstitutions,
  fetchSuperadminLeadershipTeam,
  fetchSuperadminPersonnel,
  fetchSuperadminRoles,
  fetchSuperadminSchools,
  updateSuperadminPersonnel,
  updateSuperadminRole,
  updateSuperadminSchool,
} from '@/api/superadminApi'
import { fetchTeachers } from '@/api/structureApi'
import type {
  RbacDashboardStats,
  RbacEstructuraApi,
  RbacPersonnelApi,
  RbacPersonnelCreatePayload,
  RbacRolesApi,
} from '@/types/rbac'

export const superadminPersonnelApi: RbacPersonnelApi = {
  fetchPersonnel: fetchSuperadminPersonnel,
  updatePersonnel: updateSuperadminPersonnel,
  deletePersonnel: deleteSuperadminPersonnel,
  fetchSchools: (institutionId) =>
    institutionId ? fetchSuperadminSchools(institutionId).then((s) => s.map(({ id, name }) => ({ id, name }))) : Promise.resolve([]),
  async createPersonnel(payload: RbacPersonnelCreatePayload) {
    const institutionId = payload.institutionId
    if (!institutionId) throw new Error('Seleccioná una institución')
    if (payload.positionKey === 'administrador' || payload.positionKey === 'superadmin') {
      throw new Error('Los administradores se gestionan desde el módulo Administradores')
    }
    const body = {
      ...payload,
      password: payload.password,
      schoolId: payload.schoolId,
    }
    if (payload.positionKey === 'representante_legal') {
      const member = await createRepresentanteLegal(institutionId, body)
      return member.id
    }
    const member = await createSuperadminLeadershipMember(institutionId, {
      ...body,
      positionKey: payload.positionKey,
    })
    return member.id
  },
  bulkImportPersonnel: (institutionId, rows) => {
    if (!institutionId) throw new Error('Seleccioná una institución')
    return bulkImportSuperadminPersonnel(institutionId, rows)
  },
}

export const adminPersonnelApi: RbacPersonnelApi = {
  fetchPersonnel: fetchAdminPersonnel,
  updatePersonnel: updateAdminPersonnel,
  deletePersonnel: deleteAdminPersonnel,
  fetchSchools: () => fetchAdminSchools().then((s) => s.map(({ id, name }) => ({ id, name }))),
  async createPersonnel(payload: RbacPersonnelCreatePayload) {
    const created = await createAdminPersonnel({
      ...payload,
      password: payload.password,
      schoolId: payload.schoolId,
      positionKey: payload.positionKey,
    })
    return created.id
  },
  bulkImportPersonnel: (_institutionId, rows) => bulkImportAdminPersonnel(rows),
}

export const superadminRolesApi: RbacRolesApi = {
  fetchRoles: fetchSuperadminRoles,
  createRole: ({ institutionId, ...payload }) => {
    if (!institutionId) throw new Error('Seleccioná una institución')
    return createSuperadminRole({ institutionId, ...payload })
  },
  updateRole: updateSuperadminRole,
  deleteRole: deleteSuperadminRole,
}

export const adminRolesApi: RbacRolesApi = {
  fetchRoles: fetchAdminRoles,
  createRole: createAdminRole,
  updateRole: updateAdminRole,
  deleteRole: deleteAdminRole,
}

export const superadminEstructuraApi: RbacEstructuraApi = {
  fetchStructure: fetchSuperadminAcademicStructure,
  fetchInstitutions: fetchAllSuperadminInstitutions,
  createSchool: ({ institutionId, ...payload }) => {
    if (!institutionId) throw new Error('Seleccioná una institución')
    return createSuperadminSchool(institutionId, payload)
  },
  updateSchool: (schoolId, { institutionId, ...payload }) => {
    if (!institutionId) throw new Error('Institución inválida')
    return updateSuperadminSchool(institutionId, schoolId, payload)
  },
  deleteSchool: (schoolId, institutionId) => {
    if (!institutionId) throw new Error('Institución inválida')
    return deleteSuperadminSchool(institutionId, schoolId)
  },
  fetchDirectors: (institutionId) =>
    institutionId ? fetchSuperadminLeadershipTeam(institutionId) : Promise.resolve([]),
  fetchTeachers,
}

export const adminEstructuraApi: RbacEstructuraApi = {
  fetchStructure: fetchAdminAcademicStructure,
  createSchool: (payload) => createAdminSchool(payload),
  updateSchool: (schoolId, payload) => updateAdminSchool(schoolId, payload),
  deleteSchool: (schoolId) => deleteAdminSchool(schoolId),
  fetchDirectors: () => fetchLeadershipTeam(),
  fetchTeachers,
}

export async function fetchSuperadminDashboardStatsNormalized(): Promise<RbacDashboardStats> {
  const stats = await fetchSuperadminDashboardStats()
  return {
    personnelCount: stats.personnelCount,
    schoolCount: stats.schoolCount,
    customRoleCount: stats.customRoleCount,
    institutionCount: stats.institutionCount,
    userCount: stats.userCount,
    authMethod: stats.authMethod,
    passwordHash: stats.passwordHash,
    multiTenantIsolation: stats.multiTenantIsolation,
  }
}

export async function fetchAdminDashboardStatsNormalized(): Promise<RbacDashboardStats> {
  const stats = await fetchAdminDashboardStats()
  return {
    personnelCount: stats.personnelCount,
    schoolCount: stats.schoolCount,
    customRoleCount: stats.customRoleCount,
    institutionName: stats.institutionName,
    authMethod: stats.authMethod,
    passwordHash: stats.passwordHash,
    multiTenantIsolation: stats.multiTenantIsolation,
  }
}
