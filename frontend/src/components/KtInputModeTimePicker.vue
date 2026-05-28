<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ClockIcon } from '@heroicons/vue/24/outline'

defineOptions({ name: 'KtInputModeTimePicker' })

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minuteStep?: number
  }>(),
  { placeholder: 'Seleccionar hora', minuteStep: 5 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = (value || '09:00').split(':').map(Number)
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  }
}

const selectedHour = ref(parseTime(props.modelValue).hour)
const selectedMinute = ref(parseTime(props.modelValue).minute)

watch(
  () => props.modelValue,
  (v) => {
    const { hour, minute } = parseTime(v)
    selectedHour.value = hour
    selectedMinute.value = snapMinute(minute)
  },
)

const hours = Array.from({ length: 24 }, (_, i) => i)

const minutes = computed(() => {
  const step = Math.min(30, Math.max(1, props.minuteStep))
  const opts: number[] = []
  for (let m = 0; m < 60; m += step) opts.push(m)
  return opts
})

function snapMinute(m: number): number {
  const step = Math.min(30, Math.max(1, props.minuteStep))
  return Math.round(m / step) * step % 60
}

const displayText = computed(() => {
  if (!props.modelValue) return ''
  const { hour, minute } = parseTime(props.modelValue)
  return `${pad2(hour)}:${pad2(minute)}`
})

function emitTime() {
  emit('update:modelValue', `${pad2(selectedHour.value)}:${pad2(selectedMinute.value)}`)
}

function pickHour(h: number) {
  selectedHour.value = h
  emitTime()
}

function pickMinute(m: number, close: () => void) {
  selectedMinute.value = m
  emitTime()
  close()
}

function hourBtnClass(h: number): string {
  const base =
    'flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium outline-hidden transition focus-visible:ring-2 focus-visible:ring-sky-500/50'
  return h === selectedHour.value
    ? `${base} bg-neutral-800 text-sky-400`
    : `${base} text-neutral-100 hover:bg-white/10`
}

function minuteBtnClass(m: number): string {
  const base =
    'flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium outline-hidden transition focus-visible:ring-2 focus-visible:ring-sky-500/50'
  return m === selectedMinute.value
    ? `${base} bg-neutral-800 text-sky-400`
    : `${base} text-neutral-100 hover:bg-white/10`
}
</script>

<template>
  <Popover class="relative">
    <PopoverButton
      type="button"
      class="relative flex w-full cursor-default items-center rounded-lg border border-neutral-700 bg-neutral-950 py-2 pr-3 pl-10 text-left shadow-sm outline-hidden ring-white/10 transition hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:focus-visible:ring-purple-500/25"
    >
      <ClockIcon
        class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500"
        aria-hidden="true"
      />
      <span v-if="displayText" class="grow text-sm font-medium text-neutral-100">{{ displayText }}</span>
      <span v-else class="grow text-sm font-medium text-neutral-500">{{ placeholder }}</span>
    </PopoverButton>

    <PopoverPanel
      v-slot="{ close }"
      class="absolute z-[60] mt-2 w-[14.5rem] origin-top rounded-xl border border-neutral-700/90 bg-neutral-950 p-2 shadow-2xl ring-1 ring-black/40"
    >
      <p class="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Hora · Minutos
      </p>
      <div class="flex divide-x divide-neutral-800 rounded-lg border border-neutral-800">
        <div class="max-h-52 w-1/2 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]">
          <button
            v-for="h in hours"
            :key="h"
            type="button"
            :class="hourBtnClass(h)"
            @click="pickHour(h)"
          >
            {{ pad2(h) }}
          </button>
        </div>
        <div class="max-h-52 w-1/2 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]">
          <button
            v-for="m in minutes"
            :key="m"
            type="button"
            :class="minuteBtnClass(m)"
            @click="pickMinute(m, close)"
          >
            {{ pad2(m) }}
          </button>
        </div>
      </div>
    </PopoverPanel>
  </Popover>
</template>
