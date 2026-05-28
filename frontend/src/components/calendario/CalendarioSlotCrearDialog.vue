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
import { CALENDAR_PAST_DATE_MESSAGE, isDateBeforeToday, parseYmd } from '@/utils/calendarioDates'

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

const canCreate = computed(() => !date.value || !isDateBeforeToday(date.value))

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
              <div class="border-b border-[#dadce0] px-5 py-4 dark:border-white/10">
                <DialogTitle class="text-base font-semibold text-[#3c4043] dark:text-white">
                  Nueva actividad
                </DialogTitle>
                <p class="mt-1 text-sm text-[#70757a] dark:text-gray-400">
                  <time v-if="date" :datetime="date">{{ dateTimeLabel }}</time>
                </p>
              </div>

              <div class="space-y-2 p-4">
                <p
                  v-if="!canCreate"
                  class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  {{ CALENDAR_PAST_DATE_MESSAGE }}
                </p>
                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#1a73e8] hover:bg-[#e8f0fe]/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-[#292a2d] dark:hover:border-[#8ab4f8] dark:hover:bg-[#394457]/50"
                  @click="onAddEvent"
                >
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]"
                  >
                    <CalendarDaysIcon class="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-[#3c4043] dark:text-white">Crear evento</span>
                    <span class="block text-xs text-[#70757a] dark:text-gray-400">
                      {{ slotTime ? 'Con horario en el calendario' : 'Actividad con fecha y hora' }}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  :disabled="!canCreate"
                  class="flex w-full items-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#8E24AA] hover:bg-violet-50/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-[#292a2d] dark:hover:border-violet-500/50 dark:hover:bg-violet-950/30"
                  @click="onAddTask"
                >
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  >
                    <CheckCircleIcon class="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-[#3c4043] dark:text-white">Crear tarea</span>
                    <span class="block text-xs text-[#70757a] dark:text-gray-400">
                      {{ slotTime ? `Para las ${slotTime}` : 'Para este día' }}
                    </span>
                  </span>
                </button>
              </div>

              <div class="border-t border-[#dadce0] px-5 py-3 dark:border-white/10">
                <button
                  type="button"
                  class="w-full rounded-lg py-2 text-sm font-medium text-[#70757a] hover:bg-[#f1f3f4] dark:text-gray-400 dark:hover:bg-white/10"
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
