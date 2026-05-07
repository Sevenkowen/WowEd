<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/16/solid'
import { ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import CalendarioEscolarMonth from '@/components/calendario/CalendarioEscolarMonth.vue'
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
            >
              <span class="text-lg leading-none">+</span>
              Añadir evento
            </button>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>
