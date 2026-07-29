export const FIXED_PLATFORM_ROLE_CODES = [
  'superadmin',
  'administrador',
  'director',
  'profesor',
] as const

export type FixedPlatformRoleCode = (typeof FIXED_PLATFORM_ROLE_CODES)[number]

/** Roles fijos asignables al crear/editar personal (vía membresía escolar). */
export const ASSIGNABLE_FIXED_ROLE_CODES = ['director', 'profesor'] as const

/** Todos los roles fijos visibles en el selector (Super Admin y Administrador no se crean desde Personal). */
export const PERSONNEL_PICKER_FIXED_ROLE_CODES = [
  'superadmin',
  'administrador',
  'director',
  'profesor',
] as const

export interface PersonnelRoleBadgeSource {
  key: string
  roleCode?: string | null
  isSystemReserved?: boolean
  institutionId?: string | null
}

export function resolvePersonnelRoleCode(
  role: PersonnelRoleBadgeSource,
): FixedPlatformRoleCode | 'custom' {
  if (
    role.roleCode &&
    (FIXED_PLATFORM_ROLE_CODES as readonly string[]).includes(role.roleCode)
  ) {
    return role.roleCode as FixedPlatformRoleCode
  }

  const key = role.key.trim().toLowerCase()
  if (key === 'superadmin') return 'superadmin'
  if (key.startsWith('teacher:')) return 'profesor'
  if ((FIXED_PLATFORM_ROLE_CODES as readonly string[]).includes(key)) {
    return key as FixedPlatformRoleCode
  }
  return 'custom'
}

const PERSONNEL_ROLE_BADGE_CLASSES: Record<FixedPlatformRoleCode | 'custom', string> = {
  superadmin:
    'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  administrador: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  director: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  profesor: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  custom: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
}

export function personnelRoleBadgeClasses(role: PersonnelRoleBadgeSource): string {
  const kind = resolvePersonnelRoleCode(role)
  return `inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PERSONNEL_ROLE_BADGE_CLASSES[kind]}`
}

const SYSTEM_ROLE_ROW_CLASSES: Record<FixedPlatformRoleCode, string> = {
  superadmin: 'bg-violet-50/40 dark:bg-violet-950/10',
  administrador: 'bg-blue-50/40 dark:bg-blue-950/10',
  director: 'bg-emerald-50/40 dark:bg-emerald-950/10',
  profesor: 'bg-amber-50/40 dark:bg-amber-950/10',
}

const SYSTEM_ROLE_CHIP_CLASSES: Record<FixedPlatformRoleCode, string> = {
  superadmin:
    'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  administrador: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  director: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  profesor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
}

export function systemRoleRowClasses(roleCode?: string | null): string {
  if (roleCode && (FIXED_PLATFORM_ROLE_CODES as readonly string[]).includes(roleCode)) {
    return SYSTEM_ROLE_ROW_CLASSES[roleCode as FixedPlatformRoleCode]
  }
  return 'bg-violet-50/40 dark:bg-violet-950/10'
}

export function systemRoleChipClasses(roleCode?: string | null): string {
  if (roleCode && (FIXED_PLATFORM_ROLE_CODES as readonly string[]).includes(roleCode)) {
    return SYSTEM_ROLE_CHIP_CLASSES[roleCode as FixedPlatformRoleCode]
  }
  return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
}

const SYSTEM_ROLE_ICON_CLASSES: Record<FixedPlatformRoleCode, string> = {
  superadmin:
    'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  administrador: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  director: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  profesor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
}

export function systemRoleIconClasses(roleCode?: string | null): string {
  if (roleCode && (FIXED_PLATFORM_ROLE_CODES as readonly string[]).includes(roleCode)) {
    return SYSTEM_ROLE_ICON_CLASSES[roleCode as FixedPlatformRoleCode]
  }
  return 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
}

const FIXED_ROLE_LABELS: Record<FixedPlatformRoleCode, string> = {
  superadmin: 'Super Admin',
  administrador: 'Administrador',
  director: 'Director',
  profesor: 'Profesor',
}

export function fixedPlatformRoleLabel(
  roleCode: FixedPlatformRoleCode,
  catalogName?: string | null,
): string {
  return catalogName?.trim() || FIXED_ROLE_LABELS[roleCode]
}

export function uniquePersonnelRolesForDisplay(
  roles: PersonnelRoleBadgeSource[],
): PersonnelRoleBadgeSource[] {
  const seen = new Set<string>()
  const unique: PersonnelRoleBadgeSource[] = []

  for (const role of roles) {
    const code = resolvePersonnelRoleCode(role)
    if (seen.has(code)) continue
    seen.add(code)
    unique.push(role)
  }

  return unique
}
