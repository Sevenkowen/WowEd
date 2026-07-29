<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import CalendarioSearch from '@/components/calendario/CalendarioSearch.vue'
import {
  gcalPillBorder,
  gcalToolbarBtn,
  gcalToolbarIconBtn,
  gcalToggleActive,
  gcalToggleIdle,
} from '@/utils/calendarioGoogleTheme'

defineOptions({ name: 'CalendarioEscolarHeaderActions' })

const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  refresh: []
}>()

const views: { id: CalendarioDisplayView; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
]

const viewLabel = computed(
  () => views.find((v) => v.id === displayView.value)?.label ?? 'Mes',
)

function pickView(id: CalendarioDisplayView): void {
  displayView.value = id
  contentMode.value = 'calendario'
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
    <CalendarioSearch />
    <Menu as="div" class="relative">
      <MenuButton
        type="button"
        :class="[
          gcalToolbarBtn,
          gcalPillBorder,
          'gap-1 rounded-full bg-white px-4 text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-white/10',
        ]"
      >
        {{ viewLabel }}
        <ChevronDownIcon class="size-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
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
          class="absolute right-0 z-20 mt-1 w-36 origin-top-right overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-gray-800"
        >
          <MenuItem v-for="v in views" :key="v.id" v-slot="{ active }">
            <button
              type="button"
              :class="[
                active ? 'bg-gray-50 dark:bg-white/10' : '',
                displayView === v.id
                  ? 'font-medium text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-800 dark:text-gray-200',
                'block w-full px-4 py-2 text-left text-sm',
              ]"
              @click="pickView(v.id)"
            >
              {{ v.label }}
            </button>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>

    <div
      :class="[gcalPillBorder, 'inline-flex h-10 shrink-0 overflow-hidden rounded-full']"
      role="group"
      aria-label="Mostrar calendario o tareas"
    >
      <button
        type="button"
        :class="[
          gcalToolbarIconBtn,
          contentMode === 'calendario' ? gcalToggleActive : gcalToggleIdle,
        ]"
        :aria-pressed="contentMode === 'calendario'"
        aria-label="Vista calendario"
        @click="contentMode = 'calendario'"
      >
        <CalendarDaysIcon class="size-[1.125rem] shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="[
          gcalToolbarIconBtn,
          'border-l border-gray-200 dark:border-white/20',
          contentMode === 'tareas' ? gcalToggleActive : gcalToggleIdle,
        ]"
        :aria-pressed="contentMode === 'tareas'"
        aria-label="Vista tareas"
        @click="contentMode = 'tareas'"
      >
        <CheckCircleIcon class="size-[1.125rem] shrink-0" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      :class="[
        gcalToolbarBtn,
        'rounded-full bg-indigo-50 px-4 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-white/10 dark:text-indigo-400 dark:hover:bg-white/15',
      ]"
      @click="$emit('refresh')"
    >
      Actualizar
    </button>
  </div>
</template>
