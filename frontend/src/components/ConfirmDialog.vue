<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    confirmLabel?: string
    cancelLabel?: string
    loadingLabel?: string
    loading?: boolean
    destructive?: boolean
    error?: string | null
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
    destructive: true,
    error: null,
  },
)

const emit = defineEmits<{
  confirm: []
}>()

function close() {
  if (props.loading) return
  open.value = false
}

function onConfirm() {
  emit('confirm')
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-[60]" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/50 dark:bg-black/60" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div class="flex min-h-full items-center justify-center">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex size-11 shrink-0 items-center justify-center rounded-xl"
                  :class="
                    destructive
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                  "
                >
                  <ExclamationTriangleIcon class="size-6" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1">
                  <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ title }}
                  </DialogTitle>
                  <div class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    <slot />
                  </div>
                  <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
                </div>
              </div>

              <div class="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  :disabled="loading"
                  class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                  @click="close"
                >
                  {{ cancelLabel }}
                </button>
                <button
                  type="button"
                  :disabled="loading"
                  class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  :class="
                    destructive
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  "
                  @click="onConfirm"
                >
                  {{ loading ? (loadingLabel ?? `${confirmLabel}…`) : confirmLabel }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
