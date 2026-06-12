<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import {
  CALENDAR_PAST_DATE_MESSAGE,
  CALENDAR_PAST_SLOT_MESSAGE,
  isCalendarSlotCreateAllowed,
  parseYmd,
} from '@/utils/calendarioDates'

defineOptions({ name: 'CalendarioSlotCrearDialog' })

const open = defineModel<boolean>('open', { default: false })
const date = defineModel<string | null>('date', { default: null })

const props = defineProps<{
  slotTime?: string | null
}>()

const emit = defineEmits<{
  'add-event': [startTime?: string]
  'add-task': [startTime?: string]
}>()

const canCreate = computed(
  () => !date.value || isCalendarSlotCreateAllowed(date.value, props.slotTime),
)
const pastMessage = computed(() =>
  props.slotTime ? CALENDAR_PAST_SLOT_MESSAGE : CALENDAR_PAST_DATE_MESSAGE,
)

const dateTimeLabel = computed(() => {
  if (!date.value) return '—'
  const d = parseYmd(date.value)
  const dayPart = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  const label = dayPart.charAt(0).toUpperCase() + dayPart.slice(1)
  return props.slotTime ? `${label} · ${props.slotTime}` : label
})

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
  emit('add-task', props.slotTime ?? undefined)
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
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" aria-hidden="true" />
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
              class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="border-b border-gray-200 px-5 py-4 dark:border-white/10">
                <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                  Nueva actividad
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <time v-if="date" :datetime="date">{{ dateTimeLabel }}</time>
                </p>
              </div>

              <div class="space-y-2 p-4">
                <p
                  v-if="!canCreate"
                  class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {{ pastMessage }}
                </p>
                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-gray-800 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                  @click="onAddEvent"
                >
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                  >
                    <CalendarDaysIcon class="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-gray-900 dark:text-white">Crear evento</span>
                    <span class="block text-xs text-gray-500 dark:text-gray-400">
                      {{ slotTime ? 'Con horario en el calendario' : 'Actividad con fecha y hora' }}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-violet-400 hover:bg-violet-50/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-gray-800 dark:hover:border-violet-500/50 dark:hover:bg-violet-950/30"
                  @click="onAddTask"
                >
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  >
                    <CheckCircleIcon class="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-gray-900 dark:text-white">Crear tarea</span>
                    <span class="block text-xs text-gray-500 dark:text-gray-400">
                      {{ slotTime ? `Para las ${slotTime}` : 'Para este día' }}
                    </span>
                  </span>
                </button>
              </div>

              <div class="border-t border-gray-200 px-5 py-3 dark:border-white/10">
                <button
                  type="button"
                  class="w-full rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/10"
                  @click="close"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
