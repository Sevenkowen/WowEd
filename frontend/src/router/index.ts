import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const mainChildren: RouteRecordRaw[] = [
  {
    path: '',
    name: 'dashboard',
    component: () => import('@/pages/IndexPage.vue'),
    meta: { title: 'Dashboard' },
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
    meta: { title: 'Calendario' },
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
    meta: { title: 'Equipo Directivo' },
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
      path: '/',
      component: MainLayout,
      children: mainChildren,
    },
  ],
})

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} · WowEd` : 'WowEd'
})
