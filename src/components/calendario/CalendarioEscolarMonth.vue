<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/vue/20/solid'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { demoPorFecha, type CalEvent } from '@/data/calendarioEscolarDemo'

defineOptions({ name: 'CalendarioEscolarMonth' })

const schoolYear = defineModel<number>('schoolYear', { default: 2026 })
const selectedDate = defineModel<string | null>('selectedDate', { default: null })

interface DayCell {
  date: string
  isCurrentMonth?: boolean
  isToday?: boolean
  isSelected?: boolean
  events: CalEvent[]
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

const view = ref(new Date(schoolYear.value, 4, 1))

watch(
  schoolYear,
  (y) => {
    if (view.value.getFullYear() !== y) {
      view.value = new Date(y, view.value.getMonth(), 1)
    }
  },
  { flush: 'sync' },
)

watch(view, () => {
  const y = view.value.getFullYear()
  if (schoolYear.value !== y) {
    schoolYear.value = y
  }
})

function buildMonth(y: number, m: number): DayCell[] {
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(1 - mondayIndex(first))
  const todayStr = formatYmd(new Date())
  const cells: DayCell[] = []
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
      events: demoPorFecha[dateStr] ?? [],
    })
  }
  return cells
}

const days = computed(() => {
  const d = view.value
  return buildMonth(d.getFullYear(), d.getMonth())
})

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(view.value),
)

const monthDatetimeAttr = computed(() => `${view.value.getFullYear()}-${pad(view.value.getMonth() + 1)}`)

type MobileEventRow = CalEvent & { dayDate: string }

const mobileEvents = computed((): MobileEventRow[] => {
  const y = view.value.getFullYear()
  const m = view.value.getMonth()
  return days.value
    .filter((day) => {
      const [ys, ms] = day.date.split('-').map(Number)
      return day.events.length > 0 && ys === y && ms - 1 === m
    })
    .flatMap((day) => day.events.map((e) => ({ ...e, dayDate: day.date })))
})

function prevMonth(): void {
  const d = new Date(view.value)
  d.setMonth(d.getMonth() - 1)
  view.value = d
}

function nextMonth(): void {
  const d = new Date(view.value)
  d.setMonth(d.getMonth() + 1)
  view.value = d
}

function goToday(): void {
  view.value = new Date()
  selectedDate.value = formatYmd(new Date())
}

