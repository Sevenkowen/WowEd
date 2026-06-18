<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronUpDownIcon,
  TagIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid'
import KtInputModeDatePicker from '@/components/KtInputModeDatePicker.vue'
import KtInputModeTimePicker from '@/components/KtInputModeTimePicker.vue'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { useCalendarioCatalogs } from '@/composables/useCalendarioCatalogs'
import {
  DEFAULT_TASK_CUADRANTE,
  taskCuadranteOf,
  taskCuadrantes,
  taskTipoOf,
  type TaskCuadranteOption,
} from '@/data/calendarioTareaOptions'
import type { CalendarioCatalogItem } from '@/data/calendarioCatalogDefaults'
import { formatTimeLabel, parseTimeToMinutes } from '@/utils/calendarioEventTime'
import {
  CALENDAR_PAST_DATE_MESSAGE,
  CALENDAR_PAST_SLOT_MESSAGE,
  isCalendarModifyAllowed,
  isCalendarSlotCreateAllowed,
  isDateBeforeToday,
  parseYmd,
  todayYmd,
} from '@/utils/calendarioDates'
import { gcalBorder, gcalCard, gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

const fieldLabel = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const selectBtnClass =
  'relative grid w-full cursor-pointer grid-cols-1 rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'
const selectOptionClass = (active: boolean, selected: boolean) =>
  [
    active ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-100',
    selected ? 'font-semibold' : 'font-normal',
    'cursor-pointer px-3 py-2.5 text-sm select-none',
  ].join(' ')
const sectionClass =
  'rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-gray-800/40'

defineOptions({ name: 'CalendarioTareaDetalleDialog' })

const open = defineModel<boolean>('open', { default: false })
const taskId = defineModel<string | null>('taskId', { default: null })

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const STANDALONE_EVENT_ID = '__standalone__'

const { todasLasTareas, updateTask, deleteTask, setCompletada } = useCalendarioEscolarTasks()
const { eventosDelDia } = useCalendarioEscolarEvents()

const { taskTipoOptions, defaultTaskTipo } = useCalendarioCatalogs()

const formError = ref('')
const confirmDelete = ref(false)
const saving = ref(false)

const title = ref('')
const description = ref('')
const date = ref(todayYmd())
const time = ref('09:00')
const endTime = ref('10:00')
const allDay = ref(false)
const completed = ref(false)
const tipo = ref<CalendarioCatalogItem>(defaultTaskTipo.value)
const cuadrante = ref<TaskCuadranteOption>(DEFAULT_TASK_CUADRANTE)
const eventLinkId = ref(STANDALONE_EVENT_ID)

const task = computed(() =>
  taskId.value ? todasLasTareas.value.find((t) => t.id === taskId.value) ?? null : null,
)

const canEdit = computed(() => (task.value ? isCalendarModifyAllowed(task.value.date) : false))

const minDate = computed(() => todayYmd())

const dateLabel = computed(() => {
  const d = parseYmd(date.value)
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const eventLinkOptions = computed(() => {
  const events = eventosDelDia(date.value)
  return [
    { id: STANDALONE_EVENT_ID, name: 'Sin evento vinculado' },
    ...events.map((e) => ({ id: e.id, name: e.name })),
  ]
})

const cuadranteAccent = computed(() => {
  switch (cuadrante.value.name) {
    case 'Urgente e Importante':
      return 'bg-red-500'
    case 'No Urgente pero Importante':
      return 'bg-amber-500'
    case 'Urgente pero No Importante':
      return 'bg-orange-500'
    default:
      return 'bg-gray-400'
  }
})

function tipoColor(tipoName: string): string {
  switch (tipoName) {
    case 'Pedagógico':
      return 'bg-violet-500'
    case 'Administrativo':
      return 'bg-sky-500'
    case 'Socio-comunicativo':
      return 'bg-emerald-500'
    case 'Flexible':
      return 'bg-amber-500'
    default:
      return 'bg-gray-400'
  }
}

function loadFormFromTask(t: CalTask): void {
  title.value = t.title
  description.value = t.description ?? ''
  date.value = t.date
  allDay.value = !!t.allDay
  time.value = t.time ?? '09:00'
  endTime.value = t.endTime ?? '10:00'
  completed.value = !!t.completed
  tipo.value = taskTipoOptions.value.find((o) => o.name === taskTipoOf(t)) ?? defaultTaskTipo.value
  cuadrante.value = taskCuadrantes.find((o) => o.name === taskCuadranteOf(t)) ?? DEFAULT_TASK_CUADRANTE
  eventLinkId.value = t.eventId ?? STANDALONE_EVENT_ID
  formError.value = ''
  confirmDelete.value = false
}

watch(
  () => [open.value, taskId.value, task.value] as const,
  ([isOpen, id, t]) => {
    if (isOpen && id && t) loadFormFromTask(t)
  },
)

watch(date, () => {
  if (!eventLinkOptions.value.some((o) => o.id === eventLinkId.value)) {
    eventLinkId.value = STANDALONE_EVENT_ID
  }
})

watch(time, (start) => {
  if (allDay.value) return
  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(endTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    endTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

watch(allDay, (value) => {
  if (value) return
  const startMin = parseTimeToMinutes(time.value)
  const endMin = parseTimeToMinutes(endTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    endTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

function close(): void {
  open.value = false
  confirmDelete.value = false
  formError.value = ''
}

async function onToggleCompleted(): Promise<void> {
  if (!task.value) return
  const next = !completed.value
  completed.value = next
  await setCompletada(task.value.id, next)
}

async function onSave(): Promise<void> {
  if (!task.value || !canEdit.value) return
  const trimmed = title.value.trim()
  if (!trimmed) {
    formError.value = 'El título es obligatorio.'
    return
  }
  if (!isCalendarSlotCreateAllowed(date.value, allDay.value ? null : time.value)) {
    formError.value = isDateBeforeToday(date.value)
      ? CALENDAR_PAST_DATE_MESSAGE
      : CALENDAR_PAST_SLOT_MESSAGE
    return
  }

  saving.value = true
  formError.value = ''
  const result = await updateTask(task.value.id, {
    title: trimmed,
    description: description.value,
    date: date.value,
    tipo: tipo.value.name,
    cuadrante: cuadrante.value.name,
    completed: completed.value,
    allDay: allDay.value,
    time: allDay.value ? null : time.value,
    endTime: allDay.value ? null : endTime.value,
    eventId: eventLinkId.value === STANDALONE_EVENT_ID ? null : eventLinkId.value,
  })
  saving.value = false

  if (!result) {
    formError.value = 'No se pudo guardar la tarea. Revisá la fecha y el horario.'
    return
  }
  emit('saved')
  close()
}

async function onDelete(): Promise<void> {
  if (!task.value || !canEdit.value) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  const ok = await deleteTask(task.value.id)
  if (!ok) {
    formError.value = 'No se pudo eliminar la tarea.'
    confirmDelete.value = false
    return
  }
  emit('deleted')
  close()
}
</script>

<template>
  <TransitionRoot as="template" :show="open && !!task">
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
        <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 translate-y-2 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-2 sm:scale-95"
        >
          <DialogPanel
            v-if="task"
            :class="['my-auto w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10', gcalCard]"
          >
            <div :class="['h-1.5 w-full', cuadranteAccent]" aria-hidden="true" />

            <div class="border-b px-6 py-5 dark:border-white/10" :class="gcalBorder">
              <div class="flex items-start gap-4">
                <button
                  type="button"
                  class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  :class="
                    completed
                      ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
                      : 'border-gray-300 hover:border-indigo-500 dark:border-gray-500 dark:hover:border-indigo-400'
                  "
                  :aria-label="completed ? 'Marcar como pendiente' : 'Marcar como completada'"
                  @click="onToggleCompleted"
                >
                  <CheckIcon
                    v-if="completed"
                    class="size-4 text-white dark:text-gray-900"
                    aria-hidden="true"
                  />
                </button>

                <div class="min-w-0 flex-1">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      :class="tipoColor(tipo.name)"
                    >
                      {{ tipo.name }}
                    </span>
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        completed
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
                      ]"
                    >
                      {{ completed ? 'Completada' : 'Pendiente' }}
                    </span>
                  </div>
                  <DialogTitle class="sr-only">Editar tarea</DialogTitle>
                  <input
                    v-model="title"
                    type="text"
                    :readonly="!canEdit"
                    class="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-gray-900 outline-none read-only:cursor-default focus:ring-0 dark:text-white"
                    placeholder="Título de la tarea"
                  />
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ dateLabel }}</p>
                </div>

                <button
                  type="button"
                  class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
                  @click="close"
                >
                  <XMarkIcon class="size-5" aria-hidden="true" />
                  <span class="sr-only">Cerrar</span>
                </button>
              </div>
            </div>

            <fieldset class="space-y-5 border-0 px-6 py-6 disabled:opacity-75" :disabled="!canEdit">
              <p
                v-if="!canEdit"
                class="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
              >
                Esta tarea es de una fecha pasada. Podés consultarla, pero no editarla ni eliminarla.
              </p>

              <section :class="sectionClass">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <CalendarDaysIcon class="size-4 text-indigo-600 dark:text-indigo-400" />
                  Cuándo
                </h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label :class="fieldLabel">Fecha</label>
                    <KtInputModeDatePicker v-model="date" :min-date="minDate" />
                  </div>
                  <div class="flex items-end">
                    <label class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                      <input
                        v-model="allDay"
                        type="checkbox"
                        class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
                      />
                      Todo el día
                    </label>
                  </div>
                </div>
                <div v-if="!allDay" class="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label :class="fieldLabel">Desde</label>
                    <KtInputModeTimePicker v-model="time" />
                  </div>
                  <div>
                    <label :class="fieldLabel">Hasta</label>
                    <KtInputModeTimePicker v-model="endTime" />
                  </div>
                </div>
              </section>

              <section :class="sectionClass">
                <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <TagIcon class="size-4 text-indigo-600 dark:text-indigo-400" />
                  Clasificación
                </h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <Listbox v-model="tipo" as="div">
                    <ListboxLabel :class="fieldLabel">Tipo</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton :class="selectBtnClass">
                        <span class="col-start-1 row-start-1 flex items-center gap-2 truncate pr-6">
                          <span :class="['size-2 shrink-0 rounded-full', tipoColor(tipo.name)]" />
                          {{ tipo.name }}
                        </span>
                        <ChevronUpDownIcon
                          class="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                        />
                      </ListboxButton>
                      <ListboxOptions
                        class="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800"
                      >
                        <ListboxOption
                          v-for="opt in taskTipoOptions"
                          :key="opt.id"
                          v-slot="{ active, selected }"
                          :value="opt"
                          as="template"
                        >
                          <li :class="selectOptionClass(active, selected)">{{ opt.name }}</li>
                        </ListboxOption>
                      </ListboxOptions>
                    </div>
                  </Listbox>

                  <Listbox v-model="cuadrante" as="div">
                    <ListboxLabel :class="fieldLabel">Cuadrante</ListboxLabel>
                    <div class="relative mt-0">
                      <ListboxButton :class="selectBtnClass">
                        <span class="col-start-1 row-start-1 flex items-center gap-2 truncate pr-6">
                          <span :class="['size-2 shrink-0 rounded-full', cuadranteAccent]" />
                          {{ cuadrante.name }}
                        </span>
                        <ChevronUpDownIcon
                          class="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                        />
                      </ListboxButton>
                      <ListboxOptions
                        class="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800"
                      >
                        <ListboxOption
                          v-for="opt in taskCuadrantes"
                          :key="opt.id"
                          v-slot="{ active, selected }"
                          :value="opt"
                          as="template"
                        >
                          <li :class="selectOptionClass(active, selected)">{{ opt.name }}</li>
                        </ListboxOption>
                      </ListboxOptions>
                    </div>
                  </Listbox>
                </div>
              </section>

              <section :class="sectionClass">
                <label :class="fieldLabel">Descripción</label>
                <textarea
                  v-model="description"
                  rows="4"
                  class="mt-0 w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  placeholder="Notas, pasos a seguir, materiales…"
                />
              </section>

              <section :class="sectionClass">
                <Listbox v-model="eventLinkId" as="div">
                  <ListboxLabel :class="fieldLabel">Evento vinculado</ListboxLabel>
                  <div class="relative mt-0">
                    <ListboxButton :class="selectBtnClass">
                      <span class="col-start-1 row-start-1 truncate pr-6">
                        {{ eventLinkOptions.find((o) => o.id === eventLinkId)?.name ?? 'Sin evento' }}
                      </span>
                      <ChevronUpDownIcon
                        class="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                      />
                    </ListboxButton>
                    <ListboxOptions
                      class="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-800"
                    >
                      <ListboxOption
                        v-for="opt in eventLinkOptions"
                        :key="opt.id"
                        v-slot="{ active, selected }"
                        :value="opt.id"
                        as="template"
                      >
                        <li :class="selectOptionClass(active, selected)">{{ opt.name }}</li>
                      </ListboxOption>
                    </ListboxOptions>
                  </div>
                </Listbox>
              </section>
            </fieldset>

            <div
              class="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
              :class="gcalBorder"
            >
              <div class="min-w-0">
                <button
                  v-if="canEdit"
                  type="button"
                  class="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  @click="onDelete"
                >
                  <TrashIcon class="size-4" />
                  {{ confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar' }}
                </button>
                <p v-if="formError" class="mt-1.5 text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
              </div>

              <div class="flex gap-2 sm:justify-end">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                  @click="close"
                >
                  Cerrar
                </button>
                <button
                  v-if="canEdit"
                  type="button"
                  :class="[
                    'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm disabled:opacity-60 sm:flex-none',
                    gcalPrimaryBtn,
                  ]"
                  :disabled="saving"
                  @click="onSave"
                >
                  {{ saving ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
