<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { CheckIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/vue/24/outline'
import { colorMode, setColorMode } from '@/composables/colorMode'

const options = [
  { mode: 'light' as const, label: 'Modo día', icon: SunIcon },
  { mode: 'dark' as const, label: 'Modo noche', icon: MoonIcon },
  { mode: 'system' as const, label: 'Automático (sistema)', icon: ComputerDesktopIcon },
]

const currentIcon = computed(() => {
  const m = colorMode.value
  if (m === 'light') return SunIcon
  if (m === 'dark') return MoonIcon
  return ComputerDesktopIcon
})
</script>

<template>
  <Menu as="div" class="relative">
    <MenuButton
      type="button"
      class="relative -m-2.5 flex size-10 items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-white"
      aria-label="Tema de la interfaz"
    >
      <span class="sr-only">Elegir tema</span>
      <component :is="currentIcon" class="size-6" aria-hidden="true" />
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
        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-gray-900/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
      >
        <MenuItem v-for="opt in options" :key="opt.mode" v-slot="{ active }">
          <button
            type="button"
            :class="[
              active ? 'bg-gray-50 dark:bg-white/5' : '',
              'flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-900 dark:text-white',
            ]"
            @click="setColorMode(opt.mode)"
          >
            <component :is="opt.icon" class="size-5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span class="flex-1">{{ opt.label }}</span>
            <CheckIcon v-if="colorMode === opt.mode" class="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          </button>
        </MenuItem>
      </MenuItems>
    </transition>
  </Menu>
</template>
