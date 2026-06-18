<script setup lang="ts">
import { gcalNowLine } from '@/utils/calendarioGoogleTheme'

defineOptions({ name: 'CalendarioNowLineOverlay' })

defineProps<{
  show: boolean
  topPercent: number
  label: string
}>()
</script>

<template>
  <div
    v-if="show"
    class="pointer-events-none absolute inset-x-0 z-[10] flex -translate-y-1/2 items-center"
    :style="{ top: `${topPercent}%` }"
    role="presentation"
    :aria-label="`Hora actual: ${label}`"
  >
    <div class="w-[3.5rem] shrink-0" aria-hidden="true" />
    <div :class="gcalNowLine" aria-hidden="true" />
  </div>
</template>
