<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-4 text-gray-900 dark:text-gray-100 lg:px-5 lg:py-5">
      <RouterView />
    </div>
  </div>
</template>
