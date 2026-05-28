<script setup lang="ts">
import type { Component } from 'vue'
import {
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  DocumentTextIcon,
  FlagIcon,
  FolderIcon,
  HeartIcon,
  RectangleGroupIcon,
  ScaleIcon,
  SignalIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline'
import { RouterLink } from 'vue-router'

interface ModuleCard {
  name: string
  to: string
  description: string
  icon: Component
}

const dimensiones: ModuleCard[] = [
  {
    name: 'Dimensión Pedagógico-Didáctica',
    to: '/dimensiones/pedagogico-didactica',
    description: 'Prácticas de enseñanza, currículo y evaluación formativa.',
    icon: BookOpenIcon,
  },
  {
    name: 'Dimensión Técnico-Administrativa (DTA)',
    to: '/dimensiones/tecnico-administrativa',
    description: 'Procesos, normativa y gestión operativa del establecimiento.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Dimensión Socio-Comunicativa',
    to: '/dimensiones/socio-comunicativa',
    description: 'Participación, vínculos y comunicación con la comunidad educativa.',
    icon: UserCircleIcon,
  },
  {
    name: 'Gobernanza y Política Educativa (GPE)',
    to: '/dimensiones/gobernanza-politica-educativa',
    description: 'Liderazgo, transparencia y alineación con políticas públicas.',
    icon: ScaleIcon,
  },
  {
    name: 'Planificación Estratégica y Metas Institucionales (PEMI)',
    to: '/dimensiones/pemi',
    description: 'Objetivos institucionales, indicadores y seguimiento estratégico.',
    icon: FlagIcon,
  },
  {
    name: 'Reflexión',
    to: '/dimensiones/reflexion',
    description: 'Análisis institucional, mejora continua y aprendizaje organizacional.',
    icon: SparklesIcon,
  },
]

const multigestion: ModuleCard[] = [
  {
    name: 'Colaboración y Comunicación',
    to: '/multigestion/colaboracion-comunicacion',
    description: 'Espacios de trabajo conjunto y canales institucionales.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: 'Gestión de Proyectos',
    to: '/multigestion/gestion-proyectos',
    description: 'Seguimiento de iniciativas y proyectos pedagógicos.',
    icon: RectangleGroupIcon,
  },
  {
    name: 'Gestión Documental',
    to: '/multigestion/gestion-documental',
    description: 'Repositorio y trazabilidad documental.',
    icon: FolderIcon,
  },
  {
    name: 'Gestión de Infraestructura y Recursos (MIR)',
    to: '/multigestion/mir',
    description: 'Espacios, equipamiento y recursos materiales.',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Gestión de Personal y Horarios',
    to: '/multigestion/personal-horarios',
    description: 'Plantel, cargos y organización horaria.',
    icon: UserPlusIcon,
  },
  {
    name: 'Directorio De Desarrollo Profesional',
    to: '/multigestion/desarrollo-profesional',
    description: 'Formación docente y trayectorias profesionales.',
    icon: AcademicCapIcon,
  },
  {
    name: 'Relación Escuela-Familias',
    to: '/multigestion/escuela-familias',
    description: 'Vínculo con familias y participación en la vida escolar.',
    icon: UserGroupIcon,
  },
  {
    name: 'Impulso CPA: Comunidades Profesionales de Aprendizaje',
    to: '/multigestion/impulso-cpa',
    description: 'Comunidades de práctica y mejora colaborativa.',
    icon: CpuChipIcon,
  },
  {
    name: 'ESI en Acción',
    to: '/multigestion/esi-accion',
    description: 'Educación sexual integral desde el abordaje institucional.',
    icon: HeartIcon,
  },
  {
    name: 'Pulso Docente: Clima y Bienestar',
    to: '/multigestion/pulso-docente',
    description: 'Percepción del clima laboral y bienestar del equipo.',
    icon: SignalIcon,
  },
]
</script>

<template>
  <div class="space-y-10">
    <header class="border-b border-gray-200 pb-8 dark:border-white/10">
      <p class="text-sm font-medium text-indigo-600 dark:text-indigo-400">Acceso unificado</p>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
        Centro de Gestión Institucional
      </h1>
      <p class="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
        Punto de entrada a las dimensiones de la gestión educativa y a los módulos de multigestión. Seleccione un
        ámbito para continuar.
      </p>
    </header>

    <section>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">Dimensiones de la gestión</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Ejes estructurales para el análisis y la mejora institucional.
      </p>
      <ul
        class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        <li v-for="item in dimensiones" :key="item.to">
          <RouterLink
            :to="item.to"
            class="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-gray-900/40 dark:hover:border-indigo-500/50"
          >
            <div class="flex items-start gap-3">
              <span class="rounded-md bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <component :is="item.icon" class="size-6" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <span class="font-semibold text-gray-900 dark:text-white">{{ item.name }}</span>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ item.description }}</p>
              </div>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">Multigestión</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Módulos operativos para la gestión cotidiana del establecimiento.
      </p>
      <ul
        class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        <li v-for="item in multigestion" :key="item.to">
          <RouterLink
            :to="item.to"
            class="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-gray-900/40 dark:hover:border-indigo-500/50"
          >
            <div class="flex items-start gap-3">
              <span class="rounded-md bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <component :is="item.icon" class="size-6" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <span class="font-semibold text-gray-900 dark:text-white">{{ item.name }}</span>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ item.description }}</p>
              </div>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
