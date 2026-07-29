<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'

export interface FormMultiSelectOption {
  key: string
  label: string
  disabled?: boolean
}

const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    options: FormMultiSelectOption[]
    disabled?: boolean
    placeholder?: string
    icon?: Component
    countLabel?: string
  }>(),
  {
    disabled: false,
    placeholder: 'Seleccionar…',
    countLabel: 'roles seleccionados',
  },
)

const optionByKey = computed(() => new Map(props.options.map((option) => [option.key, option])))

const displayText = computed(() => {
  if (!model.value.length) return props.placeholder
  if (model.value.length === 1) {
    const key = model.value[0]
    return optionByKey.value.get(key)?.label ?? key
  }
  return `${model.value.length} ${props.countLabel}`
})
</script>

<template>
  <Listbox v-model="model" multiple as="div" :disabled="disabled">
    <div class="relative">
      <component
        v-if="icon"
        :is="icon"
        class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        aria-hidden="true"
      />
      <ListboxButton
        class="form-field relative w-full cursor-pointer pr-10 text-left disabled:cursor-not-allowed disabled:opacity-60"
        :class="[!model.length ? 'text-gray-500 dark:text-gray-400' : '', icon ? '!pl-10' : '']"
      >
        <span class="block truncate">{{ displayText }}</span>
        <ChevronUpDownIcon
          class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
      </ListboxButton>
      <ListboxOptions
        class="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800"
      >
        <ListboxOption
          v-for="option in options"
          :key="option.key"
          v-slot="{ active, selected, disabled: optionDisabled }"
          :value="option.key"
          :disabled="option.disabled"
          as="template"
        >
          <li
            class="flex items-center gap-2.5 px-3 py-2 text-sm select-none"
            :class="
              optionDisabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                : active
                  ? 'cursor-pointer bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                  : 'cursor-pointer text-gray-900 dark:text-gray-100'
            "
          >
            <span
              class="flex size-4 shrink-0 items-center justify-center rounded border"
              :class="
                selected
                  ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                  : 'border-gray-300 dark:border-white/20'
              "
            >
              <CheckIcon v-if="selected" class="size-3" aria-hidden="true" />
            </span>
            <span :class="selected ? 'font-medium' : ''">{{ option.label }}</span>
          </li>
        </ListboxOption>
        <li
          v-if="!options.length"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
        >
          No hay opciones disponibles
        </li>
      </ListboxOptions>
    </div>
  </Listbox>
</template>
