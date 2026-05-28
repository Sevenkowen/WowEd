import { computed, ref } from 'vue'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import {
  apiMoveTask,
  apiPatchTask,
  apiResizeTask,
  apiCreateTask,
  fetchTasksPorFecha,
} from '@/api/calendarioApi'
import type { NuevaCalendarioTarea } from '@/composables/useCalendarioEscolarTasks'
import { isCalendarModifyAllowed, isDateBeforeToday } from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'
const apiPorFecha = ref<Record<string, CalTask[]>>({})

async function loadAll() {
  apiPorFecha.value = await fetchTasksPorFecha()
}

void loadAll()

function flattenTasks(map: Record<string, CalTask[]>): CalTask[] {
  return Object.entries(map)
    .flatMap(([date, tasks]) => tasks.map((t) => ({ ...t, date })))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function useCalendarioEscolarTasksApi() {
  const porFecha = computed(() => apiPorFecha.value)
  const todasLasTareas = computed(() => flattenTasks(porFecha.value))

  function tareasDelDia(ymd: string | null): CalTask[] {
    if (!ymd) return []
    return porFecha.value[ymd] ?? []
  }

  async function reload(): Promise<void> {
    await loadAll()
  }

  async function addTask(input: NuevaCalendarioTarea): Promise<CalTask | null> {
    if (isDateBeforeToday(input.date)) return null
    const task = await apiCreateTask({
      date: input.date,
      title: input.title,
      description: input.description,
      tipo: input.tipo,
      cuadrante: input.cuadrante,
      eventId: input.eventId,
      time: input.time,
      endTime: input.endTime,
      allDay: input.allDay,
      completed: false,
      recurrence: input.recurrence,
    })
    await loadAll()
    return task
  }

  async function addTaskWithRecurrence(input: NuevaCalendarioTarea): Promise<CalTask[]> {
    const preset = (input.recurrence ?? 'none') as CalRecurrencePreset
    const dates = expandRecurrenceDates(input.date, preset).filter((d) => !isDateBeforeToday(d))
    const created: CalTask[] = []
    for (const date of dates) {
      created.push(
        await apiCreateTask({
          date,
          title: input.title,
          description: input.description,
          tipo: input.tipo,
          cuadrante: input.cuadrante,
          eventId: input.eventId,
          time: input.time,
          endTime: input.endTime,
          allDay: input.allDay,
          recurrence: preset,
        }),
      )
    }
    await loadAll()
    return created
  }

  async function moveTask(taskId: string, newDate: string, newTime: string | null): Promise<boolean> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task || !isCalendarModifyAllowed(task.date, newDate)) return false
    await apiMoveTask(taskId, newDate, newTime)
    await loadAll()
    return true
  }

  async function resizeTask(taskId: string, newEndTime: string): Promise<boolean> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task || !isCalendarModifyAllowed(task.date)) return false
    await apiResizeTask(taskId, newEndTime)
    await loadAll()
    return true
  }

  async function toggleCompletada(taskId: string): Promise<void> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task) return
    await apiPatchTask(taskId, { completed: !task.completed })
    await loadAll()
  }

  return {
    porFecha,
    todasLasTareas,
    tareasDelDia,
    addTask,
    addTaskWithRecurrence,
    reload,
    moveTask,
    resizeTask,
    toggleCompletada,
  }
}
