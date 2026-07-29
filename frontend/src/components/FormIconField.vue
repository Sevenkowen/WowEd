<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    icon?: Component
    htmlFor?: string
    colSpan?: 1 | 2
    /** Perfil RBAC: etiqueta apilada sobre el valor dentro del contenedor. */
    labelPosition?: 'outside' | 'inside'
  }>(),
  { colSpan: 1, labelPosition: 'outside' },
)
</script>

<template>
  <div class="block" :class="colSpan === 2 ? 'sm:col-span-2' : ''">
    <template v-if="labelPosition === 'inside'">
      <div
        class="flex min-h-[3.75rem] overflow-hidden rounded-lg border border-gray-300 bg-white transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-white/10 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-500/20"
      >
        <div
          class="flex w-11 shrink-0 items-center justify-center border-r border-gray-200 dark:border-white/10"
          aria-hidden="true"
        >
          <component
            v-if="icon"
            :is="icon"
            class="size-5 text-gray-400 dark:text-gray-500"
          />
        </div>
        <div class="relative flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
          <label
            v-if="label && htmlFor"
            :for="htmlFor"
            class="text-xs leading-tight text-gray-500 dark:text-gray-400"
          >
            {{ label }}
          </label>
          <span
            v-else-if="label"
            class="text-xs leading-tight text-gray-500 dark:text-gray-400"
          >
            {{ label }}
          </span>
          <slot />
        </div>
      </div>
    </template>

    <template v-else>
      <label v-if="label && htmlFor" :for="htmlFor" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
      </label>
      <span v-else-if="label" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
      </span>
      <div class="relative">
        <component
          v-if="icon"
          :is="icon"
          class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <slot />
      </div>
    </template>
  </div>
</template>
