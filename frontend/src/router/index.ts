import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import ChangePasswordPage from '@/pages/ChangePasswordPage.vue'
import { useApi } from '@/api/http'
import { homeRouteForUser, useAuth } from '@/composables/useAuth'

const mainChildren: RouteRecordRaw[] = [
  {
    path: '',
    name: 'dashboard',
    component: () => import('@/pages/IndexPage.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: 'admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { title: 'Admin', administradorOnly: true, flushContent: true },
    children: [
      { path: '', redirect: { name: 'admin-dashboard' } },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'usuarios',
        name: 'admin-usuarios',
        component: () => import('@/pages/admin/AdminUsuariosPage.vue'),
        meta: { title: 'Directivos' },
      },
      {
        path: 'roles',
        name: 'admin-roles',
        component: () => import('@/pages/admin/AdminRolesPage.vue'),
        meta: { title: 'Roles Institucionales' },
      },
      {
        path: 'estructura',
        redirect: { name: 'admin-estructura-colegios' },
      },
      {
        path: 'estructura/colegios',
        name: 'admin-estructura-colegios',
        component: () => import('@/pages/admin/AdminEstructuraPage.vue'),
        meta: { title: 'Colegios y Grados', estructuraSection: 'colegios' },
      },
      {
        path: 'estructura/grados',
        redirect: { name: 'admin-estructura-colegios' },
      },
      {
        path: 'estructura/profesores',
        name: 'admin-estructura-profesores',
        component: () => import('@/pages/admin/AdminEstructuraPage.vue'),
        meta: { title: 'Profesores', estructuraSection: 'profesores' },
      },
      { path: 'directores', redirect: { name: 'admin-usuarios' } },
      { path: 'directores', redirect: { name: 'admin-usuarios' } },
      { path: 'docentes', redirect: { name: 'admin-usuarios' } },
      { path: 'asignacion-directores', redirect: { name: 'admin-estructura-colegios' } },
    ],
  },
  {
    path: 'estructura-escolar',
    name: 'estructura-escolar',
    component: () => import('@/pages/EstructuraEscolarPage.vue'),
    meta: { title: 'Estructura escolar', adminOnly: true, flushContent: true },
  },
  {
    path: 'superadmin',
    component: () => import('@/layouts/SuperadminLayout.vue'),
    meta: { title: 'Superadmin', superadminOnly: true, flushContent: true },
    children: [
      {
        path: '',
        redirect: { name: 'superadmin-dashboard' },
      },
      {
        path: 'dashboard',
        name: 'superadmin-dashboard',
        component: () => import('@/pages/superadmin/SuperadminDashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'instituciones',
        name: 'superadmin-instituciones',
        component: () => import('@/pages/superadmin/SuperadminInstitucionesPage.vue'),
        meta: { title: 'Instituciones' },
      },
      {
        path: 'administradores',
        name: 'superadmin-administradores',
        component: () => import('@/pages/superadmin/SuperadminAdministradoresPage.vue'),
        meta: { title: 'Administradores' },
      },
      {
        path: 'usuarios',
        name: 'superadmin-usuarios',
        component: () => import('@/pages/superadmin/SuperadminUsuariosPage.vue'),
        meta: { title: 'Directivos' },
      },
      {
        path: 'roles',
        name: 'superadmin-roles',
        component: () => import('@/pages/superadmin/SuperadminRolesPage.vue'),
        meta: { title: 'Roles Institucionales' },
      },
      {
        path: 'estructura',
        redirect: { name: 'superadmin-estructura-colegios' },
      },
      {
        path: 'estructura/colegios',
        name: 'superadmin-estructura-colegios',
        component: () => import('@/pages/superadmin/SuperadminEstructuraPage.vue'),
        meta: { title: 'Colegios y Grados', estructuraSection: 'colegios' },
      },
      {
        path: 'estructura/grados',
        redirect: { name: 'superadmin-estructura-colegios' },
      },
      {
        path: 'estructura/profesores',
        name: 'superadmin-estructura-profesores',
        component: () => import('@/pages/superadmin/SuperadminEstructuraPage.vue'),
        meta: { title: 'Profesores', estructuraSection: 'profesores' },
      },
    ],
  },
  {
    path: 'centro-gestion-institucional',
    name: 'centro-gestion-institucional',
    component: () => import('@/pages/CentroGestionInstitucionalPage.vue'),
    meta: { title: 'Centro de Gestión Institucional' },
  },
  {
    path: 'planificador-anual',
    name: 'planificador-anual',
    component: () => import('@/pages/PlanificacionAnualPage.vue'),
    meta: { title: 'Calendario', flushContent: true },
  },
  {
    path: 'objetivos',
    name: 'objetivos',
    component: () => import('@/pages/ObjetivosPage.vue'),
    meta: { title: 'Objetivos' },
  },
  {
    path: 'planificador-semanal',
    name: 'planificador-semanal',
    component: () => import('@/pages/PlanificadorSemanalPage.vue'),
    meta: { title: 'Agenda' },
  },
  {
    path: 'dimensiones/pedagogico-didactica',
    name: 'dimension-pedagogico',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Dimensión Pedagógico-Didáctica' },
  },
  {
    path: 'dimensiones/tecnico-administrativa',
    name: 'dimension-dta',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Dimensión Técnico-Administrativa (DTA)' },
  },
  {
    path: 'dimensiones/socio-comunicativa',
    name: 'dimension-socio',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Dimensión Socio-Comunicativa' },
  },
  {
    path: 'dimensiones/gobernanza-politica-educativa',
    name: 'dimension-gpe',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Gobernanza y Política Educativa (GPE)' },
  },
  {
    path: 'dimensiones/pemi',
    name: 'dimension-pemi',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Planificación Estratégica y Metas Institucionales (PEMI)' },
  },
  {
    path: 'dimensiones/reflexion',
    name: 'dimension-reflexion',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Reflexión' },
  },
  {
    path: 'equipo-directivo',
    name: 'equipo-directivo',
    component: () => import('@/pages/EquipoDirectivoPage.vue'),
    meta: { title: 'Equipo Directivo', flushContent: true },
  },
  {
    path: 'orientacion-escolar',
    name: 'orientacion-escolar',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Orientación Escolar' },
  },
  {
    path: 'informes',
    name: 'informes',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Informes' },
  },
  {
    path: 'analisis-tiempo',
    name: 'analisis-tiempo',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Análisis de Tiempo' },
  },
  {
    path: 'multigestion/colaboracion-comunicacion',
    name: 'multigestion-colaboracion',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Colaboración y Comunicación' },
  },
  {
    path: 'multigestion/gestion-proyectos',
    name: 'multigestion-proyectos',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Gestión de Proyectos' },
  },
  {
    path: 'multigestion/gestion-documental',
    name: 'multigestion-documental',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Gestión Documental' },
  },
  {
    path: 'multigestion/mir',
    name: 'multigestion-mir',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Gestión de Infraestructura y Recursos (MIR)' },
  },
  {
    path: 'multigestion/personal-horarios',
    name: 'multigestion-personal',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Gestión de Personal y Horarios' },
  },
  {
    path: 'multigestion/desarrollo-profesional',
    name: 'multigestion-desarrollo',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Directorio De Desarrollo Profesional' },
  },
  {
    path: 'multigestion/escuela-familias',
    name: 'multigestion-familias',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Relación Escuela-Familias' },
  },
  {
    path: 'multigestion/impulso-cpa',
    name: 'multigestion-cpa',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Impulso CPA: Comunidades Profesionales de Aprendizaje' },
  },
  {
    path: 'multigestion/esi-accion',
    name: 'multigestion-esi',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'ESI en Acción' },
  },
  {
    path: 'multigestion/pulso-docente',
    name: 'multigestion-pulso',
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: { title: 'Pulso Docente: Clima y Bienestar' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { title: 'Ingresar', public: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: ChangePasswordPage,
      meta: { title: 'Cambiar contraseña', authOnly: true, passwordChange: true },
    },
    {
      path: '/',
      component: MainLayout,
      children: mainChildren,
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()

  if (to.meta.public) {
    if (to.name === 'login' && useApi()) {
      if (!auth.bootstrapped.value) {
        await auth.restoreSession()
      }
      if (auth.isAuthenticated.value) {
        return homeRouteForUser(auth.user.value!)
      }
    }
    return true
  }

  if (to.meta.passwordChange) {
    if (!useApi()) return true
    if (!auth.bootstrapped.value) {
      await auth.restoreSession()
    }
    if (!auth.isAuthenticated.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!auth.mustChangePassword.value) {
      return homeRouteForUser(auth.user.value!)
    }
    return true
  }

  if (!useApi()) return true

  if (!auth.bootstrapped.value) {
    await auth.restoreSession()
  }
  if (!auth.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (auth.mustChangePassword.value) {
    return { name: 'change-password' }
  }
  if (to.meta.superadminOnly && !auth.isSuperadmin.value) {
    return { name: 'dashboard' }
  }
  if (to.meta.ownerOnly && !auth.isSuperadmin.value) {
    return { name: 'dashboard' }
  }
  if (to.meta.administradorOnly && !auth.isAdministrador.value) {
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly && !auth.isAdministrador.value && !auth.isDirector.value) {
    return { name: 'dashboard' }
  }
  if (auth.isSuperadmin.value && !to.path.startsWith('/superadmin')) {
    return { name: 'superadmin-dashboard' }
  }
  if (auth.isAdministrador.value && !to.path.startsWith('/admin')) {
    return { name: 'admin-dashboard' }
  }
  return true
})

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} · WowEd` : 'WowEd'
})