function selectDay(date: string): void {
  selectedDate.value = date
}

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-gray-200 ring-1 ring-gray-900/5 lg:flex lg:h-full lg:min-h-[32rem] lg:flex-col dark:border-white/10 dark:ring-white/10"
  >
    <div class="lg:flex lg:h-full lg:flex-col">
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:flex-none dark:border-white/10 dark:bg-gray-950"
      >
        <h1 class="text-base font-semibold capitalize text-gray-900 dark:text-white">
          <time :datetime="monthDatetimeAttr">{{ monthTitle }}</time>
        </h1>
        <div class="flex flex-wrap items-center gap-3">
          <div
            class="relative flex items-center rounded-md border border-gray-200 bg-gray-50 outline md:items-stretch dark:border-white/10 dark:bg-white/10 dark:outline-white/10"
          >
            <button
              type="button"
              class="flex h-9 w-12 items-center justify-center rounded-l-md pr-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:relative md:w-9 md:pr-0 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              @click="prevMonth"
            >
              <span class="sr-only">Mes anterior</span>
              <ChevronLeftIcon class="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="hidden px-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus:relative md:block dark:text-white dark:hover:bg-white/10"
              @click="goToday"
            >
              Hoy
            </button>
            <span class="relative -mx-px h-5 w-px bg-gray-200 md:hidden dark:bg-white/10"></span>
            <button
              type="button"
              class="flex h-9 w-12 items-center justify-center rounded-r-md pl-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:relative md:w-9 md:pl-0 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              @click="nextMonth"
            >
              <span class="sr-only">Mes siguiente</span>
              <ChevronRightIcon class="size-5" aria-hidden="true" />
            </button>
          </div>
          <div class="hidden items-center md:ml-2 md:flex md:flex-wrap md:gap-3">
            <Menu as="div" class="relative">
              <MenuButton
                type="button"
                class="flex items-center gap-x-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-transparent dark:bg-white/10 dark:text-white dark:ring-1 dark:ring-inset dark:ring-white/10 dark:hover:bg-white/20"
              >
                Vista mensual
                <ChevronDownIcon class="-mr-1 size-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              </MenuButton>
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 z-10 mt-3 w-40 origin-top-right overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-white/10 dark:bg-gray-900 dark:ring-white/10"
                >
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista día</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista semana</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista mes</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista año</a
                    >
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
            <div class="hidden h-6 w-px bg-gray-200 md:block dark:bg-white/10"></div>
            <button
              type="button"
              class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Agregar evento
            </button>
          </div>
          <Menu as="div" class="relative md:hidden">
            <MenuButton
              type="button"
              class="-mx-2 flex items-center rounded-full border border-transparent p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span class="sr-only">Abrir menú</span>
              <EllipsisHorizontalIcon class="size-5" aria-hidden="true" />
            </MenuButton>
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems
                class="absolute right-0 z-10 mt-3 w-40 origin-top-right divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 dark:divide-white/10 dark:border-white/10 dark:bg-gray-900 dark:ring-white/10"
              >
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Crear evento</a
                    >
                  </MenuItem>
                </div>
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Ir a hoy</a
                    >
                  </MenuItem>
                </div>
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista día</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista semana</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista mes</a
                    >
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <a
                      href="#"
                      :class="[
                        active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                        'block px-4 py-2 text-sm',
                      ]"
                      >Vista año</a
                    >
                  </MenuItem>
                </div>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </header>

      <div class="ring-1 ring-gray-200 lg:flex lg:flex-auto lg:flex-col dark:ring-white/10">
        <div
          class="grid grid-cols-7 gap-px border-b border-gray-200 bg-gray-200 text-center text-xs/6 font-semibold text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300 lg:flex-none"
        >
          <div
            v-for="(wd, i) in weekDays"
            :key="i"
            class="flex justify-center bg-white py-2 text-gray-600 dark:bg-gray-950 dark:text-gray-300"
          >
            <span class="sm:hidden">{{ wd.slice(0, 2) }}</span>
            <span class="hidden sm:inline">{{ wd }}</span>
          </div>
        </div>

        <div class="flex bg-gray-100 text-xs/6 text-gray-600 dark:bg-white/10 dark:text-gray-300 lg:flex-auto">
          <div class="hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-6 lg:gap-px">
            <div
              v-for="day in days"
              :key="day.date"
              role="button"
              tabindex="0"
              :data-is-current-month="day.isCurrentMonth ? '' : undefined"
              :data-is-today="day.isToday ? '' : undefined"
              :data-is-selected="day.isSelected ? '' : undefined"
              class="group relative cursor-pointer bg-white px-3 py-2 text-left text-gray-500 outline-none not-data-is-current-month:before:pointer-events-none not-data-is-current-month:before:absolute not-data-is-current-month:before:inset-0 not-data-is-current-month:before:bg-gray-100/90 data-is-current-month:bg-white data-is-selected:ring-2 data-is-selected:ring-inset data-is-selected:ring-indigo-500 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-gray-900 dark:text-gray-400 dark:not-data-is-current-month:before:bg-gray-950/80 dark:data-is-current-month:bg-gray-900 dark:hover:bg-gray-900/70"
              @click="selectDay(day.date)"
              @keydown.enter.prevent="selectDay(day.date)"
            >
              <time
                :datetime="day.date"
                class="relative group-not-data-is-current-month:opacity-60 in-data-is-today:flex in-data-is-today:size-6 in-data-is-today:items-center in-data-is-today:justify-center in-data-is-today:rounded-full in-data-is-today:bg-indigo-500 in-data-is-today:font-semibold in-data-is-today:text-white in-data-is-selected:in-data-is-today:ring-2 in-data-is-selected:in-data-is-today:ring-white"
                >{{ day.date.split('-').pop()!.replace(/^0/, '') }}</time
              >
              <ol v-if="day.events.length > 0" class="mt-2">
                <li v-for="event in day.events.slice(0, 2)" :key="event.id">
                  <a :href="event.href" class="group flex" @click.stop>
                    <p class="flex-auto truncate font-medium text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {{ event.name }}
                    </p>
                    <time
                      :datetime="event.datetime"
                      class="ml-3 hidden flex-none text-gray-500 group-hover:text-indigo-600 dark:text-gray-400 dark:group-hover:text-indigo-400 xl:block"
                      >{{ event.time }}</time
                    >
                  </a>
                </li>
                <li v-if="day.events.length > 2" class="text-gray-500 dark:text-gray-400">
                  + {{ day.events.length - 2 }} más
                </li>
              </ol>
            </div>
          </div>

          <div class="isolate grid w-full grid-cols-7 grid-rows-6 gap-px lg:hidden">
            <button
              v-for="day in days"
              :key="day.date"
              type="button"
              :data-is-current-month="day.isCurrentMonth ? '' : undefined"
              :data-is-selected="day.isSelected ? '' : undefined"
              :data-is-today="day.isToday ? '' : undefined"
              class="group relative flex h-14 flex-col bg-white px-3 py-2 not-data-is-current-month:bg-gray-50 not-data-is-selected:not-data-is-current-month:not-data-is-today:text-gray-400 not-data-is-current-month:before:pointer-events-none not-data-is-current-month:before:absolute not-data-is-current-month:before:inset-0 not-data-is-current-month:before:bg-gray-100/90 hover:bg-gray-50 focus:z-10 data-is-current-month:bg-white data-is-selected:font-semibold data-is-selected:text-indigo-700 data-is-today:font-semibold not-data-is-selected:data-is-today:text-indigo-600 dark:bg-gray-900 dark:not-data-is-current-month:bg-gray-950 dark:not-data-is-current-month:before:bg-gray-950/80 dark:hover:bg-gray-900/80 dark:data-is-current-month:bg-gray-900 dark:not-data-is-selected:data-is-current-month:not-data-is-today:text-gray-200 dark:data-is-selected:text-white dark:not-data-is-selected:data-is-today:text-indigo-400"
              @click="selectDay(day.date)"
            >
              <time
                :datetime="day.date"
                class="ml-auto group-not-data-is-current-month:opacity-60 in-data-is-selected:flex in-data-is-selected:size-6 in-data-is-selected:items-center in-data-is-selected:justify-center in-data-is-selected:rounded-full in-data-is-selected:not-in-data-is-today:bg-indigo-100 in-data-is-selected:not-in-data-is-today:text-gray-900 in-data-is-selected:in-data-is-today:bg-indigo-500 in-data-is-selected:in-data-is-today:text-white dark:in-data-is-selected:not-in-data-is-today:bg-white dark:in-data-is-selected:not-in-data-is-today:text-gray-900"
                >{{ day.date.split('-').pop()!.replace(/^0/, '') }}</time
              >
              <span class="sr-only">{{ day.events.length }} eventos</span>
              <span v-if="day.events.length > 0" class="-mx-0.5 mt-auto flex flex-wrap-reverse">
                <span v-for="event in day.events" :key="event.id" class="mx-0.5 mb-1 size-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="relative border-t border-gray-200 bg-gray-50 px-4 py-6 after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gray-200 sm:px-6 lg:hidden dark:border-white/10 dark:bg-gray-950 dark:after:bg-white/10"
      >
        <ol
          v-if="mobileEvents.length > 0"
          class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white text-sm shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-gray-800/80 dark:outline-1 dark:-outline-offset-1 dark:outline-white/10"
        >
          <li
            v-for="event in mobileEvents"
            :key="`${event.id}-${event.dayDate}`"
            class="group flex p-4 pr-6 focus-within:bg-gray-50 hover:bg-gray-50 dark:focus-within:bg-white/5 dark:hover:bg-white/5"
          >
            <div class="flex-auto">
              <p class="font-semibold text-gray-900 dark:text-white">{{ event.name }}</p>
              <time :datetime="event.datetime" class="mt-2 flex items-center text-gray-600 dark:text-gray-300">
                <ClockIcon class="mr-2 size-5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                {{ event.time }}
              </time>
            </div>
            <a
              :href="event.href"
              class="ml-6 flex-none self-center rounded-md border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-800 opacity-0 shadow-sm ring-inset group-hover:opacity-100 hover:bg-gray-50 focus:opacity-100 dark:border-transparent dark:bg-white/10 dark:text-white dark:opacity-0 dark:ring-1 dark:ring-white/10 dark:hover:bg-white/20"
              >Editar<span class="sr-only">, {{ event.name }}</span></a
            >
          </li>
        </ol>
        <p v-else class="text-center text-sm text-gray-500 dark:text-gray-400">No hay eventos este mes.</p>
      </div>
    </div>
  </div>
</template>
