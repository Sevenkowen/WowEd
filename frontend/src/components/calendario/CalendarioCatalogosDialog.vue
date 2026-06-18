<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { useCalendarioCatalogs } from '@/composables/useCalendarioCatalogs'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { EVENT_COLOR_PRESETS, type CalendarioCatalogItem } from '@/data/calendarioCatalogDefaults'
import { gcalBorder, gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

type CatalogTab = 'eventos' | 'tareas'

defineOptions({ name: 'CalendarioCatalogosDialog' })

const open = defineModel<boolean>('open', { default: false })

const {
  eventTypeOptions,
  taskTipoOptions,
  addEventType,
  updateEventType,
  removeEventType,
  addTaskTipo,
  updateTaskTipo,
  removeTaskTipo,
  resetEventTypes,
  resetTaskTipos,
} = useCalendarioCatalogs()

const { porFecha: eventosPorFecha } = useCalendarioEscolarEvents()
const { todasLasTareas } = useCalendarioEscolarTasks()

const tab = ref<CatalogTab>('eventos')
const formError = ref('')
const editingId = ref<string | null>(null)
const draftName = ref('')
const draftColor = ref<string>(EVENT_COLOR_PRESETS[0])

const usedEventTypeNames = computed(() => {
  const names = new Set<string>()
  for (const list of Object.values(eventosPorFecha.value)) {
    for (const ev of list) {
      if (ev.eventType) names.add(ev.eventType)
    }
  }
  return [...names]
})

const usedTaskTipoNames = computed(() => {
  const names = new Set<string>()
  for (const task of todasLasTareas.value) {
    if (task.tipo) names.add(task.tipo)
  }
  return [...names]
})

const activeItems = computed(() =>
  tab.value === 'eventos' ? eventTypeOptions.value : taskTipoOptions.value,
)

function close() {
  open.value = false
  resetForm()
}

function resetForm() {
  formError.value = ''
  editingId.value = null
  draftName.value = ''
  draftColor.value = EVENT_COLOR_PRESETS[0]
}

function startEdit(item: CalendarioCatalogItem) {
  editingId.value = item.id
  draftName.value = item.name
  draftColor.value = item.color ?? EVENT_COLOR_PRESETS[0]
  formError.value = ''
}

function cancelEdit() {
  resetForm()
}

async function saveItem() {
  formError.value = ''
  if (tab.value === 'eventos') {
    const err = editingId.value
      ? await updateEventType(editingId.value, draftName.value, draftColor.value)
      : await addEventType(draftName.value, draftColor.value)
    if (err) {
      formError.value = err
      return
    }
  } else {
    const err = editingId.value
      ? await updateTaskTipo(editingId.value, draftName.value)
      : await addTaskTipo(draftName.value)
    if (err) {
      formError.value = err
      return
    }
  }
  resetForm()
}

async function deleteItem(item: CalendarioCatalogItem) {
  formError.value = ''
  const err =
    tab.value === 'eventos'
      ? await removeEventType(item.id, usedEventTypeNames.value)
      : await removeTaskTipo(item.id, usedTaskTipoNames.value)
  if (err) {
    formError.value = err
    return
  }
  if (editingId.value === item.id) resetForm()
}

async function restoreDefaults() {
  formError.value = ''
  if (tab.value === 'eventos') await resetEventTypes()
  else await resetTaskTipos()
  resetForm()
}

watch(tab, () => resetForm())
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex items-start justify-between gap-4 border-b px-5 py-4 dark:border-white/10">
                <div>
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Tipos de eventos y tareas
                  </DialogTitle>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Estas listas aparecen al crear o editar actividades en el calendario.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="close"
                >
                  <span class="sr-only">Cerrar</span>
                  <XMarkIcon class="size-5" aria-hidden="true" />
                </button>
              </div>

              <div class="flex border-b dark:border-white/10">
                <button
                  type="button"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                  :class="
                    tab === 'eventos'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  "
                  @click="tab = 'eventos'"
                >
                  Tipos de evento
                </button>
                <button
                  type="button"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                  :class="
                    tab === 'tareas'
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  "
                  @click="tab = 'tareas'"
                >
                  Tipos de tarea
                </button>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <ul class="space-y-2">
                  <li
                    v-for="item in activeItems"
                    :key="item.id"
                    class="flex items-center gap-3 rounded-xl border px-3 py-2.5 dark:border-white/10"
                    :class="gcalBorder"
                  >
                    <span
                      v-if="tab === 'eventos'"
                      class="size-4 shrink-0 rounded-sm ring-1 ring-black/10 dark:ring-white/15"
                      :style="{ backgroundColor: item.color ?? '#7986CB' }"
                      aria-hidden="true"
                    />
                    <span
                      v-else
                      class="size-2 shrink-0 rounded-full bg-violet-500"
                      aria-hidden="true"
                    />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                      {{ item.name }}
                    </span>
                    <span
                      v-if="
                        (tab === 'eventos' && usedEventTypeNames.includes(item.name)) ||
                        (tab === 'tareas' && usedTaskTipoNames.includes(item.name))
                      "
                      class="hidden text-[10px] text-gray-400 sm:inline"
                    >
                      En uso
                    </span>
                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
                      aria-label="Editar"
                      @click="startEdit(item)"
                    >
                      <PencilIcon class="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label="Eliminar"
                      @click="deleteItem(item)"
                    >
                      <TrashIcon class="size-4" aria-hidden="true" />
                    </button>
                  </li>
                </ul>

                <div class="mt-4 rounded-xl border bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-800/40">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ editingId ? 'Editar tipo' : 'Agregar tipo' }}
                  </p>
                  <div class="mt-3 space-y-3">
                    <div>
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Nombre
                      </label>
                      <input
                        v-model="draftName"
                        type="text"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                        :placeholder="tab === 'eventos' ? 'Ej: Reunión de equipo' : 'Ej: Evaluación'"
                        @keydown.enter.prevent="saveItem"
                      />
                    </div>
                    <div v-if="tab === 'eventos'">
                      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Color en calendario
                      </label>
                      <div class="flex flex-wrap items-center gap-2">
                        <button
                          v-for="color in EVENT_COLOR_PRESETS"
                          :key="color"
                          type="button"
                          class="size-7 rounded-md ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-800"
                          :class="draftColor === color ? 'ring-indigo-500' : 'ring-transparent'"
                          :style="{ backgroundColor: color }"
                          :aria-label="`Color ${color}`"
                          @click="draftColor = color"
                        />
                        <input
                          v-model="draftColor"
                          type="color"
                          class="size-7 cursor-pointer rounded border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-gray-900"
                          aria-label="Elegir color personalizado"
                        />
                      </div>
                    </div>
                    <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        :class="[
                          gcalPrimaryBtn,
                          tab === 'tareas'
                            ? 'bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400'
                            : '',
                        ]"
                        @click="saveItem"
                      >
                        <PlusIcon v-if="!editingId" class="size-4 shrink-0" aria-hidden="true" />
                        {{ editingId ? 'Guardar cambios' : 'Agregar' }}
                      </button>
                      <button
                        v-if="editingId"
                        type="button"
                        class="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                        @click="cancelEdit"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-between gap-3 border-t px-5 py-3 dark:border-white/10">
                <button
                  type="button"
                  class="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  @click="restoreDefaults"
                >
                  Restaurar valores por defecto
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                  @click="close"
                >
                  Listo
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
