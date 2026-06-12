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
import { ChevronUpDownIcon } from '@heroicons/vue/16/solid'
import { CheckIcon } from '@heroicons/vue/20/solid'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import CalendarioEscolarMonth from '@/components/calendario/CalendarioEscolarMonth.vue'
import CalendarioEscolarDay from '@/components/calendario/CalendarioEscolarDay.vue'
import CalendarioEscolarYear from '@/components/calendario/CalendarioEscolarYear.vue'
import CalendarioEscolarWeek from '@/components/calendario/CalendarioEscolarWeek.vue'
import CalendarioEscolarTareas from '@/components/calendario/CalendarioEscolarTareas.vue'
import KtInputModeDatePicker from '@/components/KtInputModeDatePicker.vue'
import KtInputModeTimePicker from '@/components/KtInputModeTimePicker.vue'
import type { CalendarioContentMode, CalendarioDisplayView } from '@/utils/calendarioDates'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import {
  DEFAULT_TASK_CUADRANTE,
  DEFAULT_TASK_TIPO,
  taskCuadrantes,
  taskTipos,
  type TaskCuadranteOption,
  type TaskTipoOption,
} from '@/data/calendarioTareaOptions'
import { parseTimeToMinutes, formatTimeLabel } from '@/utils/calendarioEventTime'
import {
  CALENDAR_PAST_DATE_MESSAGE,
  CALENDAR_PAST_SLOT_MESSAGE,
  isCalendarSlotCreateAllowed,
  isDateBeforeToday,
  todayYmd,
} from '@/utils/calendarioDates'
import { gcalBorder } from '@/utils/calendarioGoogleTheme'
import {
  recurrenceOptionsForDate,
  type RecurrenceOption,
} from '@/utils/calendarioRecurrence'

defineOptions({ name: 'PlanificacionAnualPage' })

const CALENDARIO_CONTENT_MODE_KEY = 'wowed-calendario-content-mode'

function readStoredContentMode(): CalendarioContentMode {
  try {
    const stored = localStorage.getItem(CALENDARIO_CONTENT_MODE_KEY)
    if (stored === 'tareas' || stored === 'calendario') return stored
  } catch {
    /* ignore */
  }
  return 'calendario'
}

const schoolYear = ref(new Date().getFullYear())
const selectedDay = ref<string | null>(todayYmd())
const calendarioDisplayView = ref<CalendarioDisplayView>('semana')
const calendarioContentMode = ref<CalendarioContentMode>(readStoredContentMode())

