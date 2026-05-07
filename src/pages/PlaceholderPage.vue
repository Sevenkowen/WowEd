<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Página')
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{{ title }}</h1>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Contenido pendiente.</p>
  </div>
</template>
