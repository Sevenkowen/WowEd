<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import SidebarNavigation from '@/components/SidebarNavigation.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const sidebarOpen = ref(false)

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
</script>

<template>
  <div class="h-full">
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

    <div class="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div
        class="scrollbar-sidebar flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-white/10 dark:bg-black/10"
      >
        <div class="flex h-16 shrink-0 items-center">
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
    </div>

    <div class="lg:pl-72">
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

        <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <form class="grid flex-1 grid-cols-1" action="#" method="GET">
            <input
              name="search"
              aria-label="Buscar"
              class="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              placeholder="Buscar…"
            />
            <MagnifyingGlassIcon
              class="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400"
              aria-hidden="true"
            />
          </form>
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

      <main class="py-8 sm:py-10">
        <div class="w-full px-4 sm:px-8 lg:px-10">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