watch(calendarioContentMode, (mode) => {
  try {
    localStorage.setItem(CALENDARIO_CONTENT_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
})

watch(calendarioDisplayView, () => {
  if (calendarioContentMode.value === 'tareas') {
    calendarioContentMode.value = 'calendario'
  }
})

const { addEvent: addCalendarioEvent, addEventWithRecurrence, eventosDelDia, reload: reloadEventos } = useCalendarioEscolarEvents()
const { addTask: addCalendarioTask, addTaskWithRecurrence, reload: reloadTareas } = useCalendarioEscolarTasks()

const leyenda = [
  { label: 'Feriado', class: 'bg-pink-400' },
  { label: 'Trimestre/Semestre', class: 'bg-blue-500' },
  { label: 'Jornada Institucional', class: 'bg-sky-400' },
  { label: 'Fecha Administrativa', class: 'bg-indigo-500' },
  { label: 'Evento Escolar', class: 'bg-orange-400' },
  { label: 'Otro', class: 'bg-gray-400' },
  { label: 'Tarea', class: 'bg-violet-500' },
] as const

const addEventOpen = ref(false)
const minCreateDate = computed(() => todayYmd())
const addEventDate = ref<string>(todayYmd())
const addEventTitle = ref('')
const addEventDescription = ref('')
type EventTypeOption = { id: number; name: 'Evento Escolar' | 'Jornada Institucional' | 'Fecha Administrativa' | 'Otro' }
const eventTypes: EventTypeOption[] = [
  { id: 1, name: 'Evento Escolar' },
  { id: 2, name: 'Jornada Institucional' },
  { id: 3, name: 'Fecha Administrativa' },
  { id: 4, name: 'Otro' },
]
const addEventType = ref<EventTypeOption>(eventTypes[0])
const addEventStartTime = ref('09:00')
const addEventEndTime = ref('10:00')
const addEventAllDay = ref(false)
const addEventRecurrence = ref<RecurrenceOption>({ id: 'none', label: 'No se repite' })
const addEventFormError = ref('')

const eventRecurrenceOptions = computed(() => recurrenceOptionsForDate(addEventDate.value))

watch(eventRecurrenceOptions, (opts) => {
  const match = opts.find((o) => o.id === addEventRecurrence.value.id)
  addEventRecurrence.value = match ?? opts[0]
})

watch(addEventStartTime, (start) => {
  if (addEventAllDay.value) return
  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(addEventEndTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    addEventEndTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

watch(addEventAllDay, (allDay) => {
  if (allDay) return
  const startMin = parseTimeToMinutes(addEventStartTime.value)
  const endMin = parseTimeToMinutes(addEventEndTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    addEventEndTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

function resolveCreateDate(date?: string | null): string {
  const requested = date ?? selectedDay.value ?? minCreateDate.value
  return isDateBeforeToday(requested) ? minCreateDate.value : requested
}

function openAddEvent(date?: string | null, startTime?: string | null) {
  const requested = date ?? selectedDay.value ?? minCreateDate.value
  if (!isCalendarSlotCreateAllowed(requested, startTime)) return
  addEventDate.value = resolveCreateDate(date)
  addEventTitle.value = ''
  addEventDescription.value = ''
  addEventType.value = eventTypes[0]
  addEventRecurrence.value = recurrenceOptionsForDate(addEventDate.value)[0]
  addEventFormError.value = ''
  if (startTime) {
    addEventStartTime.value = startTime
    const endMin = parseTimeToMinutes(startTime) + 60
    addEventEndTime.value = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
    addEventAllDay.value = false
  } else {
    addEventStartTime.value = '09:00'
    addEventEndTime.value = '10:00'
    addEventAllDay.value = false
  }
  addEventOpen.value = true
}

function closeAddEvent() {
  addEventOpen.value = false
  addEventFormError.value = ''
}

async function saveAddEvent() {
  addEventFormError.value = ''
  const title = addEventTitle.value.trim()
  if (!title) {
    addEventFormError.value = 'Ingresá un título para el evento.'
    return
  }
  if (addEventRecurrence.value.id === 'custom') {
    addEventFormError.value = 'La recurrencia personalizada estará disponible pronto.'
    return
  }
  if (!addEventAllDay.value && parseTimeToMinutes(addEventEndTime.value) <= parseTimeToMinutes(addEventStartTime.value)) {
    addEventFormError.value = 'La hora de fin debe ser posterior a la hora de inicio.'
    return
  }
  if (
    !isCalendarSlotCreateAllowed(
      addEventDate.value,
      addEventAllDay.value ? null : addEventStartTime.value,
    )
  ) {
    addEventFormError.value = addEventAllDay.value
      ? CALENDAR_PAST_DATE_MESSAGE
      : CALENDAR_PAST_SLOT_MESSAGE
    return
  }
  const payload = {
    date: addEventDate.value,
    title,
    description: addEventDescription.value,
    allDay: addEventAllDay.value,
    startTime: addEventAllDay.value ? undefined : addEventStartTime.value,
    endTime: addEventAllDay.value ? undefined : addEventEndTime.value,
    recurrence: addEventRecurrence.value.id,
    eventType: addEventType.value.name,
  }
  let created: Awaited<ReturnType<typeof addEventWithRecurrence>> = []
  try {
    if (payload.recurrence === 'none') {
      const event = await Promise.resolve(addCalendarioEvent(payload))
      created = event ? [event] : []
    } else {
      created = await Promise.resolve(addEventWithRecurrence(payload))
    }
  } catch {
    addEventFormError.value = 'No se pudo guardar el evento. Revisá la conexión con el servidor.'
    return
  }
  if (created.length === 0) {
    addEventFormError.value = 'No se pudo guardar el evento. Revisá los datos.'
    return
  }
  selectedDay.value = addEventDate.value
  addEventOpen.value = false
}

const STANDALONE_TASK_LINK_ID = '__standalone__'
type TaskLinkOption = { id: string; name: string }

const addTaskOpen = ref(false)
const addTaskDate = ref<string>(todayYmd())
const addTaskTime = ref('09:00')
const addTaskEndTime = ref('10:00')
const addTaskAllDay = ref(false)
const addTaskRecurrence = ref<RecurrenceOption>({ id: 'none', label: 'No se repite' })
const addTaskTitle = ref('')
const addTaskDescription = ref('')
const addTaskEventLink = ref<TaskLinkOption>({ id: STANDALONE_TASK_LINK_ID, name: 'Tarea suelta (sin vincular a evento)' })
const addTaskTipo = ref<TaskTipoOption>(DEFAULT_TASK_TIPO)
const addTaskCuadrante = ref<TaskCuadranteOption>(DEFAULT_TASK_CUADRANTE)
const addTaskFormError = ref('')

const taskRecurrenceOptions = computed(() => recurrenceOptionsForDate(addTaskDate.value))

const addTaskIsStandalone = computed(
  () => addTaskEventLink.value.id === STANDALONE_TASK_LINK_ID,
)

watch(taskRecurrenceOptions, (opts) => {
  const match = opts.find((o) => o.id === addTaskRecurrence.value.id)
  addTaskRecurrence.value = match ?? opts[0]
})

watch(addTaskTime, (start) => {
  if (addTaskAllDay.value) return
  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(addTaskEndTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    addTaskEndTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

watch(addTaskAllDay, (allDay) => {
  if (allDay) return
  const startMin = parseTimeToMinutes(addTaskTime.value)
  const endMin = parseTimeToMinutes(addTaskEndTime.value)
  if (endMin <= startMin) {
    const next = startMin + 60
    addTaskEndTime.value = formatTimeLabel(Math.floor(next / 60) % 24, next % 60)
  }
})

const taskLinkOptions = computed((): TaskLinkOption[] => {
  const events = eventosDelDia(addTaskDate.value)
  return [
    { id: STANDALONE_TASK_LINK_ID, name: 'Tarea suelta (sin vincular a evento)' },
    ...events.map((e) => ({ id: e.id, name: e.name })),
  ]
})

watch(taskLinkOptions, (opts) => {
  if (!opts.some((o) => o.id === addTaskEventLink.value.id)) {
    addTaskEventLink.value = opts[0]
  }
})

watch(addTaskDate, () => {
  if (!taskLinkOptions.value.some((o) => o.id === addTaskEventLink.value.id)) {
    addTaskEventLink.value = taskLinkOptions.value[0]
  }
})

function openAddTask(date?: string | null, startTime?: string | null) {
  const requested = date ?? selectedDay.value ?? minCreateDate.value
  if (!isCalendarSlotCreateAllowed(requested, startTime)) return
  addTaskDate.value = resolveCreateDate(date)
  addTaskTitle.value = ''
  addTaskDescription.value = ''
  addTaskEventLink.value = taskLinkOptions.value[0]
  addTaskTipo.value = DEFAULT_TASK_TIPO
  addTaskCuadrante.value = DEFAULT_TASK_CUADRANTE
  addTaskFormError.value = ''
  addTaskRecurrence.value = recurrenceOptionsForDate(addTaskDate.value)[0]
  if (startTime) {
    addTaskTime.value = startTime
    const endMin = parseTimeToMinutes(startTime) + 60
    addTaskEndTime.value = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
    addTaskAllDay.value = false
  } else {
    addTaskTime.value = '09:00'
    addTaskEndTime.value = '10:00'
    addTaskAllDay.value = false
  }
  addTaskOpen.value = true
}

function closeAddTask() {
  addTaskOpen.value = false
  addTaskFormError.value = ''
}

async function saveAddTask() {
  addTaskFormError.value = ''
  const title = addTaskTitle.value.trim()
  if (!title) {
    addTaskFormError.value = 'Ingresá un título para la tarea.'
    return
  }
  if (addTaskRecurrence.value.id === 'custom') {
    addTaskFormError.value = 'La recurrencia personalizada estará disponible pronto.'
    return
  }
  const eventId =
    addTaskEventLink.value.id === STANDALONE_TASK_LINK_ID ? null : addTaskEventLink.value.id
  const scheduled = addTaskIsStandalone.value && !addTaskAllDay.value
  if (scheduled && parseTimeToMinutes(addTaskEndTime.value) <= parseTimeToMinutes(addTaskTime.value)) {
    addTaskFormError.value = 'La hora de fin debe ser posterior a la hora de inicio.'
    return
  }
  if (
    !isCalendarSlotCreateAllowed(
      addTaskDate.value,
      scheduled && !addTaskAllDay.value ? addTaskTime.value : null,
    )
  ) {
    addTaskFormError.value =
      scheduled && !addTaskAllDay.value ? CALENDAR_PAST_SLOT_MESSAGE : CALENDAR_PAST_DATE_MESSAGE
    return
  }
  const payload = {
    date: addTaskDate.value,
    title,
    description: addTaskDescription.value,
    tipo: addTaskTipo.value.name,
    cuadrante: addTaskCuadrante.value.name,
    eventId,
    allDay: addTaskIsStandalone.value ? addTaskAllDay.value : false,
    time: scheduled ? addTaskTime.value : null,
    endTime: scheduled ? addTaskEndTime.value : null,
    recurrence: addTaskIsStandalone.value ? addTaskRecurrence.value.id : 'none',
  }
  let created: Awaited<ReturnType<typeof addTaskWithRecurrence>> = []
  try {
    if (payload.recurrence === 'none') {
      const task = await Promise.resolve(addCalendarioTask(payload))
      created = task ? [task] : []
    } else {
      created = await Promise.resolve(addTaskWithRecurrence(payload))
    }
  } catch {
    addTaskFormError.value = 'No se pudo guardar la tarea. Revisá la conexión con el servidor.'
    return
  }
  if (created.length === 0) {
    addTaskFormError.value = 'No se pudo guardar la tarea. Revisá los datos.'
    return
  }
  selectedDay.value = addTaskDate.value
  addTaskOpen.value = false
}

async function refreshCalendario(): Promise<void> {
  await Promise.all([Promise.resolve(reloadEventos()), Promise.resolve(reloadTareas())])
}

</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CalendarioEscolarTareas
          v-if="calendarioContentMode === 'tareas'"
          class="min-h-0 flex-1"
          v-model:display-view="calendarioDisplayView"
          v-model:content-mode="calendarioContentMode"
          @refresh="refreshCalendario"
          @add-task="openAddTask(selectedDay, $event)"
        />
        <CalendarioEscolarYear
          v-else-if="calendarioDisplayView === 'anio'"
          class="min-h-0 flex-1"
          v-model:school-year="schoolYear"
          v-model:selected-date="selectedDay"
          v-model:display-view="calendarioDisplayView"
          v-model:content-mode="calendarioContentMode"
          @refresh="refreshCalendario"
          @add-event="openAddEvent(selectedDay, $event)"
          @add-task="openAddTask(selectedDay, $event)"
        />
        <CalendarioEscolarDay
          v-else-if="calendarioDisplayView === 'dia'"
          class="min-h-0 flex-1"
          v-model:school-year="schoolYear"
          v-model:selected-date="selectedDay"
          v-model:display-view="calendarioDisplayView"
          v-model:content-mode="calendarioContentMode"
          @refresh="refreshCalendario"
          @add-event="openAddEvent(selectedDay, $event)"
          @add-task="openAddTask(selectedDay, $event)"
        />
        <CalendarioEscolarWeek
          v-else-if="calendarioDisplayView === 'semana'"
          class="min-h-0 flex-1"
          v-model:school-year="schoolYear"
          v-model:selected-date="selectedDay"
          v-model:display-view="calendarioDisplayView"
          v-model:content-mode="calendarioContentMode"
          @refresh="refreshCalendario"
          @add-event="openAddEvent(selectedDay, $event)"
          @add-task="openAddTask(selectedDay, $event)"
        />
        <CalendarioEscolarMonth
          v-else
          class="min-h-0 flex-1"
          v-model:school-year="schoolYear"
          v-model:selected-date="selectedDay"
          v-model:display-view="calendarioDisplayView"
          v-model:content-mode="calendarioContentMode"
          @refresh="refreshCalendario"
          @add-event="openAddEvent(selectedDay, $event)"
          @add-task="openAddTask(selectedDay, $event)"
        />
      </div>

      <div
        v-if="calendarioContentMode === 'calendario'"
        class="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-2 py-1.5 sm:px-3 dark:border-white/10"
        :class="gcalBorder"
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span
            v-for="item in leyenda"
            :key="item.label"
            class="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400"
          >
            <span class="size-2 rounded-full" :class="item.class" aria-hidden="true"></span>
            {{ item.label }}
          </span>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
        >
          <ArrowDownTrayIcon class="size-3.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          Exportar
        </button>
      </div>
  </div>

  <!-- Dialog: Añadir Evento al Calendario Escolar -->
  <TransitionRoot as="template" :show="addEventOpen">
    <Dialog class="relative z-50" @close="closeAddEvent">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
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
              class="w-full max-w-lg overflow-visible rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Añadir Evento al Calendario Escolar
                  </DialogTitle>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Registre un nuevo evento oficial para el calendario escolar institucional.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="closeAddEvent"
                >
                  <span class="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="saveAddEvent">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Fecha</label>
                  <div class="relative mt-2 w-full">
                    <KtInputModeDatePicker v-model="addEventDate" :min-date="minCreateDate" placeholder="Seleccionar fecha" />
                  </div>
                </div>

                <div class="space-y-3">
                  <div v-if="!addEventAllDay" class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 dark:text-white">Hora de inicio</label>
                      <div class="relative mt-2 w-full">
                        <KtInputModeTimePicker v-model="addEventStartTime" />
                      </div>
                    </div>
                    <span class="hidden pb-3 text-center text-gray-400 sm:block" aria-hidden="true">–</span>
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 dark:text-white">Hora de fin</label>
                      <div class="relative mt-2 w-full">
                        <KtInputModeTimePicker v-model="addEventEndTime" />
                      </div>
                    </div>
                  </div>

                  <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <input
                      v-model="addEventAllDay"
                      type="checkbox"
                      class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-gray-900"
                    />
                    Todo el día
                  </label>

                  <Listbox as="div" v-model="addEventRecurrence">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">Repetir</ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-indigo-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-indigo-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addEventRecurrence.label }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>
                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in eventRecurrenceOptions"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-indigo-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.label }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-indigo-600 dark:text-indigo-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Título del Evento</label>
                  <input
                    v-model="addEventTitle"
                    type="text"
                    placeholder="Ej: Jornada Institucional"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Descripción</label>
                  <input
                    v-model="addEventDescription"
                    type="text"
                    placeholder="Ej: Jornada de trabajo docente sin alumnos"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                  />
                </div>

                <div>
                  <Listbox as="div" v-model="addEventType">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">
                      Tipo de Evento
                    </ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-purple-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-purple-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addEventType.name }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>

                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in eventTypes"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-purple-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.name }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-purple-600 dark:text-purple-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                </div>

                <p v-if="addEventFormError" class="text-sm text-red-600 dark:text-red-400" role="alert">
                  {{ addEventFormError }}
                </p>

                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Nota: Feriados y fechas de inicio/fin de ciclo lectivo solo pueden ser establecidos por el administrador del sistema.
                </p>

                <div class="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                    @click="closeAddEvent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-500/25"
                  >
                    Guardar Evento
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Dialog: Añadir tarea -->
  <TransitionRoot as="template" :show="addTaskOpen">
    <Dialog class="relative z-50" @close="closeAddTask">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
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
              class="w-full max-w-lg overflow-visible rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Añadir tarea
                  </DialogTitle>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Creá una tarea suelta o vinculada a un evento del mismo día.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  @click="closeAddTask"
                >
                  <span class="sr-only">Cerrar</span>
                  ×
                </button>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="saveAddTask">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Fecha</label>
                  <div class="relative mt-2 w-full">
                    <KtInputModeDatePicker v-model="addTaskDate" :min-date="minCreateDate" placeholder="Seleccionar fecha" />
                  </div>
                </div>

                <div v-if="addTaskIsStandalone" class="space-y-3">
                  <div v-if="!addTaskAllDay" class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 dark:text-white">Hora de inicio</label>
                      <div class="relative mt-2 w-full">
                        <KtInputModeTimePicker v-model="addTaskTime" />
                      </div>
                    </div>
                    <span class="hidden pb-3 text-center text-gray-400 sm:block" aria-hidden="true">–</span>
                    <div>
                      <label class="block text-sm font-semibold text-gray-900 dark:text-white">Hora de fin</label>
                      <div class="relative mt-2 w-full">
                        <KtInputModeTimePicker v-model="addTaskEndTime" />
                      </div>
                    </div>
                  </div>

                  <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <input
                      v-model="addTaskAllDay"
                      type="checkbox"
                      class="size-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-white/20 dark:bg-gray-900"
                    />
                    Todo el día
                  </label>

                  <Listbox as="div" v-model="addTaskRecurrence">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">Repetir</ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addTaskRecurrence.label }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>
                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in taskRecurrenceOptions"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-violet-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.label }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-violet-600 dark:text-violet-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Título de la tarea</label>
                  <input
                    v-model="addTaskTitle"
                    type="text"
                    placeholder="Ej: Revisar informes"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-900 dark:text-white">Descripción</label>
                  <input
                    v-model="addTaskDescription"
                    type="text"
                    placeholder="Opcional"
                    class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                  />
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Listbox as="div" v-model="addTaskTipo">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">Tipo</ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addTaskTipo.name }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>
                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in taskTipos"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-violet-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.name }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-violet-600 dark:text-violet-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <Listbox as="div" v-model="addTaskCuadrante">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">Cuadrante</ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addTaskCuadrante.name }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>
                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in taskCuadrantes"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-violet-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.name }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-violet-600 dark:text-violet-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                </div>

                <div>
                  <Listbox as="div" v-model="addTaskEventLink">
                    <ListboxLabel class="block text-sm font-semibold text-gray-900 dark:text-white">
                      Vincular a evento
                    </ListboxLabel>
                    <div class="relative mt-2">
                      <ListboxButton
                        class="grid w-full cursor-default grid-cols-1 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-hidden focus:ring-4 focus:ring-violet-200 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:focus:ring-violet-500/25"
                      >
                        <span class="col-start-1 row-start-1 truncate pr-6">{{ addTaskEventLink.name }}</span>
                        <ChevronUpDownIcon
                          class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-400"
                          aria-hidden="true"
                        />
                      </ListboxButton>

                      <transition
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class=""
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg outline-hidden dark:border-white/10 dark:bg-gray-800"
                        >
                          <ListboxOption
                            as="template"
                            v-for="opt in taskLinkOptions"
                            :key="opt.id"
                            :value="opt"
                            v-slot="{ active, selected }"
                          >
                            <li
                              :class="[
                                active ? 'bg-violet-600 text-white outline-hidden' : 'text-gray-900 dark:text-white',
                                'relative cursor-default py-2 pr-9 pl-3 select-none',
                              ]"
                            >
                              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                                {{ opt.name }}
                              </span>
                              <span
                                v-if="selected"
                                :class="[
                                  active ? 'text-white' : 'text-violet-600 dark:text-violet-300',
                                  'absolute inset-y-0 right-0 flex items-center pr-3',
                                ]"
                              >
                                <CheckIcon class="size-5" aria-hidden="true" />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>
                  <p
                    v-if="taskLinkOptions.length === 1"
                    class="mt-2 text-xs text-gray-500 dark:text-gray-400"
                  >
                    No hay eventos en esta fecha. La tarea quedará suelta hasta que exista un evento para vincularla.
                  </p>
                </div>

                <p v-if="addTaskFormError" class="text-sm text-red-600 dark:text-red-400" role="alert">
                  {{ addTaskFormError }}
                </p>

                <div class="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900/40 dark:text-white dark:hover:bg-white/5"
                    @click="closeAddTask"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-500/25"
                  >
                    Guardar tarea
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
