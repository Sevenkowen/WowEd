<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { gcalBorder, gcalHoyBtn, gcalNavIconBtn, gcalTitle } from '@/utils/calendarioGoogleTheme'
import CalendarioEscolarHeaderActions from '@/components/calendario/CalendarioEscolarHeaderActions.vue'

defineOptions({ name: 'CalendarioEscolarNavToolbar' })

defineProps<{
  title: string
  datetime?: string
  subtitle?: string
  /** Oculta Hoy y flechas (p. ej. pantalla de tareas). */
  hideDateNav?: boolean
}>()

const displayView = defineModel<CalendarioDisplayView>('displayView', { required: true })
const contentMode = defineModel<CalendarioContentMode>('contentMode', { default: 'calendario' })

defineEmits<{
  prev: []
  next: []
  today: []
  refresh: []
}>()
</script>

<template>
  <header
    class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-white px-2 py-2 sm:gap-3 sm:px-4 dark:bg-[#202124]"
    :class="gcalBorder"
  >
    <div class="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
      <template v-if="!hideDateNav">
        <button type="button" :class="gcalHoyBtn" @click="$emit('today')">Hoy</button>
        <button type="button" :class="gcalNavIconBtn" @click="$emit('prev')">
          <span class="sr-only">Anterior</span>
          <ChevronLeftIcon class="size-5" aria-hidden="true" />
        </button>
        <button type="button" :class="gcalNavIconBtn" @click="$emit('next')">
          <span class="sr-only">Siguiente</span>
          <ChevronRightIcon class="size-5" aria-hidden="true" />
        </button>
      </template>
      <div :class="['min-w-0', hideDateNav ? '' : 'pl-1 sm:pl-2']">
        <h1 :class="gcalTitle">
          <time v-if="datetime" :datetime="datetime">{{ title }}</time>
          <span v-else>{{ title }}</span>
        </h1>
        <p v-if="subtitle" class="truncate text-xs capitalize text-[#70757a] dark:text-gray-400">
          {{ subtitle }}
        </p>
      </div>
    </div>
    <CalendarioEscolarHeaderActions
      v-model:display-view="displayView"
      v-model:content-mode="contentMode"
      @refresh="$emit('refresh')"
    />
  </header>
</template>
