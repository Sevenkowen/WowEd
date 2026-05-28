<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { formatYmd, mondayIndex, parseYmd } from '@/utils/calendarioDates'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { gcalShell } from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarNavToolbar from '@/components/calendario/CalendarioEscolarNavToolbar.vue'

defineOptions({ name: 'CalendarioEscolarYear' })

const schoolYear = defineModel<number>('schoolYear', { default: 2026 })
const selectedDate = defineModel<string | null>('selectedDate', { default: null })
const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  'add-event': []
  'add-task': []
  refresh: []
}>()
const { porFecha } = useCalendarioEscolarEvents()
const { porFecha: tareasPorFecha } = useCalendarioEscolarTasks()

const viewYear = ref(schoolYear.value)

watch(
  schoolYear,
  (y) => {
    if (viewYear.value !== y) viewYear.value = y
  },
  { flush: 'sync' },
)

watch(viewYear, (y) => {
  if (schoolYear.value !== y) schoolYear.value = y
})

const todayStr = formatYmd(new Date())
const weekLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

interface YearDay {
  date: string
  isCurrentMonth?: boolean
  isToday?: boolean
  isSelected?: boolean
  hasEvents: boolean
}

interface YearMonth {
  monthIndex: number
  name: string
  days: YearDay[]
}

function buildMonth(y: number, m: number): YearDay[] {
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(1 - mondayIndex(first))
  const cells: YearDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = formatYmd(d)
    const isCurrentMonth = d.getMonth() === m && d.getFullYear() === y
    cells.push({
      date: dateStr,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isSelected: selectedDate.value === dateStr,
      hasEvents:
        contentMode.value === 'tareas'
          ? (tareasPorFecha.value[dateStr]?.length ?? 0) > 0
          : (porFecha.value[dateStr]?.length ?? 0) > 0 ||
            (tareasPorFecha.value[dateStr]?.length ?? 0) > 0,
    })
  }
  return cells
}

const months = computed((): YearMonth[] => {
  const y = viewYear.value
  return Array.from({ length: 12 }, (_, m) => ({
    monthIndex: m,
    name: new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(y, m, 1)),
    days: buildMonth(y, m),
  }))
})

const yearDatetimeAttr = computed(() => String(viewYear.value))

function dayNum(ymd: string): string {
  return String(parseYmd(ymd).getDate())
}

function prevYear() {
  viewYear.value -= 1
}

function nextYear() {
  viewYear.value += 1
}

function goToday() {
  const today = new Date()
  viewYear.value = today.getFullYear()
  selectedDate.value = formatYmd(today)
}

function selectDay(date: string) {
  selectedDate.value = date
  const d = parseYmd(date)
  if (d.getFullYear() !== viewYear.value) {
    viewYear.value = d.getFullYear()
  }
}

</script>

<template>
  <div :class="gcalShell">
    <CalendarioEscolarNavToolbar
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      :title="String(viewYear)"
      :datetime="yearDatetimeAttr"
      @prev="prevYear"
      @next="nextYear"
      @today="goToday"
      @refresh="$emit('refresh')"
    />

    <div class="min-h-0 flex-1 overflow-auto bg-white dark:bg-[#202124]">
      <div
        class="mx-auto grid max-w-3xl grid-cols-1 gap-x-8 gap-y-12 px-4 py-10 sm:grid-cols-2 sm:px-6 xl:max-w-none xl:grid-cols-3 xl:px-8 2xl:grid-cols-4"
      >
        <section v-for="month in months" :key="month.monthIndex" class="text-center">
          <h2 class="text-sm font-semibold capitalize text-gray-900 dark:text-white">{{ month.name }}</h2>
          <div class="mt-4 grid grid-cols-7 text-xs/6 font-medium text-gray-500 dark:text-gray-400">
            <div v-for="(label, i) in weekLabels" :key="i">{{ label }}</div>
          </div>
          <div
            class="isolate mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-gray-200 text-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10"
          >
            <button
              v-for="day in month.days"
              :key="day.date"
              type="button"
              :data-is-current-month="day.isCurrentMonth ? '' : undefined"
              :data-is-selected="day.isSelected ? '' : undefined"
              :data-is-today="day.isToday ? '' : undefined"
              class="relative py-1.5 not-data-is-current-month:bg-gray-100 not-data-is-selected:not-data-is-current-month:not-data-is-today:text-gray-400 first:rounded-tl-lg last:rounded-br-lg hover:bg-gray-50 focus:z-10 data-is-current-month:bg-white not-data-is-selected:data-is-current-month:not-data-is-today:text-gray-900 data-is-current-month:hover:bg-gray-50/80 data-is-selected:font-semibold data-is-selected:text-white data-is-today:font-semibold data-is-today:not-data-is-selected:text-indigo-600 nth-36:rounded-bl-lg nth-7:rounded-tr-lg dark:not-data-is-current-month:bg-gray-900/75 dark:not-data-is-selected:not-data-is-current-month:not-data-is-today:text-gray-500 dark:data-is-current-month:bg-gray-950 dark:not-data-is-selected:data-is-current-month:not-data-is-today:text-white dark:data-is-current-month:hover:bg-gray-900/50 dark:data-is-today:not-data-is-selected:text-indigo-400"
              @click="selectDay(day.date)"
            >
              <time
                :datetime="day.date"
                class="mx-auto flex size-7 items-center justify-center rounded-full in-data-is-selected:not-in-data-is-today:bg-[#1a73e8] in-data-is-selected:in-data-is-today:bg-[#1a73e8] in-data-is-selected:text-white in-data-is-today:bg-[#1a73e8] in-data-is-today:font-medium in-data-is-today:text-white"
              >{{ dayNum(day.date) }}</time>
              <span
                v-if="day.hasEvents && day.isCurrentMonth"
                class="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1a73e8] dark:bg-[#8ab4f8]"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
