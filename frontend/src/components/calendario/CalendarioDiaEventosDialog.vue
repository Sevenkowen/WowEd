<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import {
  sidebarEventCardClass,
  sidebarEventDotClass,
  sidebarEventTimeClass,
} from '@/utils/calendarioEventStyles'
import { taskCuadranteOf, taskTipoOf } from '@/data/calendarioTareaOptions'
import {
  sidebarTaskCardClass,
  sidebarTaskDotClass,
  sidebarTaskMetaClass,
  taskDisplayTitle,
} from '@/utils/calendarioTaskStyles'
import { isCalendarSlotCreateAllowed } from '@/utils/calendarioDates'

defineOptions({ name: 'CalendarioDiaEventosDialog' })

const open = defineModel<boolean>('open', { default: false })
const date = defineModel<string | null>('date', { default: null })

const props = defineProps<{
  /** Hora sugerida al crear evento (HH:mm), p. ej. desde la grilla semanal. */
  slotTime?: string | null
}>()

const emit = defineEmits<{
  'add-event': [startTime?: string]
  'add-task': []
}>()

const { eventosDelDia, porFecha: eventosPorFecha } = useCalendarioEscolarEvents()
const { tareasDelDia } = useCalendarioEscolarTasks()

const events = computed(() => eventosDelDia(date.value))
const tasks = computed(() => tareasDelDia(date.value))
const canCreate = computed(
  () => !date.value || isCalendarSlotCreateAllowed(date.value, props.slotTime),
)

const isEmpty = computed(() => events.value.length === 0 && tasks.value.length === 0)

const dateLabel = computed(() => {
  if (!date.value) return '—'
  const [y, m, d] = date.value.split('-').map(Number)
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

function eventNameById(eventId: string): string | null {
  for (const list of Object.values(eventosPorFecha.value)) {
    const ev = list.find((e) => e.id === eventId)
    if (ev) return ev.name
  }
  return null
}

function linkedEventLabel(task: { eventId?: string | null }): string | null {
  if (!task.eventId) return null
  return eventNameById(task.eventId)
}

function close() {
  open.value = false
}

function onAddEvent() {
  if (!canCreate.value) return
  emit('add-event', props.slotTime ?? undefined)
  close()
}

function onAddTask() {
  if (!canCreate.value) return
  emit('add-task')
  close()
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" aria-hidden="true"></div>
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
              class="flex max-h-[min(85vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-white/10">
                <div class="min-w-0">
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Eventos y tareas del día
                  </DialogTitle>
                  <p class="mt-1 text-sm capitalize text-gray-600 dark:text-gray-400">
                    <time v-if="date" :datetime="date">{{ dateLabel }}</time>
                    <span v-if="slotTime" class="mt-0.5 block text-xs font-medium normal-case text-indigo-600 dark:text-indigo-400">
                      Franja seleccionada: {{ slotTime }}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="close"
                >
                  <span class="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <template v-if="!isEmpty">
                  <section v-if="events.length > 0">
                    <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Eventos
                    </h3>
                    <ul class="mt-2 space-y-3">
                      <li v-for="ev in events" :key="`ev-${ev.id}`" :class="sidebarEventCardClass(ev)">
                        <div class="flex items-start gap-2.5">
                          <span :class="[sidebarEventDotClass(ev), 'mt-1.5']" aria-hidden="true" />
                          <div class="min-w-0 flex-1">
                            <p class="font-medium text-gray-900 dark:text-white">{{ ev.name }}</p>
                            <p :class="sidebarEventTimeClass(ev)">{{ ev.time }}</p>
                            <p
                              v-if="ev.eventType"
                              class="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                            >
                              {{ ev.eventType }}
                            </p>
                            <p
                              v-if="ev.description"
                              class="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300"
                            >
                              {{ ev.description }}
                            </p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </section>

                  <section v-if="tasks.length > 0" :class="events.length > 0 ? 'mt-6' : ''">
                    <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Tareas
                    </h3>
                    <ul class="mt-2 space-y-3">
                      <li
                        v-for="task in tasks"
                        :key="`task-${task.id}`"
                        :class="sidebarTaskCardClass(!!task.eventId)"
                      >
                        <div class="flex items-start gap-2.5">
                          <span :class="[sidebarTaskDotClass(), 'mt-1.5']" aria-hidden="true" />
                          <div class="min-w-0 flex-1">
                            <p class="font-medium text-gray-900 dark:text-white">{{ taskDisplayTitle(task) }}</p>
                            <p class="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                              {{ taskTipoOf(task) }} · {{ taskCuadranteOf(task) }}
                            </p>
                            <p v-if="linkedEventLabel(task)" :class="sidebarTaskMetaClass()">
                              Vinculada a: {{ linkedEventLabel(task) }}
                            </p>
                            <p v-else :class="sidebarTaskMetaClass()">Tarea suelta</p>
                            <p
                              v-if="task.description"
                              class="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300"
                            >
                              {{ task.description }}
                            </p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </section>
                </template>
                <p v-else class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No hay eventos ni tareas para esta fecha.
                </p>
              </div>

              <div
                v-if="canCreate"
                class="shrink-0 space-y-2 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-white/10 dark:bg-gray-950/50"
              >
                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/50 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/40 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50"
                  @click="onAddTask"
                >
                  <span class="text-lg leading-none" aria-hidden="true">+</span>
                  Añadir tarea
                </button>
                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:bg-indigo-950/50"
                  @click="onAddEvent"
                >
                  <span class="text-lg leading-none" aria-hidden="true">+</span>
                  Añadir evento
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
