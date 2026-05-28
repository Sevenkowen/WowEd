<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'

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

const pillBorder = 'border border-[#dadce0] dark:border-white/20'
const toggleActive =
  'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]'
const toggleIdle =
  'bg-white text-[#5f6368] hover:bg-[#f1f3f4] dark:bg-[#292a2d] dark:text-gray-300 dark:hover:bg-white/10'

function pickView(id: CalendarioDisplayView): void {
  displayView.value = id
  contentMode.value = 'calendario'
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
    <Menu as="div" class="relative">
      <MenuButton
        type="button"
        :class="[
          pillBorder,
          'inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#f1f3f4] dark:bg-[#292a2d] dark:text-gray-100 dark:hover:bg-white/10',
        ]"
      >
        {{ viewLabel }}
        <ChevronDownIcon class="size-4 text-[#5f6368] dark:text-gray-400" aria-hidden="true" />
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
          class="absolute right-0 z-20 mt-1 w-36 origin-top-right overflow-hidden rounded-lg border border-[#dadce0] bg-white py-1 shadow-lg dark:border-white/15 dark:bg-[#292a2d]"
        >
          <MenuItem v-for="v in views" :key="v.id" v-slot="{ active }">
            <button
              type="button"
              :class="[
                active ? 'bg-[#f1f3f4] dark:bg-white/10' : '',
                displayView === v.id ? 'font-medium text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-[#3c4043] dark:text-gray-200',
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
      :class="[pillBorder, 'inline-flex overflow-hidden rounded-full']"
      role="group"
      aria-label="Mostrar calendario o tareas"
    >
      <button
        type="button"
        :class="[
          'flex size-9 items-center justify-center sm:size-10',
          contentMode === 'calendario' ? toggleActive : toggleIdle,
        ]"
        :aria-pressed="contentMode === 'calendario'"
        aria-label="Vista calendario"
        @click="contentMode = 'calendario'"
      >
        <CalendarDaysIcon class="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="[
          'flex size-9 items-center justify-center border-l border-[#dadce0] sm:size-10 dark:border-white/20',
          contentMode === 'tareas' ? toggleActive : toggleIdle,
        ]"
        :aria-pressed="contentMode === 'tareas'"
        aria-label="Vista tareas"
        @click="contentMode = 'tareas'"
      >
        <CheckCircleIcon class="size-5" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      class="rounded-full bg-[#e8f0fe] px-4 py-2 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#d2e3fc] dark:bg-[#394457] dark:text-[#8ab4f8] dark:hover:bg-[#4a5568]"
      @click="$emit('refresh')"
    >
      Actualizar
    </button>
  </div>
</template>
