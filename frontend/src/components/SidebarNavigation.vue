<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
  XMarkIcon,
} from '@heroicons/vue/24/outline'

interface NavLink {
  name: string
  to: string
  icon: Component
}

interface NavSection {
  id: string
  name: string
  icon: Component
  links: NavLink[]
}

const props = defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()

const primaryLinks: NavLink[] = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'Calendario', to: '/planificador-anual', icon: CalendarDaysIcon },
  { name: 'Objetivos', to: '/objetivos', icon: FlagIcon },
  { name: 'Agenda', to: '/planificador-semanal', icon: CalendarIcon },
]

const dimensionesSection: NavSection = {
  id: 'dimensiones',
  name: 'Dimensiones de la Gestión',
  icon: BookOpenIcon,
  links: [
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
  ],
}

const secondaryLinks: NavLink[] = [
  { name: 'Equipo Directivo', to: '/equipo-directivo', icon: UserIcon },
  { name: 'Orientación Escolar', to: '/orientacion-escolar', icon: LightBulbIcon },
  { name: 'Informes', to: '/informes', icon: ChartBarIcon },
  { name: 'Análisis de Tiempo', to: '/analisis-tiempo', icon: ClockIcon },
]

const multigestionSection: NavSection = {
  id: 'multigestion',
  name: 'Multigestión',
  icon: BriefcaseIcon,
  links: [
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
  ],
}

const dimensionesOpen = ref(false)
const multigestionOpen = ref(false)
const activeFlyout = ref<string | null>(null)
const dimensionesBtnRef = ref<HTMLButtonElement | null>(null)
const multigestionBtnRef = ref<HTMLButtonElement | null>(null)
const flyoutArrowTop = ref(80)

const SIDEBAR_MINI_WIDTH = '4.5rem'

const dimensionesActive = computed(() => route.path.startsWith('/dimensiones'))
const multigestionActive = computed(() => route.path.startsWith('/multigestion'))

const activeFlyoutSection = computed((): NavSection | null => {
  if (activeFlyout.value === 'dimensiones') return dimensionesSection
  if (activeFlyout.value === 'multigestion') return multigestionSection
  return null
})

function toggleSection(sectionId: string): void {
  if (sectionId === 'dimensiones') dimensionesOpen.value = !dimensionesOpen.value
  if (sectionId === 'multigestion') multigestionOpen.value = !multigestionOpen.value
}

function updateFlyoutArrow(sectionId: string): void {
  const btn = sectionId === 'dimensiones' ? dimensionesBtnRef.value : multigestionBtnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  flyoutArrowTop.value = rect.top + rect.height / 2
}

function toggleFlyout(sectionId: string): void {
  if (activeFlyout.value === sectionId) {
    activeFlyout.value = null
    return
  }
  activeFlyout.value = sectionId
  void nextTick(() => updateFlyoutArrow(sectionId))
}

function closeFlyout(): void {
  activeFlyout.value = null
}

function linkActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function linkClass(active: boolean): string[] {
  if (props.collapsed) {
    return [
      active
        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/20 dark:bg-white/10 dark:text-white dark:ring-white/25'
        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
      'group flex w-full items-center justify-center rounded-lg p-2.5 transition-colors',
    ]
  }

  return [
    active
      ? 'bg-indigo-50 text-indigo-600 dark:bg-white/5 dark:text-white'
      : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
    'group flex gap-x-4 rounded-md p-2 text-sm/6 font-semibold',
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

function flyoutLinkClass(active: boolean): string[] {
  return [
    active
      ? 'bg-indigo-100/80 text-indigo-700 dark:bg-white/10 dark:text-white'
      : 'text-gray-700 hover:bg-gray-100/90 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white',
    'group flex items-start gap-x-4 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
  ]
}

function flyoutIconClass(active: boolean): string[] {
  return [
    active
      ? 'text-indigo-600 dark:text-white'
      : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white',
    'mt-0.5 size-5 shrink-0',
  ]
}

function sectionButtonClass(active: boolean): string[] {
  if (props.collapsed) {
    return [
      active
        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/20 dark:bg-white/10 dark:text-white dark:ring-white/25'
        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
      'group flex w-full items-center justify-center rounded-lg p-2.5 transition-colors',
    ]
  }

  return [
    active
      ? 'bg-indigo-50 text-indigo-600 dark:bg-white/5 dark:text-white'
      : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
    'group flex w-full items-center justify-between gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold',
  ]
}

watch(
  () => route.path,
  () => {
    closeFlyout()
  },
)

watch(
  () => props.collapsed,
  (mini) => {
    if (mini) {
      dimensionesOpen.value = false
      multigestionOpen.value = false
    } else {
      closeFlyout()
    }
  },
)

watch(
  dimensionesActive,
  (active) => {
    if (active && !props.collapsed) dimensionesOpen.value = true
  },
  { immediate: true },
)

watch(
  multigestionActive,
  (active) => {
    if (active && !props.collapsed) multigestionOpen.value = true
  },
  { immediate: true },
)

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeFlyout()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <nav class="relative flex flex-1 flex-col">
    <ul role="list" class="flex flex-1 flex-col gap-y-1" :class="collapsed ? 'items-center' : ''">
      <li class="w-full">
        <ul role="list" class="space-y-1" :class="collapsed ? '' : '-mx-2'">
          <li v-for="item in primaryLinks" :key="item.to">
            <RouterLink
              :to="item.to"
              :class="linkClass(linkActive(item.to))"
              :title="collapsed ? item.name : undefined"
            >
              <component :is="item.icon" :class="iconClass(linkActive(item.to))" aria-hidden="true" />
              <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </RouterLink>
          </li>

          <li>
            <template v-if="!collapsed">
              <button
                type="button"
                :class="sectionButtonClass(dimensionesActive)"
                :aria-expanded="dimensionesOpen"
                @click="toggleSection('dimensiones')"
              >
                <span class="flex min-w-0 items-center gap-x-3">
                  <BookOpenIcon
                    class="size-6 shrink-0"
                    :class="
                      dimensionesActive
                        ? 'text-indigo-600 dark:text-white'
                        : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'
                    "
                  />
                  <span class="truncate">{{ dimensionesSection.name }}</span>
                </span>
                <ChevronRightIcon
                  v-if="!dimensionesOpen"
                  class="size-5 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <ChevronDownIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
              </button>
              <ul
                v-show="dimensionesOpen"
                role="list"
                class="ml-2 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10"
              >
                <li v-for="sub in dimensionesSection.links" :key="sub.to">
                  <RouterLink :to="sub.to" :class="[...linkClass(linkActive(sub.to)), 'items-start']">
                    <component :is="sub.icon" :class="[...iconClass(linkActive(sub.to)), 'mt-0.5']" aria-hidden="true" />
                    <span class="min-w-0 flex-1 leading-snug">{{ sub.name }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
            <button
              v-else
              ref="dimensionesBtnRef"
              type="button"
              :class="sectionButtonClass(dimensionesActive || activeFlyout === 'dimensiones')"
              :aria-expanded="activeFlyout === 'dimensiones'"
              :title="dimensionesSection.name"
              @click="toggleFlyout('dimensiones')"
            >
              <BookOpenIcon
                class="size-6 shrink-0"
                :class="
                  dimensionesActive || activeFlyout === 'dimensiones'
                    ? 'text-indigo-600 dark:text-white'
                    : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'
                "
              />
            </button>
          </li>

          <li v-for="item in secondaryLinks" :key="item.to">
            <RouterLink
              :to="item.to"
              :class="linkClass(linkActive(item.to))"
              :title="collapsed ? item.name : undefined"
            >
              <component :is="item.icon" :class="iconClass(linkActive(item.to))" aria-hidden="true" />
              <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </RouterLink>
          </li>

          <li>
            <template v-if="!collapsed">
              <button
                type="button"
                :class="sectionButtonClass(multigestionActive)"
                :aria-expanded="multigestionOpen"
                @click="toggleSection('multigestion')"
              >
                <span class="flex min-w-0 items-center gap-x-3">
                  <BriefcaseIcon
                    class="size-6 shrink-0"
                    :class="
                      multigestionActive
                        ? 'text-indigo-600 dark:text-white'
                        : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'
                    "
                  />
                  <span class="truncate">{{ multigestionSection.name }}</span>
                </span>
                <ChevronUpIcon v-if="multigestionOpen" class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
                <ChevronDownIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
              </button>
              <ul
                v-show="multigestionOpen"
                role="list"
                class="ml-2 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10"
              >
                <li v-for="sub in multigestionSection.links" :key="sub.to">
                  <RouterLink :to="sub.to" :class="[...linkClass(linkActive(sub.to)), 'items-start']">
                    <component :is="sub.icon" :class="[...iconClass(linkActive(sub.to)), 'mt-0.5']" aria-hidden="true" />
                    <span class="min-w-0 flex-1 leading-snug">{{ sub.name }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
            <button
              v-else
              ref="multigestionBtnRef"
              type="button"
              :class="sectionButtonClass(multigestionActive || activeFlyout === 'multigestion')"
              :aria-expanded="activeFlyout === 'multigestion'"
              :title="multigestionSection.name"
              @click="toggleFlyout('multigestion')"
            >
              <BriefcaseIcon
                class="size-6 shrink-0"
                :class="
                  multigestionActive || activeFlyout === 'multigestion'
                    ? 'text-indigo-600 dark:text-white'
                    : 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'
                "
              />
            </button>
          </li>
        </ul>
      </li>

      <li class="mt-auto w-full pt-6">
        <a
          href="#"
          :class="[
            collapsed
              ? 'group flex w-full items-center justify-center rounded-lg p-2.5 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              : 'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white',
          ]"
          :title="collapsed ? 'Ajustes' : undefined"
        >
          <Cog6ToothIcon
            class="size-6 shrink-0 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white"
            aria-hidden="true"
          />
          <span v-if="!collapsed">Ajustes</span>
        </a>
      </li>
    </ul>

    <Teleport to="body">
      <template v-if="collapsed && activeFlyoutSection">
        <div
          class="fixed inset-0 z-40 hidden bg-black/10 lg:block dark:bg-black/45"
          aria-hidden="true"
          @click="closeFlyout"
        />

        <svg
          class="pointer-events-none fixed z-[51] hidden -translate-y-1/2 text-gray-100 lg:block dark:text-gray-950"
          :style="{ top: `${flyoutArrowTop}px`, left: SIDEBAR_MINI_WIDTH }"
          width="10"
          height="18"
          viewBox="0 0 10 18"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M10 0 L0 9 L10 18 Z" />
        </svg>

        <aside
          class="fixed top-0 bottom-0 z-50 hidden w-72 flex-col border-r border-gray-200/80 bg-gray-100 shadow-2xl ring-1 ring-black/5 dark:border-white/5 dark:bg-gray-950 dark:shadow-black/40 dark:ring-white/5 lg:flex"
          :style="{ left: SIDEBAR_MINI_WIDTH }"
          role="dialog"
          :aria-label="activeFlyoutSection.name"
        >
          <div
            class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200/80 px-5 dark:border-white/5"
          >
            <h2 class="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {{ activeFlyoutSection.name }}
            </h2>
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
              @click="closeFlyout"
            >
              <span class="sr-only">Cerrar menú</span>
              <XMarkIcon class="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav class="scrollbar-sidebar flex-1 overflow-y-auto px-4 py-4">
            <ul role="list" class="space-y-1.5">
              <li v-for="sub in activeFlyoutSection.links" :key="sub.to">
                <RouterLink
                  :to="sub.to"
                  :class="flyoutLinkClass(linkActive(sub.to))"
                  @click="closeFlyout"
                >
                  <component :is="sub.icon" :class="flyoutIconClass(linkActive(sub.to))" aria-hidden="true" />
                  <span class="min-w-0 flex-1 leading-snug">{{ sub.name }}</span>
                </RouterLink>
              </li>
            </ul>
          </nav>
        </aside>
      </template>
    </Teleport>
  </nav>
</template>
