<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/vue/16/solid'
import { CheckIcon } from '@heroicons/vue/20/solid'
import {
  ArrowDownTrayIcon,
  ChartBarIcon,
  FlagIcon,
  InformationCircleIcon,
  PlusIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'
import CalendarioEscolarMonth from '@/components/calendario/CalendarioEscolarMonth.vue'
import KtInputModeDatePicker from '@/components/KtInputModeDatePicker.vue'
import { eventosDelDia } from '@/data/calendarioEscolarDemo'

defineOptions({ name: 'PlanificacionAnualPage' })

const tabs = [
  { id: 'calendario', name: 'Calendario Escolar' },
  { id: 'plan-anual', name: 'Plan Anual Institucional' },
  { id: 'mensual', name: 'Planificador Mensual' },
] as const

const activeTab = ref<(typeof tabs)[number]['id']>('calendario')

const schoolYear = ref(2026)
const selectedDay = ref<string | null>('2026-05-15')
const vistaTemporal = ref<'mes' | 'año'>('mes')

const yearOptions = [2025, 2026, 2027, 2028]

const fechaSeleccionTexto = computed(() => {
  if (!selectedDay.value) return '—'
  const [y, m, d] = selectedDay.value.split('-').map(Number)
  return `${d}/${m}/${y}`
})

const eventosDia = computed(() => eventosDelDia(selectedDay.value))

const leyenda = [
  { label: 'Feriado', class: 'bg-pink-400' },
  { label: 'Trimestre/Semestre', class: 'bg-blue-500' },
  { label: 'Jornada Institucional', class: 'bg-sky-400' },
  { label: 'Fecha Administrativa', class: 'bg-indigo-500' },
  { label: 'Evento Escolar', class: 'bg-orange-400' },
  { label: 'Otro', class: 'bg-gray-400' },
] as const

function selectTab(id: (typeof tabs)[number]['id']) {
  activeTab.value = id
}

watch(activeTab, (t) => {
  if (t === 'calendario' && !selectedDay.value) {
    selectedDay.value = '2026-05-15'
  }
})

const addEventOpen = ref(false)
const addEventDate = ref<string>('2026-05-15')
const addEventTitle = ref('')
const addEventDescription = ref('')
type EventTypeOption = { id: number; name: 'Evento Escolar' | 'Jornada Institucional' | 'Fecha Administrativa' | 'Otro' }
const eventTypes: EventTypeOption[] = [
  { id: 1, name: 'Evento Escolar' },
  { id: 2, name: 'Jornada Institucional' },
  { id: 3, name: 'Fecha Administrativa' },
  { id: 4, name: 'Otro' },
]
const addEventType = ref<EventTypeOption>(eventTypes[0])

function openAddEvent(date?: string | null) {
  addEventDate.value = date ?? selectedDay.value ?? new Date().toISOString().slice(0, 10)
  addEventTitle.value = ''
  addEventDescription.value = ''
  addEventType.value = eventTypes[0]
  addEventOpen.value = true
}

function closeAddEvent() {
  addEventOpen.value = false
}

function saveAddEvent() {
  // placeholder: persistir evento
  addEventOpen.value = false
}

type ObjectiveStatus = 'En Progreso' | 'Completado' | 'Retrasado'
type Objective = {
  id: string
  title: string
  description: string
  indicators: string[]
  responsables: string[]
  plazo: string
  status: ObjectiveStatus
  expanded: boolean
}

const objetivos = ref<Objective[]>([
  {
    id: 'obj-1',
    title: 'Mejorar los niveles de comprensión lectora',
    description:
      'Incrementar en un 15% el nivel de comprensión lectora de los estudiantes, medido a través de evaluaciones estandarizadas.',
    indicators: [
      'Resultados en evaluaciones diagnósticas trimestrales',
      'Porcentaje de estudiantes que alcanzan nivel satisfactorio',
    ],
    responsables: ['Coordinación Académica', 'Docentes de Lenguaje'],
    plazo: 'Diciembre 2025',
    status: 'En Progreso',
    expanded: false,
  },
  {
    id: 'obj-2',
    title: 'Implementar estrategias de educación emocional',
    description:
      'Desarrollar competencias socioemocionales en la comunidad educativa a través de un programa estructurado.',
    indicators: [
      'Número de talleres realizados',
      'Encuestas de clima escolar',
      'Reducción de conflictos registrados',
    ],
    responsables: ['Equipo de Orientación', 'Tutores'],
    plazo: 'Agosto 2025',
    status: 'En Progreso',
    expanded: false,
  },
])

const reminders = [
  { id: 'r1', title: 'Revisión Primer Trimestre', date: '30 de Marzo, 2025', tone: 'amber' as const, action: 'Programado' },
  { id: 'r2', title: 'Revisión Segundo Trimestre', date: '30 de Junio, 2025', tone: 'purple' as const, action: 'Programar' },
  { id: 'r3', title: 'Revisión Tercer Trimestre', date: '30 de Septiembre, 2025', tone: 'purple' as const, action: 'Programar' },
  { id: 'r4', title: 'Evaluación Final Anual', date: '15 de Diciembre, 2025', tone: 'purple' as const, action: 'Programar' },
] as const

function statusPillClass(status: ObjectiveStatus): string {
  switch (status) {
    case 'Completado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    case 'Retrasado':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
    default:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200'
  }
}

function toggleObjective(id: string) {
  objetivos.value = objetivos.value.map((o) => (o.id === id ? { ...o, expanded: !o.expanded } : o))
}

function setObjectiveStatus(id: string, status: ObjectiveStatus) {
  objetivos.value = objetivos.value.map((o) => (o.id === id ? { ...o, status } : o))
}

type MonthlyView = 'dashboard' | 'calendario'
const monthlyMonth = ref('Junio')
const monthlyView = ref<MonthlyView>('dashboard')

const monthlyStats = computed(() => ({
  progresoPct: 33,
  progresoLabel: '5/15 tareas completadas',
  metasPrincipales: 3,
  dimensionesActivas: 5,
}))

const monthlyMotto = computed(() => ({
  title: `Lema del Mes: ${monthlyMonth.value} 2025`,
  quote:
    '“Evaluación al servicio del aprendizaje; construyendo juntos una cultura de retroalimentación”',
}))

type MonthlyGoal = { id: string; title: string; link: string; pct: number; tag: string }
const monthlyGoals = ref<MonthlyGoal[]>([
  {
    id: 'g1',
    title: 'Implementar nuevo sistema de evaluación formativa',
    link: 'Vinculado a objetivo PAI: Mejora de prácticas evaluativas',
    pct: 35,
    tag: 'Meta mensual',
  },
  {
    id: 'g2',
    title: 'Actualizar protocolos de comunicación con familias',
    link: 'Vinculado a objetivo PAI: Optimización de comunicación institucional',
    pct: 65,
    tag: 'Meta mensual',
  },
  {
    id: 'g3',
    title: 'Implementar programa de convivencia escolar',
    link: 'Vinculado a objetivo PAI: Fortalecimiento del clima escolar',
    pct: 20,
    tag: 'Meta mensual',
  },
])

type DimId = 'liderazgo' | 'bienestar' | 'gestion' | 'vinculo'
const dims: { id: DimId; label: string }[] = [
  { id: 'liderazgo', label: 'Liderazgo Pedagógico' },
  { id: 'bienestar', label: 'Bienestar Estudiantil' },
  { id: 'gestion', label: 'Gestión Institucional' },
  { id: 'vinculo', label: 'Vínculo Escuela-Familia' },
]
const activeDim = ref<DimId>('liderazgo')

type DimTaskTone = 'En progreso' | 'Pendiente' | 'Completado'
type DimTask = { id: string; title: string; date: string; owner: string; tone: DimTaskTone }

const dimTasks = ref<Record<DimId, DimTask[]>>({
  liderazgo: [
    {
      id: 't1',
      title: 'Realizar 10 observaciones de aula enfocadas en evaluación formativa',
      date: '2025-06-15',
      owner: 'Resp: Coordinación Pedagógica',
      tone: 'En progreso',
    },
    {
      id: 't2',
      title: 'Taller docente sobre estrategias de retroalimentación efectiva',
      date: '2025-06-22',
      owner: 'Resp: Equipo Directivo',
      tone: 'Pendiente',
    },
    {
      id: 't3',
      title: 'Revisión colegiada de instrumentos de evaluación',
      date: '2025-06-08',
      owner: 'Resp: Jefes de Departamento',
      tone: 'Completado',
    },
  ],
  bienestar: [],
  gestion: [],
  vinculo: [],
})

function taskPillClass(tone: DimTaskTone): string {
  switch (tone) {
    case 'Completado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    case 'Pendiente':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
    default:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200'
  }
}
</script>

<template>
  <div class="space-y-6">
    <header
      class="rounded-xl border border-gray-200/90 bg-gray-50/95 px-5 py-6 sm:px-6 dark:border-white/10 dark:bg-white/5"
    >
      <h1 class="text-2xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-3xl">
        Planificación Global
      </h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
        Gestión del Plan Anual Institucional y objetivos estratégicos.
      </p>
    </header>

    <div>
      <div class="grid grid-cols-1 sm:hidden">
        <label class="sr-only" for="planificacion-tabs-mobile">Seleccionar pestaña</label>
        <select
          id="planificacion-tabs-mobile"
          v-model="activeTab"
          class="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 *:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-indigo-500"
        >
          <option v-for="tab in tabs" :key="tab.id" :value="tab.id">{{ tab.name }}</option>
        </select>
        <ChevronDownIcon
          class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />
      </div>

      <div class="hidden sm:block">
        <nav
          class="isolate flex divide-x divide-gray-200 rounded-lg border border-gray-200 bg-gray-50/80 outline -outline-offset-1 outline-gray-200 dark:divide-white/10 dark:border-white/10 dark:bg-gray-900/40 dark:outline-white/10"
          aria-label="Secciones de planificación"
        >
          <button
            v-for="(tab, tabIdx) in tabs"
            :key="tab.id"
            type="button"
            :class="[
              activeTab === tab.id
                ? 'bg-white font-semibold text-indigo-600 shadow-sm dark:bg-gray-950 dark:text-white'
                : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
              tabIdx === 0 ? 'rounded-l-lg' : '',
              tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
              'group relative min-w-0 flex-1 overflow-hidden px-4 py-3.5 text-center text-sm font-medium transition-colors focus:z-10',
            ]"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="selectTab(tab.id)"
          >
            <span>{{ tab.name }}</span>
            <span
              aria-hidden="true"
              :class="[
                activeTab === tab.id ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-transparent',
                'absolute inset-x-0 bottom-0 h-0.5',
              ]"
            />
          </button>
        </nav>
      </div>

      <!-- Calendario escolar: layout referencia -->
      <div v-if="activeTab === 'calendario'" class="mt-5 space-y-5">
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <h2 class="text-lg font-semibold text-indigo-600 dark:text-indigo-400 sm:text-xl">
              Calendario Escolar Anual
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Marco temporal institucional oficial del ciclo lectivo {{ schoolYear }}.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 lg:shrink-0">
            <label class="sr-only" for="ciclo-lectivo">Ciclo lectivo</label>
            <select
              id="ciclo-lectivo"
              v-model.number="schoolYear"
              class="rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-3 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-gray-900 dark:text-white"
            >
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
            <div
              class="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-white/10 dark:bg-gray-800"
              role="group"
              aria-label="Vista temporal"
            >
              <button
                type="button"
                :class="[
                  vistaTemporal === 'mes'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-950 dark:text-indigo-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                ]"
                @click="vistaTemporal = 'mes'"
              >
                Mes
              </button>
              <button
                type="button"
                :class="[
                  vistaTemporal === 'año'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-950 dark:text-indigo-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                ]"
                @click="vistaTemporal = 'año'"
              >
                Año
              </button>
            </div>
          </div>
        </div>

        <div
          class="flex gap-3 rounded-lg border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100"
        >
          <InformationCircleIcon class="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <p class="leading-relaxed">
            El Calendario Escolar muestra las fechas oficiales del ciclo lectivo. Solo el equipo directivo puede
            modificar eventos institucionales.
          </p>
        </div>

        <div class="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          <div class="min-w-0 flex-1 space-y-4">
            <div
              v-if="vistaTemporal === 'año'"
              class="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-16 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
            >
              Vista anual en preparación. Usá «Mes» para el calendario mensual.
            </div>
            <CalendarioEscolarMonth
              v-show="vistaTemporal === 'mes'"
              v-model:school-year="schoolYear"
              v-model:selected-date="selectedDay"
              @create-event="openAddEvent($event.date)"
            />

            <div
              class="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
            >
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  v-for="item in leyenda"
                  :key="item.label"
                  class="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  <span class="size-2.5 rounded-full" :class="item.class" aria-hidden="true"></span>
                  {{ item.label }}
                </span>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <ArrowDownTrayIcon class="size-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                Exportar calendario
              </button>
            </div>
          </div>

          <aside
            class="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/60 lg:w-80 xl:w-96"
          >
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              Eventos: {{ fechaSeleccionTexto }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Eventos programados para la fecha seleccionada.
            </p>
            <ul v-if="eventosDia.length > 0" class="mt-4 space-y-3">
              <li
                v-for="ev in eventosDia"
                :key="ev.id"
                class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-white/5 dark:bg-white/5"
              >
                <p class="font-medium text-gray-900 dark:text-white">{{ ev.name }}</p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ ev.time }}</p>
              </li>
            </ul>
            <p v-else class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No hay eventos para esta fecha
            </p>
            <button
              type="button"
              class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:bg-indigo-950/50"
              @click="openAddEvent(selectedDay)"
            >
              <span class="text-lg leading-none">+</span>
              Añadir evento
            </button>
          </aside>
        </div>
      </div>

      <!-- Plan Anual Institucional (PAI) -->
      <div v-else-if="activeTab === 'plan-anual'" class="mt-5 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">Plan Anual Institucional (PAI)</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Defina y haga seguimiento a los objetivos estratégicos de la institución
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
          >
            <PlusIcon class="size-5" aria-hidden="true" />
            Añadir Objetivo
          </button>
        </div>

        <div class="space-y-4">
          <article
            v-for="o in objetivos"
            :key="o.id"
            class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
          >
            <div class="p-5 sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{{ o.title }}</h3>
                  <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {{ o.description }}
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
                  :class="statusPillClass(o.status)"
                >
                  {{ o.status }}
                </span>
              </div>

              <button
                type="button"
                class="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                @click="toggleObjective(o.id)"
              >
                <span>Detalles del Objetivo</span>
                <ChevronDownIcon
                  class="size-5 text-gray-500 transition-transform dark:text-gray-400"
                  :class="o.expanded ? 'rotate-180' : ''"
                  aria-hidden="true"
                />
              </button>

              <div
                v-if="o.expanded"
                class="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950/20"
              >
                <div class="space-y-5">
                  <div class="space-y-4">
                    <div class="flex items-start gap-3">
                      <span
                        class="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">Indicadores de Logro</p>
                        <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <li v-for="i in o.indicators" :key="i">{{ i }}</li>
                        </ul>
                      </div>
                    </div>

                    <div class="flex items-start gap-3">
                      <span
                        class="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                        aria-hidden="true"
                      >
                        👤
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">Responsables</p>
                        <div class="mt-2 flex flex-wrap gap-2">
                          <span
                            v-for="r in o.responsables"
                            :key="r"
                            class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200"
                          >
                            {{ r }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-start gap-3">
                      <span
                        class="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                        aria-hidden="true"
                      >
                        📅
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">Plazo</p>
                        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ o.plazo }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
                  <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="o.status === 'En Progreso' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white' : 'text-gray-600 dark:text-gray-300'"
                      @click="setObjectiveStatus(o.id, 'En Progreso')"
                    >
                      En Progreso
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="o.status === 'Completado' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white' : 'text-gray-600 dark:text-gray-300'"
                      @click="setObjectiveStatus(o.id, 'Completado')"
                    >
                      Completado
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="o.status === 'Retrasado' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white' : 'text-gray-600 dark:text-gray-300'"
                      @click="setObjectiveStatus(o.id, 'Retrasado')"
                    >
                      Retrasado
                    </button>
                  </div>

                  <div class="flex items-center gap-4 text-sm">
                    <button type="button" class="font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white">
                      Editar
                    </button>
                    <button type="button" class="font-semibold text-rose-700 hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200">
                      Eliminar
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <section
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none sm:p-6"
        >
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Recordatorios de Revisión Trimestral</h3>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure alertas automáticas para revisar el avance de los objetivos
          </p>

          <ul class="mt-5 space-y-3">
            <li
              v-for="r in reminders"
              :key="r.id"
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/5"
              :class="r.tone === 'amber' ? 'bg-amber-50/70 dark:bg-amber-950/15' : ''"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ r.title }}</p>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ r.date }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
              >
                {{ r.action }}
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- Planificador mensual -->
      <div v-else-if="activeTab === 'mensual'" class="mt-5 space-y-6">
        <section
          class="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-5 shadow-xs dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:shadow-none sm:px-6"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="text-lg font-semibold text-emerald-900 dark:text-emerald-100 sm:text-xl">
                Planificador Mensual Estratégico
              </h2>
              <p class="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                Brújula operativa para la alineación de acciones mensuales con objetivos estratégicos
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <select
                v-model="monthlyMonth"
                class="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200/50 dark:border-emerald-500/25 dark:bg-gray-900/40 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
              >
                <option>Enero</option>
                <option>Febrero</option>
                <option>Marzo</option>
                <option>Abril</option>
                <option>Mayo</option>
                <option>Junio</option>
                <option>Julio</option>
                <option>Agosto</option>
                <option>Septiembre</option>
                <option>Octubre</option>
                <option>Noviembre</option>
                <option>Diciembre</option>
              </select>

              <div
                class="inline-flex overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/25 dark:bg-gray-900/40"
                role="group"
                aria-label="Vista del planificador mensual"
              >
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-semibold"
                  :class="
                    monthlyView === 'dashboard'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-white/5'
                  "
                  @click="monthlyView = 'dashboard'"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-semibold"
                  :class="
                    monthlyView === 'calendario'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-white/5'
                  "
                  @click="monthlyView = 'calendario'"
                >
                  Calendario
                </button>
              </div>
            </div>
          </div>
        </section>

        <div v-if="monthlyView === 'dashboard'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article
              class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Progreso Mensual</p>
                  <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ monthlyStats.progresoPct }}%</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ monthlyStats.progresoLabel }}</p>
                </div>
                <ChartBarIcon class="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
            </article>

            <article
              class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Metas Principales</p>
                  <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ monthlyStats.metasPrincipales }}</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Metas estratégicas para el mes</p>
                </div>
                <FlagIcon class="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
            </article>

            <article
              class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dimensiones Activas</p>
                  <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ monthlyStats.dimensionesActivas }}</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Áreas en foco este mes</p>
                </div>
                <Squares2X2Icon class="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
            </article>
          </div>

          <section
            class="rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-5 py-4 text-sm text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/15 dark:text-emerald-100 sm:px-6"
          >
            <p class="font-semibold">{{ monthlyMotto.title }}</p>
            <p class="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/80">{{ monthlyMotto.quote }}</p>
          </section>

          <section
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none sm:p-6"
          >
            <div class="flex items-center gap-2">
              <FlagIcon class="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Metas Principales del Mes</h3>
            </div>

            <div class="mt-5 space-y-4">
              <article
                v-for="g in monthlyGoals"
                :key="g.id"
                class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-950/15 dark:shadow-none"
              >
                <div class="p-5">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ g.title }}</p>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ g.link }}</p>
                    </div>
                    <span
                      class="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200"
                    >
                      {{ g.tag }}
                    </span>
                  </div>

                  <div class="mt-4">
                    <div class="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-semibold text-gray-700 dark:text-gray-300">Progreso</span>
                      <span class="shrink-0">{{ g.pct }}%</span>
                    </div>
                    <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div class="h-full rounded-full bg-purple-600 dark:bg-purple-500" :style="{ width: `${g.pct}%` }" />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none sm:p-6"
          >
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Dimensiones Estratégicas</h3>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-for="d in dims"
                :key="d.id"
                type="button"
                class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="
                  activeDim === d.id
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/20 dark:text-gray-200 dark:hover:bg-white/5'
                "
                @click="activeDim = d.id"
              >
                {{ d.label }}
              </button>
            </div>

            <div class="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/15">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-emerald-50/60 px-5 py-4 dark:border-white/10 dark:bg-emerald-950/15">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {{ dims.find((d) => d.id === activeDim)?.label }}
                  </p>
                  <p class="mt-1 text-xs text-emerald-900/70 dark:text-emerald-200/70">
                    Foco del Mes: Fortalecimiento de la Evaluación Formativa
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
                >
                  <PlusIcon class="size-5" aria-hidden="true" />
                  Añadir Tarea
                </button>
              </div>

              <div class="divide-y divide-gray-200 dark:divide-white/10">
                <div
                  v-for="t in dimTasks[activeDim]"
                  :key="t.id"
                  class="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t.title }}</p>
                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-medium">{{ t.date }}</span>
                      <span class="mx-2">·</span>
                      {{ t.owner }}
                    </p>
                  </div>
                  <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="taskPillClass(t.tone)">
                    {{ t.tone }}
                  </span>
                </div>

                <div v-if="dimTasks[activeDim].length === 0" class="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No hay tareas en esta dimensión todavía.
                </div>
              </div>

              <div class="border-t border-gray-200 px-5 py-4 text-right dark:border-white/10">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                >
                  Ver todas las tareas
                </button>
              </div>
            </div>
          </section>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-6 py-14 text-center text-sm text-emerald-900/80 dark:border-emerald-500/25 dark:bg-emerald-950/15 dark:text-emerald-100/80"
        >
          Vista calendario mensual en preparación.
        </div>
      </div>

      <div
        v-else
        class="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-16 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
      >
        Sección en preparación.
      </div>
    </div>
  </div>

  <!-- Dialog: Añadir Evento al Calendario Escolar -->
  <TransitionRoot as="template" :show="addEventOpen">
    <Dialog class="relative z-50" @close="closeAddEvent">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="w-full max-w-lg overflow-visible rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Añadir Evento al Calendario Escolar
                  </DialogTitle>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Registre un nuevo evento oficial para el calendario escolar institucional.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="closeAddEvent"
                >
                  <span class="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="saveAddEvent">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Fecha</label>
                  <div class="relative mt-2 w-full">
                    <KtInputModeDatePicker v-model="addEventDate" placeholder="Seleccionar fecha" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Título del Evento</label>
                  <input
                    v-model="addEventTitle"
                    type="text"
                    placeholder="Ej: Jornada Institucional"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Descripción</label>
                  <input
                    v-model="addEventDescription"
                    type="text"
                    placeholder="Ej: Jornada de trabajo docente sin alumnos"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                  />
                </div>

                <div>
                  <Listbox as="div" v-model="addEventType">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">
                      Tipo de Evento
                    </ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addEventType.name }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>

                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in eventTypes"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-purple-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.name }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-purple-600 dark:text-purple-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                </div>

                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Nota: Feriados y fechas de inicio/fin de ciclo lectivo solo pueden ser establecidos por el administrador del sistema.
                </p>

                <div class="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                    @click="closeAddEvent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
                  >
                    Guardar Evento
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
