<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon, EllipsisHorizontalIcon } from '@heroicons/vue/20/solid'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import type { CalendarioDisplayView } from '@/utils/calendarioDates'

defineOptions({ name: 'CalendarioViewMenu' })

const displayView = defineModel<CalendarioDisplayView>('displayView', { default: 'mes' })

const emit = defineEmits<{
  (e: 'create-event'): void
  (e: 'go-today'): void
}>()

const views: { id: CalendarioDisplayView; label: string }[] = [
  { id: 'dia', label: 'Vista día' },
  { id: 'semana', label: 'Vista semana' },
  { id: 'mes', label: 'Vista mes' },
  { id: 'anio', label: 'Vista año' },
]

const menuButtonLabel = computed(() => {
  switch (displayView.value) {
    case 'dia':
      return 'Vista día'
    case 'semana':
      return 'Vista semana'
    case 'anio':
      return 'Vista año'
    default:
      return 'Vista mensual'
  }
})

function pickView(id: CalendarioDisplayView) {
  displayView.value = id
}
</script>

<template>
  <div>
    <div class="hidden items-center md:ml-2 md:flex md:flex-wrap md:gap-3">
      <Menu as="div" class="relative">
        <MenuButton
          type="button"
          class="flex items-center gap-x-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-transparent dark:bg-white/10 dark:text-white dark:ring-1 dark:ring-inset dark:ring-white/10 dark:hover:bg-white/20"
        >
          {{ menuButtonLabel }}
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
            <MenuItem v-for="v in views" :key="v.id" v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                  displayView === v.id ? 'font-semibold' : 'font-normal',
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
      <div class="hidden h-6 w-px bg-gray-200 md:block dark:bg-white/10"></div>
      <button
        type="button"
        class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        @click="emit('create-event')"
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
              <button
                type="button"
                :class="[
                  active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                  'block w-full px-4 py-2 text-left text-sm',
                ]"
                @click="emit('create-event')"
              >
                Crear evento
              </button>
            </MenuItem>
          </div>
          <div class="py-1">
            <MenuItem v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                  'block w-full px-4 py-2 text-left text-sm',
                ]"
                @click="emit('go-today')"
              >
                Ir a hoy
              </button>
            </MenuItem>
          </div>
          <div class="py-1">
            <MenuItem v-for="v in views" :key="v.id" v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300',
                  displayView === v.id ? 'font-semibold' : 'font-normal',
                  'block w-full px-4 py-2 text-left text-sm',
                ]"
                @click="pickView(v.id)"
              >
                {{ v.label }}
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>
