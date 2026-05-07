<script setup lang="ts">
import { ref } from 'vue'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'

defineOptions({ name: 'DashboardCenterPanel' })

const tabs = [
  { id: 'pedagogico', label: 'Foco Pedagógico' },
  { id: 'estrategica', label: 'Gestión Estratégica' },
  { id: 'comunidad', label: 'Comunidad y Recursos' },
] as const

type TabId = (typeof tabs)[number]['id']

const activeTab = ref<TabId>('pedagogico')

function progressPct(current: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.floor((current / total) * 100))
}
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col bg-gray-50/95 p-5 sm:p-6 lg:p-7 dark:bg-gray-950/40"
  >
    <!-- Botonera: una sola fila -->
    <div
      class="-mx-1 flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 px-1 pb-5 dark:border-white/10 sm:gap-2"
      role="tablist"
      aria-label="Vistas del dashboard"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        class="relative shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-xs font-medium transition-colors sm:px-3.5 sm:py-3 sm:text-sm"
        :class="
          activeTab === tab.id
            ? 'text-purple-700 dark:text-purple-300'
            : 'text-gray-600 hover:bg-white/90 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="activeTab === tab.id"
          class="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-purple-600 dark:bg-purple-400 sm:inset-x-2.5"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Vista: Foco Pedagógico -->
    <div v-if="activeTab === 'pedagogico'" class="mt-7 flex min-h-0 flex-1 flex-col gap-7">
      <div class="flex items-center gap-3">
        <BookOpenIcon class="size-7 shrink-0 text-purple-600 dark:text-purple-400 sm:size-8" aria-hidden="true" />
        <h2 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
          Foco pedagógico y aprendizaje
        </h2>
      </div>

      <div class="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6 xl:gap-7">
        <!-- Ancho completo: foco del mes -->
        <article
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60 lg:col-span-3"
        >
          <div
            class="flex items-center gap-2 border-b border-purple-100 bg-purple-50/90 px-4 py-3 dark:border-purple-900/40 dark:bg-purple-950/30 sm:px-5"
          >
            <BookOpenIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            <h3 class="text-sm font-semibold text-purple-900 dark:text-purple-100">Foco pedagógico del mes</h3>
          </div>
          <div class="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <div>
              <p class="text-base font-semibold text-gray-900 dark:text-white">
                Desarrollo de la comprensión lectora
              </p>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Implementación de estrategias transversales para fortalecer la comprensión lectora en todas las
                asignaturas, con seguimiento por niveles y apoyo colaborativo entre docentes.
              </p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-4">
              <div class="rounded-lg bg-purple-50/90 p-4 dark:bg-purple-950/25">
                <p class="text-xs font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-200">
                  Estrategias clave
                </p>
                <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>Lectura diaria por áreas</li>
                  <li>Preguntas de inferencia</li>
                  <li>Vocabulario técnico expandido</li>
                </ul>
              </div>
              <div class="rounded-lg bg-purple-50/90 p-4 dark:bg-purple-950/25">
                <p class="text-xs font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-200">
                  Recursos
                </p>
                <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>Biblioteca por aulas</li>
                  <li>Fichas de comprensión</li>
                  <li>Recursos digitales</li>
                </ul>
              </div>
              <div class="rounded-lg bg-purple-50/90 p-4 dark:bg-purple-950/25">
                <p class="text-xs font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-200">
                  Evaluación
                </p>
                <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>Prueba diagnóstica</li>
                  <li>Rúbrica por niveles</li>
                  <li>Evaluación mensual</li>
                </ul>
              </div>
            </div>
          </div>
          <div
            class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5"
          >
            <p class="text-xs text-gray-500 dark:text-gray-400">Vinculado a: Objetivo 2.3 del PAI</p>
            <a
              href="#"
              class="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Ver detalles
              <ArrowRightIcon class="size-4" aria-hidden="true" />
            </a>
          </div>
        </article>

        <!-- Ancho completo: pulso de acompañamiento -->
        <article
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60 lg:col-span-3"
        >
          <div class="border-b border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5">
            <div class="flex items-center gap-2">
              <ClipboardDocumentListIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Pulso de acompañamiento pedagógico</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-6 p-5 sm:p-6">
            <!-- Barras apiladas (como el original) -->
            <div class="flex flex-col gap-6">
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Observaciones de clase realizadas</span>
                  <span class="font-semibold text-gray-900 dark:text-white">8/15</span>
                </div>
                <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    class="h-full rounded-full bg-purple-600 dark:bg-purple-500"
                    :style="{ width: `${progressPct(8, 15)}%` }"
                  />
                </div>
                <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ progressPct(8, 15) }}% completado</span>
                  <span>Meta mensual: 15</span>
                </div>
              </div>
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Reuniones de retroalimentación</span>
                  <span class="font-semibold text-gray-900 dark:text-white">5/8</span>
                </div>
                <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    class="h-full rounded-full bg-purple-600 dark:bg-purple-500"
                    :style="{ width: `${progressPct(5, 8)}%` }"
                  />
                </div>
                <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ progressPct(5, 8) }}% completado</span>
                  <span>Pendientes: 3</span>
                </div>
              </div>
            </div>

            <!-- Dos bloques apilados (sin tercer cuadrado) -->
            <div class="flex flex-col gap-4">
              <div
                class="rounded-xl border border-gray-200/90 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-gray-800/40 sm:p-5"
              >
                <div class="mb-3 flex items-center gap-2">
                  <ClockIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Próximas observaciones</h4>
                </div>
                <ul class="divide-y divide-gray-200/80 dark:divide-white/10" role="list">
                  <li class="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                    <span class="font-medium text-gray-900 dark:text-white">4.º grado — Matemáticas</span>
                    <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">Mañana, 10:30</span>
                  </li>
                  <li class="flex items-center justify-between gap-3 py-2.5 text-sm last:pb-0">
                    <span class="font-medium text-gray-900 dark:text-white">2.º grado — Prácticas del lenguaje</span>
                    <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">Jueves, 09:15</span>
                  </li>
                </ul>
              </div>

              <div
                class="rounded-xl border border-gray-200/90 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-gray-800/40 sm:p-5"
              >
                <div class="mb-3 flex items-center gap-2">
                  <UserGroupIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Docentes acompañados</h4>
                </div>
                <ul class="divide-y divide-gray-200/80 dark:divide-white/10" role="list">
                  <li class="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                    <span class="text-gray-700 dark:text-gray-300">Observados este mes</span>
                    <span class="shrink-0 font-semibold text-gray-900 dark:text-white">8/24 (33%)</span>
                  </li>
                  <li class="flex items-center justify-between gap-3 py-2.5 text-sm last:pb-0">
                    <span class="text-gray-700 dark:text-gray-300">Con plan de mejora activo</span>
                    <span class="shrink-0 font-semibold text-gray-900 dark:text-white">5</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="mt-auto border-t border-gray-100 px-4 py-3 text-right dark:border-white/10 sm:px-5">
            <a
              href="#"
              class="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Ver APE completo
              <ArrowRightIcon class="size-4" aria-hidden="true" />
            </a>
          </div>
        </article>

        <!-- Tres tarjetas en una fila (lg+) -->
        <article
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60"
        >
          <div class="border-b border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5">
            <div class="flex items-center gap-2">
              <AcademicCapIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Desarrollo profesional docente</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <div>
              <div class="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>Docentes con PDPP activo</span>
                <span class="font-medium text-gray-900 dark:text-white">18/24</span>
              </div>
              <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-purple-600 dark:bg-purple-500"
                  :style="{ width: `${progressPct(18, 24)}%` }"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">75% del plantel</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-200">Actividades formativas recientes</p>
              <ul class="mt-2 divide-y divide-gray-100 dark:divide-white/10">
                <li class="flex items-start justify-between gap-2 py-2 text-sm first:pt-0">
                  <span class="text-gray-700 dark:text-gray-300">Taller sobre comprensión lectora</span>
                  <span class="shrink-0 text-xs font-medium text-purple-600 dark:text-purple-400">20</span>
                </li>
                <li class="flex items-start justify-between gap-2 py-2 text-sm">
                  <span class="text-gray-700 dark:text-gray-300">Webinar evaluación formativa</span>
                  <span class="shrink-0 text-xs font-medium text-purple-600 dark:text-purple-400">12</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-auto border-t border-gray-100 px-4 py-3 text-right dark:border-white/10 sm:px-5">
            <a
              href="#"
              class="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Ver Impulso docente
              <ArrowRightIcon class="size-4" aria-hidden="true" />
            </a>
          </div>
        </article>

        <article
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60"
        >
          <div class="border-b border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5">
            <div class="flex items-center gap-2">
              <UserGroupIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Comunidades de aprendizaje</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col p-5 sm:p-6">
            <p class="text-xs text-gray-500 dark:text-gray-400">CPA activas: <span class="font-semibold text-gray-900 dark:text-white">3 grupos</span></p>
            <ul class="mt-3 space-y-2">
              <li class="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/10">
                <span class="text-gray-800 dark:text-gray-200">CPA Prácticas del lenguaje</span>
                <span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">Activa</span>
              </li>
              <li class="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/10">
                <span class="text-gray-800 dark:text-gray-200">CPA Matemática</span>
                <span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">Activa</span>
              </li>
              <li class="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/10">
                <span class="text-gray-800 dark:text-gray-200">CPA Convivencia</span>
                <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">Iniciando</span>
              </li>
            </ul>
          </div>
          <div class="mt-auto border-t border-gray-100 px-4 py-3 text-right dark:border-white/10 sm:px-5">
            <a
              href="#"
              class="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Ver comunidades
              <ArrowRightIcon class="size-4" aria-hidden="true" />
            </a>
          </div>
        </article>

        <article
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60"
        >
          <div class="border-b border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5">
            <div class="flex items-center gap-2">
              <ExclamationTriangleIcon class="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Alertas de trayectorias estudiantiles</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-lg bg-red-50 px-2 py-2 text-center dark:bg-red-950/30">
                <p class="text-[10px] font-semibold uppercase leading-tight text-red-800 dark:text-red-200">Alto riesgo</p>
                <p class="mt-1 text-lg font-bold text-red-700 dark:text-red-300">5</p>
              </div>
              <div class="rounded-lg bg-amber-50 px-2 py-2 text-center dark:bg-amber-950/30">
                <p class="text-[10px] font-semibold uppercase leading-tight text-amber-900 dark:text-amber-100">Alerta</p>
                <p class="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">12</p>
              </div>
              <div class="rounded-lg bg-emerald-50 px-2 py-2 text-center dark:bg-emerald-950/30">
                <p class="text-[10px] font-semibold uppercase leading-tight text-emerald-800 dark:text-emerald-200">Seguimiento</p>
                <p class="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">8</p>
              </div>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-200">Casos prioritarios</p>
              <ul class="mt-2 space-y-2">
                <li class="flex items-center justify-between gap-2 text-sm">
                  <span class="text-gray-700 dark:text-gray-300">4.° grado — Asistencia crítica</span>
                  <span class="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/20 dark:text-red-200">3</span>
                </li>
                <li class="flex items-center justify-between gap-2 text-sm">
                  <span class="text-gray-700 dark:text-gray-300">2.° año — Rendimiento académico</span>
                  <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">2</span>
                </li>
                <li class="flex items-center justify-between gap-2 text-sm">
                  <span class="text-gray-700 dark:text-gray-300">3.° grado — Convivencia</span>
                  <span class="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-100">4</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-auto border-t border-gray-100 px-4 py-3 text-right dark:border-white/10 sm:px-5">
            <a
              href="#"
              class="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Ver trayectorias
              <ArrowRightIcon class="size-4" aria-hidden="true" />
            </a>
          </div>
        </article>
      </div>
    </div>

    <!-- Vista: Gestión Estratégica -->
    <div
      v-else-if="activeTab === 'estrategica'"
      class="mt-7 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 px-8 py-20 text-center dark:border-white/15 dark:bg-gray-900/30"
    >
      <ChartBarIcon class="mx-auto size-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">Gestión estratégica</p>
      <p class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">Aquí irá el contenido de esta vista cuando lo definamos.</p>
    </div>

    <!-- Vista: Comunidad y Recursos -->
    <div
      v-else
      class="mt-7 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 px-8 py-20 text-center dark:border-white/15 dark:bg-gray-900/30"
    >
      <UserGroupIcon class="mx-auto size-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">Comunidad y recursos</p>
      <p class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">Aquí irá el contenido de esta vista cuando lo definamos.</p>
    </div>
  </div>
</template>
