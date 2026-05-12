<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AcademicCapIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  FlagIcon,
  FolderIcon,
  HeartIcon,
  HomeIcon,
  LightBulbIcon,
  RectangleGroupIcon,
  ScaleIcon,
  SignalIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline'

interface NavLink {
  name: string
  to: string
  icon: Component
}

const route = useRoute()

const primaryLinks: NavLink[] = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  // { name: 'Centro de Gestión', to: '/centro-gestion-institucional', icon: Squares2X2Icon },
  { name: 'Planificación', to: '/planificador-anual', icon: CalendarDaysIcon },
  { name: 'Agenda', to: '/planificador-semanal', icon: CalendarIcon },
]

const dimensionesLinks: NavLink[] = [
  { name: 'Dimensión Pedagógico-Didáctica', to: '/dimensiones/pedagogico-didactica', icon: BookOpenIcon },
  { name: 'Dimensión Técnico-Administrativa (DTA)', to: '/dimensiones/tecnico-administrativa', icon: DocumentTextIcon },
  { name: 'Dimensión Socio-Comunicativa', to: '/dimensiones/socio-comunicativa', icon: UserCircleIcon },
  {
    name: 'Gobernanza y Política Educativa (GPE)',
    to: '/dimensiones/gobernanza-politica-educativa',
    icon: ScaleIcon,
  },
  {
    name: 'Planificación Estratégica y Metas Institucionales (PEMI)',
    to: '/dimensiones/pemi',
    icon: FlagIcon,
  },
  { name: 'Reflexión', to: '/dimensiones/reflexion', icon: SparklesIcon },
]

const secondaryLinks: NavLink[] = [
  { name: 'Equipo Directivo', to: '/equipo-directivo', icon: UserIcon },
  { name: 'Orientación Escolar', to: '/orientacion-escolar', icon: LightBulbIcon },
  { name: 'Informes', to: '/informes', icon: ChartBarIcon },
  { name: 'Análisis de Tiempo', to: '/analisis-tiempo', icon: ClockIcon },
]

const dimensionesOpen = ref(false)

const dimensionesActive = computed(() => route.path.startsWith('/dimensiones'))

const multigestionLinks: NavLink[] = [
  { name: 'Colaboración y Comunicación', to: '/multigestion/colaboracion-comunicacion', icon: ChatBubbleLeftRightIcon },
  { name: 'Gestión de Proyectos', to: '/multigestion/gestion-proyectos', icon: RectangleGroupIcon },
  { name: 'Gestión Documental', to: '/multigestion/gestion-documental', icon: FolderIcon },
  {
    name: 'Gestión de Infraestructura y Recursos (MIR)',
    to: '/multigestion/mir',
    icon: BuildingOfficeIcon,
  },
  { name: 'Gestión de Personal y Horarios', to: '/multigestion/personal-horarios', icon: UserPlusIcon },
  {
    name: 'Directorio De Desarrollo Profesional',
    to: '/multigestion/desarrollo-profesional',
    icon: AcademicCapIcon,
  },
  { name: 'Relación Escuela-Familias', to: '/multigestion/escuela-familias', icon: UserGroupIcon },
  {
    name: 'Impulso CPA: Comunidades Profesionales de Aprendizaje',
    to: '/multigestion/impulso-cpa',
    icon: CpuChipIcon,
  },
  { name: 'ESI en Acción', to: '/multigestion/esi-accion', icon: HeartIcon },
  { name: 'Pulso Docente: Clima y Bienestar', to: '/multigestion/pulso-docente', icon: SignalIcon },
]

const multigestionOpen = ref(false)

const multigestionActive = computed(() => route.path.startsWith('/multigestion'))

function linkActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function linkClass(active: boolean): string[] {
  return [
    active
      ? 'bg-indigo-50 text-indigo-600 dark:bg-white/5 dark:text-white'
      : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
    'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
  ]
}

