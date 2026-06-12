<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { Bars3Icon, BellIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import SidebarNavigation from '@/components/SidebarNavigation.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useSidebarCollapsed } from '@/composables/useSidebarCollapsed'

const route = useRoute()
const sidebarOpen = ref(false)
const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed()

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  },
)

const userNavigation = [
  { name: 'Tu perfil', href: '#' },
  { name: 'Cerrar sesión', href: '#' },
]

const isFlushContent = computed(() => Boolean(route.meta.flushContent))
</script>

<template>
  <div class="h-full min-h-0">
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to=""
          leave="transition-opacity ease-linear duration-300"
          leave-from=""
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80"></div>
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to=""
                leave="ease-in-out duration-300"
                leave-from=""
                leave-to="opacity-0"
              >
                <div class="absolute top-0 left-full flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Cerrar menú</span>
                    <XMarkIcon class="size-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <div
                class="scrollbar-sidebar relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 dark:bg-gray-900 dark:ring dark:ring-white/10 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10"
              >
                <div class="relative flex h-16 shrink-0 items-center">
                  <div
                    class="rounded-lg bg-slate-950 px-3 py-2 shadow-inner ring-1 ring-black/20 dark:bg-transparent dark:px-0 dark:py-0 dark:shadow-none dark:ring-0"
                  >
                    <img
                      src="/wowed-logo.png"
                      alt="WowEd"
                      class="h-9 w-auto max-w-[11rem] object-contain object-left sm:h-10"
                      width="176"
                      height="56"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <SidebarNavigation />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <div
      class="hidden bg-gray-900 transition-[width] duration-200 ease-in-out lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col"
      :class="sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-72'"
    >
      <div
        class="scrollbar-sidebar flex grow flex-col overflow-y-auto border-r border-gray-200 bg-white pb-4 dark:border-white/10 dark:bg-black/10"
        :class="sidebarCollapsed ? 'gap-y-4 px-2' : 'gap-y-5 px-6'"
      >
        <div
          class="flex h-16 shrink-0 items-center"
          :class="sidebarCollapsed ? 'justify-center' : ''"
        >
          <div
            v-if="!sidebarCollapsed"
            class="rounded-lg bg-slate-950 px-3 py-2 shadow-inner ring-1 ring-black/20 dark:bg-transparent dark:px-0 dark:py-0 dark:shadow-none dark:ring-0"
          >
            <img
              src="/wowed-logo.png"
              alt="WowEd"
              class="h-9 w-auto max-w-[11rem] object-contain object-left sm:h-10"
              width="176"
              height="56"
              loading="lazy"
              decoding="async"
            />
          </div>
          <img
            v-else
            src="/wowed-logo.png"
            alt="WowEd"
            class="h-8 w-8 object-contain"
            width="32"
            height="32"
            loading="lazy"
            decoding="async"
          />
        </div>
        <SidebarNavigation :collapsed="sidebarCollapsed" />
        <div class="mt-auto shrink-0 border-t border-gray-200 pt-3 dark:border-white/10">
          <button
            type="button"
            class="flex w-full items-center rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            :class="sidebarCollapsed ? 'justify-center' : 'gap-x-3'"
            :title="sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'"
            @click="toggleSidebar"
          >
            <ChevronDoubleLeftIcon v-if="!sidebarCollapsed" class="size-5 shrink-0" aria-hidden="true" />
            <ChevronDoubleRightIcon v-else class="size-5 shrink-0" aria-hidden="true" />
            <span v-if="!sidebarCollapsed" class="text-sm font-medium">Contraer menú</span>
          </button>
        </div>
      </div>
    </div>

    <div
      class="flex h-full min-h-0 flex-col transition-[padding] duration-200 ease-in-out"
      :class="sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-72'"
    >
      <div
        class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-gray-900 dark:shadow-none"
      >
        <button
          type="button"
          class="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:text-white"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">Abrir menú</span>
          <Bars3Icon class="size-6" aria-hidden="true" />
        </button>

        <div class="h-6 w-px bg-gray-200 lg:hidden dark:bg-white/10" aria-hidden="true"></div>

        <div class="flex flex-1 items-center justify-end gap-x-4 self-stretch lg:gap-x-6">
          <div class="flex items-center gap-x-4 lg:gap-x-6">
            <button type="button" class="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-white">
              <span class="sr-only">Notificaciones</span>
              <BellIcon class="size-6" aria-hidden="true" />
            </button>

            <ThemeToggle />

            <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-white/10" aria-hidden="true"></div>

            <Menu as="div" class="relative">
              <MenuButton class="relative flex items-center">
                <span class="absolute -inset-1.5"></span>
                <span class="sr-only">Menú de usuario</span>
                <img
                  class="size-8 rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                />
                <span class="hidden lg:flex lg:items-center">
                  <span class="ml-4 text-sm/6 font-semibold text-gray-900 dark:text-white" aria-hidden="true"
                    >Usuario</span
                  >
                  <ChevronDownIcon class="ml-2 size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                </span>
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
                  class="absolute right-0 z-10 mt-2.5 w-40 origin-top-right rounded-md bg-white py-2 shadow-lg outline-1 outline-gray-900/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
                >
                  <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                    <a
                      :href="item.href"
                      :class="[
                        active ? 'bg-gray-50 outline-hidden dark:bg-white/5' : '',
                        'block px-3 py-1 text-sm/6 text-gray-900 dark:text-white',
                      ]"
                      >{{ item.name }}</a
                    >
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>

      <main
        class="flex min-h-0 flex-1 flex-col"
        :class="isFlushContent ? 'overflow-hidden py-0' : 'py-8 sm:py-10'"
      >
        <div
          class="flex min-h-0 w-full flex-1 flex-col"
          :class="isFlushContent ? 'overflow-hidden' : 'px-4 sm:px-8 lg:px-10'"
        >
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
