/**
 * Catálogo canónico de módulos asignables por rol.
 * Fuente de verdad para UI de permisos, sidebar y rutas.
 * Mantener alineado con backend/app/services/module_permissions.py
 */

export type ModuleScopeKind = 'platform' | 'institution' | 'school'

export type ModuleCategoryKey =
  | 'principal'
  | 'dimensiones'
  | 'gestion_escolar'
  | 'multigestion'
  | 'institucion'
  | 'plataforma'

export interface ModuleCategoryDefinition {
  key: ModuleCategoryKey
  label: string
}

export interface ModuleAccessDefinition {
  key: string
  label: string
  category: ModuleCategoryKey
  scopes: ModuleScopeKind[]
  route?: string
}

export const MODULE_CATEGORIES: ModuleCategoryDefinition[] = [
  { key: 'principal', label: 'Principal' },
  { key: 'dimensiones', label: 'Dimensiones de la Gestión' },
  { key: 'gestion_escolar', label: 'Gestión Escolar' },
  { key: 'multigestion', label: 'Multigestión' },
  { key: 'institucion', label: 'Institución' },
  { key: 'plataforma', label: 'Administración de Plataforma' },
]

/** 30 módulos semánticos + rutas del menú director y RBAC */
export const MODULE_ACCESS_REGISTRY: ModuleAccessDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', category: 'principal', scopes: ['school', 'platform', 'institution'], route: '/' },
  { key: 'calendario', label: 'Calendario', category: 'principal', scopes: ['school'], route: '/planificador-anual' },
  { key: 'objetivos', label: 'Objetivos', category: 'principal', scopes: ['school'], route: '/objetivos' },
  { key: 'agenda', label: 'Agenda', category: 'principal', scopes: ['school'], route: '/planificador-semanal' },
  { key: 'dimension_pedagogico', label: 'Dimensión Pedagógico-Didáctica', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/pedagogico-didactica' },
  { key: 'dimension_dta', label: 'Dimensión Técnico-Administrativa (DTA)', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/tecnico-administrativa' },
  { key: 'dimension_socio', label: 'Dimensión Socio-Comunicativa', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/socio-comunicativa' },
  { key: 'dimension_gpe', label: 'Gobernanza y Política Educativa (GPE)', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/gobernanza-politica-educativa' },
  { key: 'dimension_pemi', label: 'Planificación Estratégica y Metas (PEMI)', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/pemi' },
  { key: 'dimension_reflexion', label: 'Reflexión', category: 'dimensiones', scopes: ['school'], route: '/dimensiones/reflexion' },
  { key: 'equipo_directivo', label: 'Equipo Directivo', category: 'gestion_escolar', scopes: ['school'], route: '/equipo-directivo' },
  { key: 'orientacion_escolar', label: 'Orientación Escolar', category: 'gestion_escolar', scopes: ['school'], route: '/orientacion-escolar' },
  { key: 'informes', label: 'Informes', category: 'gestion_escolar', scopes: ['school'], route: '/informes' },
  { key: 'analisis_tiempo', label: 'Análisis de Tiempo', category: 'gestion_escolar', scopes: ['school'], route: '/analisis-tiempo' },
  { key: 'multigestion_colaboracion', label: 'Colaboración y Comunicación', category: 'multigestion', scopes: ['school'], route: '/multigestion/colaboracion-comunicacion' },
  { key: 'multigestion_proyectos', label: 'Gestión de Proyectos', category: 'multigestion', scopes: ['school'], route: '/multigestion/gestion-proyectos' },
  { key: 'multigestion_documental', label: 'Gestión Documental', category: 'multigestion', scopes: ['school'], route: '/multigestion/gestion-documental' },
  { key: 'multigestion_mir', label: 'Gestión de Infraestructura y Recursos (MIR)', category: 'multigestion', scopes: ['school'], route: '/multigestion/mir' },
  { key: 'multigestion_personal', label: 'Gestión de Personal y Horarios', category: 'multigestion', scopes: ['school'], route: '/multigestion/personal-horarios' },
  { key: 'multigestion_desarrollo', label: 'Directorio de Desarrollo Profesional', category: 'multigestion', scopes: ['school'], route: '/multigestion/desarrollo-profesional' },
  { key: 'multigestion_familias', label: 'Relación Escuela-Familias', category: 'multigestion', scopes: ['school'], route: '/multigestion/escuela-familias' },
  { key: 'multigestion_cpa', label: 'Impulso CPA', category: 'multigestion', scopes: ['school'], route: '/multigestion/impulso-cpa' },
  { key: 'multigestion_esi', label: 'ESI en Acción', category: 'multigestion', scopes: ['school'], route: '/multigestion/esi-accion' },
  { key: 'multigestion_pulso', label: 'Pulso Docente: Clima y Bienestar', category: 'multigestion', scopes: ['school'], route: '/multigestion/pulso-docente' },
  { key: 'centro_gestion', label: 'Centro de Gestión Institucional', category: 'institucion', scopes: ['school'], route: '/centro-gestion-institucional' },
  { key: 'estructura_escolar', label: 'Estructura Escolar', category: 'institucion', scopes: ['school'], route: '/estructura-escolar' },
  { key: 'institutions', label: 'Instituciones', category: 'plataforma', scopes: ['platform'], route: '/superadmin/instituciones' },
  { key: 'administradores', label: 'Administradores', category: 'plataforma', scopes: ['platform'], route: '/superadmin/administradores' },
  { key: 'personnel', label: 'Directivos', category: 'plataforma', scopes: ['platform', 'institution'], route: '/superadmin/usuarios' },
  { key: 'roles', label: 'Roles Institucionales', category: 'plataforma', scopes: ['platform', 'institution'], route: '/superadmin/roles' },
  { key: 'estructura', label: 'Colegios y Materias', category: 'plataforma', scopes: ['platform', 'institution'], route: '/superadmin/estructura/colegios' },
]

export const ALL_MODULE_KEYS = MODULE_ACCESS_REGISTRY.map((m) => m.key)

export function moduleByKey(key: string): ModuleAccessDefinition | undefined {
  return MODULE_ACCESS_REGISTRY.find((m) => m.key === key)
}

export function modulesForScopes(...scopes: ModuleScopeKind[]): ModuleAccessDefinition[] {
  return MODULE_ACCESS_REGISTRY.filter((m) => m.scopes.some((s) => scopes.includes(s)))
}

export function modulesGroupedByCategory(
  scopeFilter?: ModuleScopeKind[],
): { category: ModuleCategoryDefinition; modules: ModuleAccessDefinition[] }[] {
  const modules = scopeFilter?.length
    ? MODULE_ACCESS_REGISTRY.filter((m) => m.scopes.some((s) => scopeFilter.includes(s)))
    : MODULE_ACCESS_REGISTRY

  return MODULE_CATEGORIES.map((category) => ({
    category,
    modules: modules.filter((m) => m.category === category.key),
  })).filter((group) => group.modules.length > 0)
}

export function moduleLabelsForKeys(keys: string[]): string[] {
  return keys.map((key) => moduleByKey(key)?.label ?? key).filter(Boolean)
}

export const ROUTE_TO_MODULE_KEY: Record<string, string> = {
  ...MODULE_ACCESS_REGISTRY.reduce(
    (acc, mod) => {
      if (mod.route) acc[mod.route] = mod.key
      return acc
    },
    {} as Record<string, string>,
  ),
  '/admin/dashboard': 'dashboard',
  '/superadmin/dashboard': 'dashboard',
  '/admin/usuarios': 'personnel',
  '/superadmin/usuarios': 'personnel',
  '/admin/roles': 'roles',
  '/admin/estructura': 'estructura',
  '/superadmin/estructura': 'estructura',
}

export function routeModuleKey(path: string): string | undefined {
  if (ROUTE_TO_MODULE_KEY[path]) return ROUTE_TO_MODULE_KEY[path]
  for (const [route, key] of Object.entries(ROUTE_TO_MODULE_KEY)) {
    if (route !== '/' && path.startsWith(`${route}/`)) return key
  }
  return undefined
}