function iconClass(active: boolean): string[] {
  return [
    active
      ? 'text-indigo-600 dark:text-white'
      : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white',
    'size-6 shrink-0',
  ]
}
</script>

<template>
  <nav class="relative flex flex-1 flex-col">
    <ul role="list" class="flex flex-1 flex-col gap-y-1">
      <li>
        <ul role="list" class="-mx-2 space-y-1">
          <li v-for="item in primaryLinks" :key="item.to">
            <RouterLink :to="item.to" :class="linkClass(linkActive(item.to))">
              <component :is="item.icon" :class="iconClass(linkActive(item.to))" aria-hidden="true" />
              <span class="truncate">{{ item.name }}</span>
            </RouterLink>
          </li>

          <li>
            <button
              type="button"
              class="group flex w-full items-center justify-between gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold"
              :class="
                dimensionesActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-white/5 dark:text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              "
              :aria-expanded="dimensionesOpen"
              @click="dimensionesOpen = !dimensionesOpen"
            >
              <span class="flex min-w-0 items-center gap-x-3">
                <BookOpenIcon
                  class="size-6 shrink-0"
                  :class="dimensionesActive ? 'text-indigo-600 dark:text-white' : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'"
                />
                <span class="truncate">Dimensiones de la Gestión</span>
              </span>
              <ChevronRightIcon
                v-if="!dimensionesOpen"
                class="size-5 shrink-0 text-gray-400 transition-transform"
                aria-hidden="true"
              />
              <ChevronDownIcon
                v-else
                class="size-5 shrink-0 text-gray-400 transition-transform"
                aria-hidden="true"
              />
            </button>
            <ul
              v-show="dimensionesOpen"
              role="list"
              class="ml-2 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10"
            >
              <li v-for="sub in dimensionesLinks" :key="sub.to">
                <RouterLink :to="sub.to" :class="linkClass(linkActive(sub.to))">
                  <component :is="sub.icon" :class="iconClass(linkActive(sub.to))" aria-hidden="true" />
                  <span class="leading-snug">{{ sub.name }}</span>
                </RouterLink>
              </li>
            </ul>
          </li>

          <li v-for="item in secondaryLinks" :key="item.to">
            <RouterLink :to="item.to" :class="linkClass(linkActive(item.to))">
              <component :is="item.icon" :class="iconClass(linkActive(item.to))" aria-hidden="true" />
              <span class="truncate">{{ item.name }}</span>
            </RouterLink>
          </li>

          <li>
            <button
              type="button"
              class="group flex w-full items-center justify-between gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold"
              :class="
                multigestionActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-white/5 dark:text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              "
              :aria-expanded="multigestionOpen"
              @click="multigestionOpen = !multigestionOpen"
            >
              <span class="flex min-w-0 items-center gap-x-3">
                <BriefcaseIcon
                  class="size-6 shrink-0"
                  :class="multigestionActive ? 'text-indigo-600 dark:text-white' : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'"
                />
                <span class="truncate">Multigestión</span>
              </span>
              <ChevronUpIcon v-if="multigestionOpen" class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
              <ChevronDownIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
            </button>
            <ul
              v-show="multigestionOpen"
              role="list"
              class="ml-2 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10"
            >
              <li v-for="sub in multigestionLinks" :key="sub.to">
                <RouterLink :to="sub.to" :class="linkClass(linkActive(sub.to))">
                  <component :is="sub.icon" :class="iconClass(linkActive(sub.to))" aria-hidden="true" />
                  <span class="leading-snug">{{ sub.name }}</span>
                </RouterLink>
              </li>
            </ul>
          </li>
        </ul>
      </li>

      <li class="mt-auto pt-6">
        <a
          href="#"
          class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Cog6ToothIcon
            class="size-6 shrink-0 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white"
            aria-hidden="true"
          />
          Ajustes
        </a>
      </li>
    </ul>
  </nav>
</template>
