<script setup lang="ts">
import { computed } from 'vue'
import type { CalAssignee } from '@/data/calendarioEscolarTypes'

defineOptions({ name: 'CalendarioAssigneeChip' })

const props = defineProps<{
  person: CalAssignee
}>()

const isInactive = computed(() => props.person.active === false)

const INACTIVE_ASSIGNEE_TITLE = 'Este usuario ya no pertenece a la institución'
</script>

<template>
  <span
    :title="isInactive ? INACTIVE_ASSIGNEE_TITLE : undefined"
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="
      isInactive
        ? 'cursor-help border border-dashed border-gray-300 bg-gray-100 text-gray-500 line-through dark:border-white/15 dark:bg-white/5 dark:text-gray-400'
        : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200'
    "
  >
    {{ person.displayName }}
  </span>
</template>
