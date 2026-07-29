<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarDaysIcon, CheckCircleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import {
  useCalendarioSearch,
  type CalendarioSearchResult,
} from '@/composables/useCalendarioSearch'
import { useCalendarioSearchFocus } from '@/composables/useCalendarioSearchFocus'
import { gcalPillBorder } from '@/utils/calendarioGoogleTheme'

defineOptions({ name: 'CalendarioSearch' })

const query = ref('')
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const { search, formatResultDate, indexSize } = useCalendarioSearch()
const { requestSearchFocus } = useCalendarioSearchFocus()

const results = computed(() => search(query.value))
const hasQuery = computed(() => query.value.trim().length > 0)
const showPanel = computed(() => open.value && hasQuery.value)

const groupedResults = computed(() => {
  const past: CalendarioSearchResult[] = []
  const upcoming: CalendarioSearchResult[] = []
  for (const item of results.value) {
    if (item.isPast) past.push(item)
    else upcoming.push(item)
  }
  return { past, upcoming }
})

function onFocus(): void {
  open.value = true
}

function closePanel(): void {
  open.value = false
}

function clearQuery(): void {
  query.value = ''
  inputRef.value?.focus()
}

function selectResult(item: CalendarioSearchResult): void {
  requestSearchFocus({ type: item.type, id: item.id, date: item.date })
  query.value = ''
  closePanel()
  inputRef.value?.blur()
}

function onDocumentClick(event: MouseEvent): void {
  if (!rootRef.value?.contains(event.target as Node)) {
    closePanel()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentClick)
})

watch(query, (value) => {
  if (value.trim()) open.value = true
})
</script>

<template>
  <div ref="rootRef" class="relative w-52 shrink-0 sm:w-64">
    <div
      :class="[
        gcalPillBorder,
        'flex h-10 items-center gap-2 rounded-full bg-gray-50 px-3 transition-colors dark:bg-gray-800/80',
        open ? 'border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-500/40 dark:ring-indigo-500/15' : '',
      ]"
    >
      <MagnifyingGlassIcon class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        class="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
        placeholder="Buscar…"
        @focus="onFocus"
        @keydown.esc.prevent="clearQuery(); closePanel(); inputRef?.blur()"
      />
      <button
        v-if="hasQuery"
        type="button"
        class="shrink-0 rounded-full p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Limpiar búsqueda"
        @click="clearQuery"
      >
        <XMarkIcon class="size-3.5" aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="showPanel"
      class="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
    >
      <div v-if="!results.length" class="px-4 py-8 text-center">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Sin resultados</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Probá con otras palabras en título, descripción, tipo o persona asignada.
        </p>
      </div>

      <div v-else class="max-h-[min(24rem,60vh)] overflow-y-auto py-2">
        <template v-if="groupedResults.upcoming.length">
          <p class="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Próximos y de hoy
          </p>
          <ul>
            <li v-for="item in groupedResults.upcoming" :key="`${item.type}-${item.id}`">
              <button
                type="button"
                class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                @click="selectResult(item)"
              >
                <span
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
                  :class="
                    item.type === 'event'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                  "
                >
                  <CalendarDaysIcon v-if="item.type === 'event'" class="size-4" aria-hidden="true" />
                  <CheckCircleIcon v-else class="size-4" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ item.title }}
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ formatResultDate(item.date) }} · {{ item.subtitle }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </template>

        <template v-if="groupedResults.past.length">
          <p
            class="mt-1 border-t border-gray-100 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:border-white/5 dark:text-gray-400"
          >
            Pasados
          </p>
          <ul>
            <li v-for="item in groupedResults.past" :key="`${item.type}-${item.id}`">
              <button
                type="button"
                class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                @click="selectResult(item)"
              >
                <span
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                >
                  <CalendarDaysIcon v-if="item.type === 'event'" class="size-4" aria-hidden="true" />
                  <CheckCircleIcon v-else class="size-4" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ item.title }}
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ formatResultDate(item.date) }} · {{ item.subtitle }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </template>
      </div>

      <p class="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-white/5 dark:text-gray-500">
        {{ indexSize }} ítems en el calendario
      </p>
    </div>
  </div>
</template>
