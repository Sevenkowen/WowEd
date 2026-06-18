import { computed, ref } from 'vue'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import {
  apiMoveTask,
  apiDeleteTask,
  apiPatchTask,
  apiResizeTask,
  apiCreateTask,
  fetchTasksPorFecha,
} from '@/api/calendarioApi'
import type { NuevaCalendarioTarea, UpdateCalendarioTarea } from '@/composables/useCalendarioEscolarTasks'
import { parseTimeToMinutes, formatTimeLabel, moveCalTask, resizeCalTask } from '@/utils/calendarioEventTime'
import {
  isCalendarModifyAllowed,
  isCalendarSlotCreateAllowed,
  isDateBeforeToday,
} from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'
const apiPorFecha = ref<Record<string, CalTask[]>>({})

function patchTaskInMap(
  map: Record<string, CalTask[]>,
  taskId: string,
  patch: (task: CalTask) => CalTask,
): Record<string, CalTask[]> {
  for (const [date, tasks] of Object.entries(map)) {
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx < 0) continue
    const next = { ...map }
    const list = [...tasks]
    list[idx] = patch(list[idx])
    next[date] = list
    return next
  }
  return map
}

function moveTaskInMap(
  map: Record<string, CalTask[]>,
  taskId: string,
  newDate: string,
  newTime: string | null,
): Record<string, CalTask[]> {
  for (const [date, tasks] of Object.entries(map)) {
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx < 0) continue

    const moved = moveCalTask(tasks[idx], newDate, newTime)
    if (date === newDate) {
      const next = { ...map }
      const list = [...tasks]
      list[idx] = moved
      next[date] = list
      return next
    }

    const next = { ...map }
    const oldList = [...tasks]
    oldList.splice(idx, 1)
    if (oldList.length) next[date] = oldList
    else delete next[date]
    next[newDate] = [...(next[newDate] ?? []), moved]
    return next
  }
  return map
}

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
    if (
      !isCalendarSlotCreateAllowed(input.date, input.allDay ? null : input.time)
    ) {
      return null
    }
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
    if (!task || !isCalendarModifyAllowed(task.date, newDate, newTime)) return false

    const snapshot = apiPorFecha.value
    apiPorFecha.value = moveTaskInMap(snapshot, taskId, newDate, newTime)

    try {
      await apiMoveTask(taskId, newDate, newTime)
      await loadAll()
      return true
    } catch {
      apiPorFecha.value = snapshot
      return false
    }
  }

  async function resizeTask(taskId: string, newEndTime: string): Promise<boolean> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task || !isCalendarModifyAllowed(task.date)) return false

    const snapshot = apiPorFecha.value
    apiPorFecha.value = patchTaskInMap(snapshot, taskId, (t) => resizeCalTask(t, newEndTime))

    try {
      await apiResizeTask(taskId, newEndTime)
      await loadAll()
      return true
    } catch {
      apiPorFecha.value = snapshot
      return false
    }
  }

  async function toggleCompletada(taskId: string): Promise<void> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task) return
    await apiPatchTask(taskId, { completed: !task.completed })
    await loadAll()
  }

  async function setCompletada(taskId: string, completed: boolean): Promise<void> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task || !!task.completed === completed) return
    await apiPatchTask(taskId, { completed })
    await loadAll()
  }

  async function moveTaskCuadrante(taskId: string, cuadrante: string): Promise<boolean> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task) return false
    await apiPatchTask(taskId, { cuadrante })
    await loadAll()
    return true
  }

  async function updateTask(taskId: string, patch: UpdateCalendarioTarea): Promise<CalTask | null> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task) return null

    const newDate = patch.date ?? task.date
    const allDay = patch.allDay ?? task.allDay ?? false
    const timeRaw = patch.time !== undefined ? patch.time : task.time ?? null
    const startTime = allDay ? null : timeRaw?.trim() || null

    if (!isCalendarModifyAllowed(task.date, newDate, startTime)) return null
    if (!isCalendarSlotCreateAllowed(newDate, allDay ? null : startTime)) return null

    const title = (patch.title !== undefined ? patch.title : task.title).trim()
    if (!title) return null

    let endTime = patch.endTime !== undefined ? patch.endTime : task.endTime
    if (startTime && !endTime) {
      const endMin = parseTimeToMinutes(startTime) + 30
      endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
    }

    let eventId = patch.eventId !== undefined ? patch.eventId : (task.eventId ?? null)
    if (eventId && newDate !== task.date) eventId = null

    const updated = await apiPatchTask(taskId, {
      title,
      description: patch.description !== undefined ? patch.description.trim() || undefined : task.description,
      date: newDate !== task.date ? newDate : undefined,
      tipo: patch.tipo,
      cuadrante: patch.cuadrante,
      completed: patch.completed,
      time: allDay ? null : startTime,
      end_time: allDay ? null : endTime,
      all_day: allDay,
      event_id: eventId,
    })
    await loadAll()
    return updated
  }

  async function deleteTask(taskId: string): Promise<boolean> {
    const task = todasLasTareas.value.find((t) => t.id === taskId)
    if (!task || !isCalendarModifyAllowed(task.date)) return false
    await apiDeleteTask(taskId)
    await loadAll()
    return true
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
    setCompletada,
    moveTaskCuadrante,
    updateTask,
    deleteTask,
  }
}
