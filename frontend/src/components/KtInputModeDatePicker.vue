<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'

defineOptions({ name: 'KtInputModeDatePicker' })

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** YYYY-MM-DD; días anteriores no se pueden elegir. */
    minDate?: string
  }>(),
  { placeholder: 'Seleccionar fecha' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function parseIso(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, day ?? 1)
}

function toIso(y: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

watch(
  () => props.modelValue,
  (v) => {
    const dt = v ? parseIso(v) : new Date()
    const base = !isNaN(dt.getTime()) ? dt : new Date()
    viewYear.value = base.getFullYear()
    viewMonth.value = base.getMonth()
  },
  { immediate: true },
)

const monthYearLabel = computed(() => {
  return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
    new Date(viewYear.value, viewMonth.value, 1),
  )
})

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type Cell = {
  iso: string
  day: number
  inMonth: boolean
}

const cells = computed((): Cell[] => {
  const y = viewYear.value
  const m = viewMonth.value
  const first = new Date(y, m, 1)
  const startPad = (first.getDay() + 6) % 7 // Lunes = 0
  const dim = new Date(y, m + 1, 0).getDate()
  const prevDim = new Date(y, m, 0).getDate()

  const rows: Cell[] = []
  for (let i = 0; i < startPad; i++) {
    const day = prevDim - startPad + i + 1
    const prevY = m === 0 ? y - 1 : y
    const prevM = m === 0 ? 11 : m - 1
    rows.push({ iso: toIso(prevY, prevM, day), day, inMonth: false })
  }
  for (let d = 1; d <= dim; d++) {
    rows.push({ iso: toIso(y, m, d), day: d, inMonth: true })
  }
  const remaining = 42 - rows.length
  for (let d = 1; d <= remaining; d++) {
    const nextY = m === 11 ? y + 1 : y
    const nextM = m === 11 ? 0 : m + 1
    rows.push({ iso: toIso(nextY, nextM, d), day: d, inMonth: false })
  }
  return rows
})

const displayText = computed(() => {
  if (!props.modelValue) return ''
  const dt = parseIso(props.modelValue)
  if (isNaN(dt.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dt)
  } catch {
    return props.modelValue
  }
})

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function isDisabled(iso: string): boolean {
  return Boolean(props.minDate && iso < props.minDate)
}

function pick(iso: string, close: () => void) {
  if (isDisabled(iso)) return
  emit('update:modelValue', iso)
  close()
}
</script>

<template>
  <Popover class="relative">
    <PopoverButton
      type="button"
      class="relative flex w-full cursor-default items-center gap-0 rounded-lg border border-neutral-700 bg-neutral-950 py-2 pr-3 pl-10 text-left shadow-sm outline-hidden ring-white/10 transition hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-sky-500/40"
    >
      <CalendarDaysIcon
        class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500"
        aria-hidden="true"
      />
      <span
        v-if="displayText"
        class="grow text-sm font-medium text-neutral-100"
      >{{ displayText }}</span>
      <span v-else class="grow text-sm font-medium text-neutral-500">{{ placeholder }}</span>
    </PopoverButton>

    <PopoverPanel
      v-slot="{ close }"
      class="absolute z-[60] mt-2 w-[18rem] origin-top rounded-xl border border-neutral-700/90 bg-neutral-950 p-3 shadow-2xl ring-1 ring-black/40"
    >
        <div class="mb-3 flex items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            class="rounded-md p-1 text-neutral-400 outline-hidden hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500/50"
            @click="prevMonth"
          >
            <span class="sr-only">Mes anterior</span>
            <ChevronLeftIcon class="size-5" aria-hidden="true" />
          </button>
          <span class="min-w-0 truncate text-center text-sm font-semibold capitalize text-white">
            {{ monthYearLabel }}
          </span>
          <button
            type="button"
            class="rounded-md p-1 text-neutral-400 outline-hidden hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500/50"
            @click="nextMonth"
          >
            <span class="sr-only">Mes siguiente</span>
            <ChevronRightIcon class="size-5" aria-hidden="true" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-y-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          <span v-for="w in weekdays" :key="w" class="py-1">{{ w }}</span>
        </div>

        <div class="mt-1 grid grid-cols-7 gap-1">
          <button
            v-for="(cell, idx) in cells"
            :key="idx"
            type="button"
            :disabled="isDisabled(cell.iso)"
            :class="[
              'flex size-9 items-center justify-center rounded-lg text-sm font-medium outline-hidden transition focus-visible:ring-2 focus-visible:ring-sky-500/50',
              isDisabled(cell.iso)
                ? 'cursor-not-allowed text-neutral-700 opacity-40'
                : cell.inMonth
                  ? 'text-neutral-100 hover:bg-white/10'
                  : 'text-neutral-600 hover:bg-white/5',
              !isDisabled(cell.iso) && cell.iso === modelValue
                ? 'bg-neutral-800 text-sky-400 hover:bg-neutral-800 hover:text-sky-300'
                : '',
            ]"
            @click="pick(cell.iso, close)"
          >
            {{ cell.day }}
          </button>
        </div>
    </PopoverPanel>
  </Popover>
</template>
