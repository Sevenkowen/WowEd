<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/16/solid'
import { PlusIcon } from '@heroicons/vue/24/outline'

defineOptions({ name: 'ObjetivosPage' })

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
</script>

<template>
  <div class="space-y-6">
    <header
      class="rounded-xl border border-gray-200/90 bg-gray-50/95 px-5 py-6 sm:px-6 dark:border-white/10 dark:bg-white/5"
    >
      <h1 class="text-2xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-3xl">Objetivos</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
        Plan Anual Institucional (PAI): defina y haga seguimiento a los objetivos estratégicos de la institución.
      </p>
    </header>

    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">Objetivos estratégicos</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Seguimiento del avance y alineación con las dimensiones institucionales
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
              <span class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold" :class="statusPillClass(o.status)">
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

                <div
                  class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-white/10"
                >
                  <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="
                        o.status === 'En Progreso'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      "
                      @click="setObjectiveStatus(o.id, 'En Progreso')"
                    >
                      En Progreso
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="
                        o.status === 'Completado'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      "
                      @click="setObjectiveStatus(o.id, 'Completado')"
                    >
                      Completado
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-3 py-2 text-xs font-semibold"
                      :class="
                        o.status === 'Retrasado'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      "
                      @click="setObjectiveStatus(o.id, 'Retrasado')"
                    >
                      Retrasado
                    </button>
                  </div>

                  <div class="flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      class="font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="font-semibold text-rose-700 hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200"
                    >
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
  </div>
</template>
