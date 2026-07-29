import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import {
  adminEstructuraApi,
  adminPersonnelApi,
  adminRolesApi,
  fetchAdminDashboardStatsNormalized,
  fetchSuperadminDashboardStatsNormalized,
  superadminEstructuraApi,
  superadminPersonnelApi,
  superadminRolesApi,
} from '@/composables/rbac/rbacApiAdapters'
import { fetchAdminRoles } from '@/api/adminApi'
import { fetchSuperadminRoles } from '@/api/superadminApi'
import { rbacModuleRoute } from '@/data/rbacModuleRegistry'
import type {
  RbacDashboardCard,
  RbacDashboardModuleConfig,
  RbacEstructuraModuleConfig,
  RbacPersonnelModuleConfig,
  RbacRolesModuleConfig,
} from '@/types/rbac'
import { getAuthInstitutionId } from '@/composables/useAuth'

export const superadminPersonnelConfig: RbacPersonnelModuleConfig = {
  scope: 'platform',
  moduleKey: 'personnel',
  estructuraRoute: rbacModuleRoute('estructura', 'platform')!,
  createModalHint:
    'Creá usuarios institucionales (director, profesor, roles custom). Los administradores se gestionan en el módulo Administradores.',
  editDisabledTitle: 'No se puede editar un SuperAdmin/Owner',
  deleteDisabledTitle: 'No se puede eliminar un SuperAdmin/Owner',
  blockedCreateRoles: ['administrador'],
  defaultCreateRole: 'director',
  showInstitutionPicker: true,
  api: superadminPersonnelApi,
  fetchRoles: fetchSuperadminRoles,
}

export const adminPersonnelConfig: RbacPersonnelModuleConfig = {
  scope: 'institution',
  moduleKey: 'personnel',
  estructuraRoute: rbacModuleRoute('estructura', 'institution')!,
  createModalHint:
    'Creá un usuario subordinado en tu institución. Los roles de Administrador y Representante Legal solo los gestiona el SuperAdmin.',
  editDisabledTitle: 'No se puede editar este usuario',
  deleteDisabledTitle: 'No se puede eliminar este usuario',
  blockedCreateRoles: ['administrador', 'representante_legal'],
  defaultCreateRole: 'director',
  showInstitutionPicker: false,
  api: adminPersonnelApi,
  fetchRoles: fetchAdminRoles,
}

export const superadminRolesConfig: RbacRolesModuleConfig = {
  scope: 'platform',
  moduleKey: 'roles',
  subtitle:
    'Cuatro roles fijos de plataforma más roles personalizados (Secretario, Vicedirector, etc.) por institución.',
  showInstitutionPicker: true,
  api: superadminRolesApi,
}

export const adminRolesConfig: RbacRolesModuleConfig = {
  scope: 'institution',
  moduleKey: 'roles',
  subtitle: 'Roles personalizados (Bibliotecario, Secretario, Vicedirector, etc.) para tu institución.',
  showInstitutionPicker: false,
  api: adminRolesApi,
}

