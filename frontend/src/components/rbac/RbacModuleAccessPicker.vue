<script setup lang="ts">
import { computed } from 'vue'
import {
  modulesGroupedByCategory,
  type ModuleScopeKind,
} from '@/data/moduleAccessRegistry'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    readonly?: boolean
    /** Si se define, solo muestra módulos de esos ámbitos */
    scopeFilter?: ModuleScopeKind[]
  }>(),
  {
    readonly: false,
    scopeFilter: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const groups = computed(() => modulesGroupedByCategory(props.scopeFilter))

const selected = computed(() => new Set(props.modelValue))

function toggle(key: string): void {
  if (props.readonly) return
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  emit('update:modelValue', [...next])
}

function selectAllInGroup(keys: string[]): void {
  if (props.readonly) return
  const next = new Set(selected.value)
  for (const key of keys) next.add(key)
  emit('update:modelValue', [...next])
}

function clearAllInGroup(keys: string[]): void {
  if (props.readonly) return
  const remove = new Set(keys)
  emit('update:modelValue', props.modelValue.filter((k) => !remove.has(k)))
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="group in groups"
      :key="group.category.key"
      class="rounded-lg border border-gray-200 dark:border-white/10"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-white/10 dark:bg-gray-950/40">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ group.category.label }}</h4>
        <div v-if="!readonly" class="flex gap-2 text-xs">
          <button
            type="button"
            class="text-indigo-600 hover:underline dark:text-indigo-400"
            @click="selectAllInGroup(group.modules.map((m) => m.key))"
          >
            Todos
          </button>
          <button
            type="button"
            class="text-muted hover:underline"
            @click="clearAllInGroup(group.modules.map((m) => m.key))"
          >
            Ninguno
          </button>
        </div>
      </div>
      <ul class="grid gap-2 p-3 sm:grid-cols-2">
        <li v-for="mod in group.modules" :key="mod.key">
          <label
            class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            :class="[
              readonly ? 'cursor-default opacity-90' : 'hover:bg-gray-50 dark:hover:bg-white/5',
              selected.has(mod.key) ? 'text-gray-900 dark:text-white' : 'text-muted',
            ]"
          >
            <input
              type="checkbox"
              class="mt-0.5 size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-70"
              :checked="selected.has(mod.key)"
              :disabled="readonly"
              @change="toggle(mod.key)"
            />
            <span class="min-w-0 leading-snug">{{ mod.label }}</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>
