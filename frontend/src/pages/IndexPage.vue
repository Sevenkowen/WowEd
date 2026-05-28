<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDaysIcon, ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/vue/24/outline'
import DashboardCenterPanel from '@/components/DashboardCenterPanel.vue'

defineOptions({ name: 'IndexPage' })

const saludo = computed(() => {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})

const fechaLarga = computed(() => {
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const fechaIso = computed(() => new Date().toISOString().slice(0, 10))

type TagTone = 'purple' | 'blue' | 'amber'

const eventosProximos = [
  {
    cuando: 'Hoy, 10:30',
    titulo: 'Observación de clase 4to grado',
    etiqueta: 'pedagogical',
    tone: 'purple' as TagTone,
  },
  {
    cuando: 'Hoy, 14:00',
    titulo: 'Reunión equipo directivo',
    etiqueta: 'administrative',
    tone: 'blue' as TagTone,
  },
  {
    cuando: 'Mañana, 09:00',
    titulo: 'Taller para docentes',
    etiqueta: 'professional',
    tone: 'amber' as TagTone,
  },
]

const tareasPrioritarias = [
  {
    titulo: 'Observación de clase 4to grado',
    tiempo: 'Hoy, 10:30',
    etiqueta: 'Pedagógica',
    tone: 'purple' as TagTone,
  },
  {
    titulo: 'Reunión equipo directivo',
    tiempo: 'Hoy, 14:00',
    etiqueta: 'Administrativa',
    tone: 'blue' as TagTone,
  },
  {
    titulo: 'Revisar planificaciones semanales',
    tiempo: 'Mañana',
    etiqueta: 'Pedagógica',
    tone: 'purple' as TagTone,
  },
]

function tagClasses(tone: TagTone): string {
  const map: Record<TagTone, string> = {
    purple:
      'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    amber:
      'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  }
  return map[tone]
}
</script>

<template>
  <div class="w-full text-left">
    <div class="w-full">
      <div
        class="mt-1 flex w-full flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10 lg:gap-14"
      >
        <div class="min-w-0 shrink-0 sm:max-w-xl lg:max-w-2xl">
          <h1 class="text-left text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {{ saludo }}, Director/a
          </h1>
          <p class="mt-2 text-left text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            <time :datetime="fechaIso">{{ fechaLarga }}</time>
          </p>
        </div>
        <div
          class="min-w-0 border-t-2 border-indigo-500/80 pt-6 sm:max-w-xl sm:flex-1 sm:border-t-0 sm:border-l-2 sm:pl-8 sm:pt-0 dark:border-indigo-400/70 lg:pl-10"
        >
          <p class="text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Foco del día
          </p>
          <p class="mt-2 text-left text-base leading-relaxed text-gray-800 dark:text-gray-200">
            Mejora continua de la enseñanza y el aprendizaje
          </p>
        </div>
      </div>
    </div>

    <div
      class="mt-12 grid w-full grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_min(100%,19rem)] xl:items-start xl:gap-9 xl:min-h-[28rem] 2xl:[grid-template-columns:minmax(0,1fr)_21.5rem]"
    >
      <!-- Área principal del dashboard (izquierda) -->
      <section
        class="flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none lg:min-h-[min(32rem,calc(100vh-14rem))]"
      >
        <DashboardCenterPanel class="min-h-0 flex-1" />
      </section>

      <!-- Widgets: eventos y tareas (derecha, una columna) -->
      <aside class="flex w-full min-w-0 flex-col gap-5 lg:max-w-none lg:gap-6" aria-label="Widgets del dashboard">
        <!-- Eventos próximos -->
        <div
          class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        >
          <div class="border-b border-gray-200 px-4 py-3.5 dark:border-white/10">
            <div class="flex items-center gap-2.5">
              <CalendarDaysIcon class="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Eventos próximos</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col px-4 py-3.5">
            <ul class="divide-y divide-gray-100 dark:divide-white/10" role="list">
              <li v-for="ev in eventosProximos" :key="ev.titulo" class="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
                <p class="w-[5.25rem] shrink-0 text-xs font-medium leading-snug text-indigo-600 dark:text-indigo-400 sm:w-28 sm:text-sm">
                  {{ ev.cuando }}
                </p>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium leading-snug text-gray-900 dark:text-white">{{ ev.titulo }}</p>
                  <span
                    class="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="tagClasses(ev.tone)"
                  >
                    {{ ev.etiqueta }}
                  </span>
                </div>
              </li>
            </ul>
          </div>
          <div class="border-t border-gray-200 px-4 py-3 dark:border-white/10">
            <a
              href="#"
              class="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Ver agenda completa
            </a>
          </div>
        </div>

        <!-- Tareas prioritarias -->
        <div
          class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900/40 dark:shadow-none"
        >
          <div class="border-b border-gray-200 px-4 py-3.5 dark:border-white/10">
            <div class="flex items-center gap-2.5">
              <ClipboardDocumentCheckIcon class="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Tareas prioritarias</h3>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-3 px-4 py-3.5">
            <div
              v-for="t in tareasPrioritarias"
              :key="t.titulo"
              class="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 dark:border-white/10 dark:bg-white/5"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium leading-snug text-gray-900 dark:text-white">{{ t.titulo }}</p>
                  <p class="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon class="size-3.5 shrink-0" aria-hidden="true" />
                    {{ t.tiempo }}
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="tagClasses(t.tone)"
                >
                  {{ t.etiqueta }}
                </span>
              </div>
            </div>
          </div>
          <div class="border-t border-gray-200 px-4 py-3 dark:border-white/10">
            <a
              href="#"
              class="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Ver todas las tareas
            </a>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