export const superadminDashboardConfig: RbacDashboardModuleConfig = {
  scope: 'platform',
  moduleKey: 'dashboard',
  title: 'Panel de Control Jerárquico',
  sessionBadge: 'Sesión Activa: SuperAdmin',
  roleLabel: 'SuperAdmin',
  roleDescription: () =>
    'Tenés control global absoluto (Owner) sobre todo el sistema multi-tenant. Podés crear administradores, gestionar instituciones y visualizar todas las entidades sin restricciones.',
  statsSummary: (stats) => `${stats.userCount ?? 0} usuarios totales en la plataforma`,
  fetchStats: fetchSuperadminDashboardStatsNormalized,
  buildCards(stats, loading) {
    const cards: RbacDashboardCard[] = [
      {
        eyebrow: 'Nivel Owner',
        title: 'Instituciones',
        linkLabel: 'Gestionar tenants',
        to: rbacModuleRoute('institutions', 'platform'),
        icon: BuildingOffice2Icon,
        stat: loading ? '…' : `${stats?.institutionCount ?? 0} registradas`,
      },
      {
        eyebrow: 'Personal y Subordinados',
        title: 'Creación Top-Down',
        linkLabel: 'Gestionar usuarios',
        to: rbacModuleRoute('personnel', 'platform'),
        icon: UserGroupIcon,
        stat: loading ? '…' : `${stats?.personnelCount ?? 0} usuarios activos`,
      },
      {
        eyebrow: 'Estructura Académica',
        title: 'Colegios & Materias',
        linkLabel: 'Ver colegios',
        to: rbacModuleRoute('estructura', 'platform'),
        icon: AcademicCapIcon,
        stat: loading
          ? '…'
          : `${stats?.schoolCount ?? 0} colegios · ${stats?.customRoleCount ?? 0} roles custom`,
      },
      {
        eyebrow: 'Seguridad Activa',
        title: stats ? `${stats.authMethod} & ${stats.passwordHash}` : 'JWT & bcrypt',
        status: stats?.multiTenantIsolation ? 'Aislamiento Multi-Tenant OK' : 'Revisar configuración multi-tenant',
        icon: ShieldCheckIcon,
        static: true,
      },
    ]
    return cards
  },
}

export const adminDashboardConfig: RbacDashboardModuleConfig = {
  scope: 'institution',
  moduleKey: 'dashboard',
  title: 'Panel de Control Institucional',
  sessionBadge: 'Sesión Activa: Administrador',
  roleLabel: 'Administrador',
  roleDescription: ({ institutionName }) =>
    `Gestionás el personal, roles y estructura académica de ${institutionName ?? 'tu institución'}. La creación de nuevas instituciones está reservada al SuperAdmin.`,
  statsSummary: (stats) => `${stats.personnelCount} usuarios en tu institución`,
  fetchStats: fetchAdminDashboardStatsNormalized,
  buildCards(stats, loading) {
    return [
      {
        eyebrow: 'Personal y Subordinados',
        title: 'Creación Top-Down',
        linkLabel: 'Gestionar usuarios',
        to: rbacModuleRoute('personnel', 'institution'),
        icon: UserGroupIcon,
        stat: loading ? '…' : `${stats?.personnelCount ?? 0} usuarios activos`,
      },
      {
        eyebrow: 'Roles Institucionales',
        title: 'Catálogo RBAC',
        linkLabel: 'Gestionar roles',
        to: rbacModuleRoute('roles', 'institution'),
        icon: ShieldCheckIcon,
        stat: loading ? '…' : `${stats?.customRoleCount ?? 0} roles personalizados`,
      },
      {
        eyebrow: 'Estructura Académica',
        title: 'Colegios & Materias',
        linkLabel: 'Ver colegios',
        to: rbacModuleRoute('estructura', 'institution'),
        icon: AcademicCapIcon,
        stat: loading ? '…' : `${stats?.schoolCount ?? 0} colegios en tu institución`,
      },
      {
        eyebrow: 'Seguridad Activa',
        title: stats ? `${stats.authMethod} & ${stats.passwordHash}` : 'JWT & bcrypt',
        status: stats?.multiTenantIsolation ? 'Aislamiento Multi-Tenant OK' : 'Revisar configuración multi-tenant',
        icon: ShieldCheckIcon,
        static: true,
      },
    ]
  },
}

export const superadminEstructuraConfig: RbacEstructuraModuleConfig = {
  scope: 'platform',
  moduleKey: 'estructura',
  showInstitutionPicker: true,
  schoolsListTitle: 'Listado de Colegios en tu Jurisdicción',
  api: superadminEstructuraApi,
  resolveInstitutionId: () => undefined,
  fetchInstitutions: superadminEstructuraApi.fetchInstitutions,
}

export const adminEstructuraConfig: RbacEstructuraModuleConfig = {
  scope: 'institution',
  moduleKey: 'estructura',
  showInstitutionPicker: false,
  schoolsListTitle: 'Listado de Colegios',
  api: adminEstructuraApi,
  resolveInstitutionId: getAuthInstitutionId,
}
