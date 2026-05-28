import { computed, ref } from 'vue'
import { useApi } from '@/api/http'
import { useCalendarioEscolarTasksApi } from '@/composables/useCalendarioEscolarTasksApi'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import {
  DEFAULT_TASK_CUADRANTE,
  DEFAULT_TASK_TIPO,
  type CalTaskCuadrante,
  type CalTaskTipo,
} from '@/data/calendarioTareaOptions'
import { parseTimeToMinutes, formatTimeLabel } from '@/utils/calendarioEventTime'
import { isCalendarModifyAllowed, isDateBeforeToday } from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'

const STORAGE_KEY = 'wowed-calendario-escolar-tareas'
const ID_KEY = 'wowed-calendario-escolar-tareas-next-id'

export interface NuevaCalendarioTarea {
  date: string
  title: string
  description?: string
  tipo: CalTaskTipo
  cuadrante: CalTaskCuadrante
  eventId?: string | null
  time?: string | null
  endTime?: string | null
  allDay?: boolean
  recurrence?: CalRecurrencePreset
}

const userTasksByDate = ref<Record<string, CalTask[]>>(loadUserTasks())
let nextId = loadNextId()

function loadUserTasks(): Record<string, CalTask[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CalTask[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function loadNextId(): number {
  try {
    const raw = localStorage.getItem(ID_KEY)
    const n = raw ? Number(raw) : NaN
    if (!isNaN(n) && n > 0) return n
  } catch {
    /* ignore */
  }
  return 2000
}

function persistUserTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userTasksByDate.value))
  localStorage.setItem(ID_KEY, String(nextId))
}

function mergePorFecha(): Record<string, CalTask[]> {
  const merged: Record<string, CalTask[]> = {}
  for (const [date, tasks] of Object.entries(userTasksByDate.value)) {
    merged[date] = [...tasks]
  }
  for (const date of Object.keys(merged)) {
    merged[date].sort((a, b) => {
      const aDone = a.completed ? 1 : 0
      const bDone = b.completed ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      const aMin = a.time ? parseTimeToMinutes(a.time) : 24 * 60
      const bMin = b.time ? parseTimeToMinutes(b.time) : 24 * 60
      if (aMin !== bMin) return aMin - bMin
      return a.title.localeCompare(b.title, 'es')
    })
  }
  return merged
}

function flattenTasks(map: Record<string, CalTask[]>): CalTask[] {
  return Object.entries(map)
    .flatMap(([date, tasks]) => tasks.map((t) => ({ ...t, date })))
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date)
      if (dateCmp !== 0) return dateCmp
      const aDone = a.completed ? 1 : 0
      const bDone = b.completed ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      return a.title.localeCompare(b.title, 'es')
    })
}

export function useCalendarioEscolarTasks() {
  if (useApi()) return useCalendarioEscolarTasksApi()
  const porFecha = computed(() => mergePorFecha())
  const todasLasTareas = computed(() => flattenTasks(porFecha.value))

  function tareasDelDia(ymd: string | null): CalTask[] {
    if (!ymd) return []
    return porFecha.value[ymd] ?? []
  }

  function reload(): void {
    userTasksByDate.value = loadUserTasks()
    nextId = loadNextId()
  }

  function addTask(input: NuevaCalendarioTarea): CalTask | null {
    const title = input.title.trim()
    if (!title || !input.date || isDateBeforeToday(input.date)) return null

    const allDay = input.allDay === true
    const time = !allDay && input.time?.trim() ? input.time.trim() : undefined
    let endTime = !allDay && input.endTime?.trim() ? input.endTime.trim() : undefined
    if (time && !endTime) {
      const endMin = parseTimeToMinutes(time) + 30
      endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
    }

    const task: CalTask = {
      id: String(nextId++),
      date: input.date,
      title,
      description: input.description?.trim() || undefined,
      tipo: input.tipo ?? DEFAULT_TASK_TIPO.name,
      cuadrante: input.cuadrante ?? DEFAULT_TASK_CUADRANTE.name,
      eventId: input.eventId ?? null,
      time,
      endTime,
      allDay: allDay || undefined,
      recurrence: input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined,
    }

    const list = userTasksByDate.value[input.date] ?? []
    userTasksByDate.value = {
      ...userTasksByDate.value,
      [input.date]: [...list, task],
    }
    persistUserTasks()
    return task
  }

  function addTaskWithRecurrence(input: NuevaCalendarioTarea): CalTask[] {
    const preset = input.recurrence ?? 'none'
    const dates = expandRecurrenceDates(input.date, preset).filter((d) => !isDateBeforeToday(d))
    const created: CalTask[] = []
    for (const date of dates) {
      const task = addTask({ ...input, date, recurrence: preset })
      if (task) created.push(task)
    }
    return created
  }

  function moveTask(taskId: string, newDate: string, newTime: string | null): boolean {
    if (isDateBeforeToday(newDate)) return false
    let foundDate = ''
    let foundIndex = -1
    let task: CalTask | null = null

    for (const [date, tasks] of Object.entries(userTasksByDate.value)) {
      const idx = tasks.findIndex((t) => t.id === taskId)
      if (idx >= 0) {
        foundDate = date
        foundIndex = idx
        task = tasks[idx]
        break
      }
    }
    if (!task || foundIndex < 0) return false
    if (!isCalendarModifyAllowed(foundDate, newDate)) return false

    let eventId = task.eventId ?? null
    if (eventId && newDate !== foundDate) {
      eventId = null
    }

    const moved: CalTask = {
      ...task,
      date: newDate,
      eventId,
      time: newTime?.trim() || undefined,
      endTime: task.endTime,
    }

    const next = { ...userTasksByDate.value }
    const oldList = [...(next[foundDate] ?? [])]
    oldList.splice(foundIndex, 1)
    if (oldList.length > 0) next[foundDate] = oldList
    else delete next[foundDate]

    next[newDate] = [...(next[newDate] ?? []), moved]
    userTasksByDate.value = next
    persistUserTasks()
    return true
  }

  function resizeTask(taskId: string, newEndTime: string): boolean {
    for (const [date, tasks] of Object.entries(userTasksByDate.value)) {
      const idx = tasks.findIndex((t) => t.id === taskId)
      if (idx < 0) continue
      if (!isCalendarModifyAllowed(date)) return false
      const task = tasks[idx]
      if (!task.time) return false

      const startMin = parseTimeToMinutes(task.time)
      let endMin = parseTimeToMinutes(newEndTime)
      if (endMin <= startMin) {
        endMin = startMin + 30
      }

      const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
      const next = [...tasks]
      next[idx] = { ...task, endTime }
      userTasksByDate.value = { ...userTasksByDate.value, [date]: next }
      persistUserTasks()
      return true
    }
    return false
  }

  function toggleCompletada(taskId: string): void {
    for (const [date, tasks] of Object.entries(userTasksByDate.value)) {
      const idx = tasks.findIndex((t) => t.id === taskId)
      if (idx < 0) continue
      const next = [...tasks]
      next[idx] = { ...next[idx], completed: !next[idx].completed }
      userTasksByDate.value = { ...userTasksByDate.value, [date]: next }
      persistUserTasks()
      return
    }
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
