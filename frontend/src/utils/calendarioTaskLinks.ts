import type { CalTask } from '@/data/calendarioEscolarTypes'
import { taskDisplayTitle } from '@/utils/calendarioTaskStyles'

/** Tareas vinculadas a un evento (comparación de id tolerante a string/uuid). */
export function compareLinkedTasks(a: CalTask, b: CalTask): number {
  const aTime = a.time ?? ''
  const bTime = b.time ?? ''
  if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime)
  return a.title.localeCompare(b.title, 'es')
}

export function tasksLinkedToEvent(tasks: CalTask[], eventId: string): CalTask[] {
  const needle = String(eventId)
  return tasks
    .filter((t) => t.eventId != null && String(t.eventId) === needle)
    .sort(compareLinkedTasks)
}

/** Tareas del día sin vínculo a evento (listas sueltas en mes / día). */
export function standaloneTasksForDay(tasks: CalTask[]): CalTask[] {
  return tasks.filter((t) => !t.eventId)
}

/** Mueve tareas vinculadas a un evento cuando el evento cambia de fecha (conserva el vínculo). */
export function moveLinkedTasksInMap(
  map: Record<string, CalTask[]>,
  eventId: string,
  newDate: string,
): Record<string, CalTask[]> {
  const needle = String(eventId)

  // Preservar el orden original del día (no iterar Object.values al azar).
  const linked: CalTask[] = []
  for (const date of Object.keys(map).sort()) {
    for (const task of map[date] ?? []) {
      if (task.eventId != null && String(task.eventId) === needle && task.date !== newDate) {
        linked.push(task)
      }
    }
  }
  if (!linked.length) return map

  let next = { ...map }
  for (const task of linked) {
    const oldDate = task.date
    const oldList = [...(next[oldDate] ?? [])]
    const idx = oldList.findIndex((t) => t.id === task.id)
    if (idx < 0) continue
    oldList.splice(idx, 1)
    if (oldList.length > 0) next[oldDate] = oldList
    else delete next[oldDate]
  }

  const moved = linked.map((task) => ({ ...task, date: newDate }))
  const existingOnNew = (next[newDate] ?? []).filter(
    (task) => !linked.some((item) => item.id === task.id),
  )
  next[newDate] = [...existingOnNew, ...moved]
  return next
}

/** Etiqueta corta: «1 tarea» / «2 tareas». */
export function eventTasksCountLabel(count: number): string {
  return count === 1 ? '1 tarea' : `${count} tareas`
}

export function eventTasksTooltip(tasks: CalTask[]): string {
  return tasks.map((t) => taskDisplayTitle(t)).join(' · ')
}

/**
 * Evento de media hora (1 franja): una sola línea, sin horario en el bloque.
 */
export function isMicroEventBlock(gridSpan: number): boolean {
  return gridSpan === 1
}

/**
 * Evento bajo en la grilla (≤1 h) o demasiadas tareas para el alto → mostrar resumen.
 * `gridSpan` = franjas de 30 min que ocupa el evento.
 */
export function shouldCompactEventTasks(gridSpan: number, taskCount: number): boolean {
  if (taskCount === 0) return false
  if (gridSpan <= 2) return true
  return taskCount > Math.max(1, gridSpan - 2)
}

/** Etiqueta mínima para badge en bloques de media hora (solo el número). */
export function eventTasksMicroLabel(count: number): string {
  return String(count)
}

/** Cuántas tareas listar con nombre antes de «+N más». */
export function eventTasksListLimit(gridSpan: number, taskCount: number): number {
  if (shouldCompactEventTasks(gridSpan, taskCount)) return 0
  return Math.min(taskCount, Math.max(1, gridSpan - 2))
}

/** Fecha y horario legibles para tarjetas de tarea. */
export function formatTaskScheduleLabel(task: CalTask): string {
  const [y, m, d] = task.date.split('-').map(Number)
  const datePart = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' }).format(
    new Date(y, m - 1, d),
  )
  if (task.allDay || !task.time) return datePart
  if (task.endTime && task.endTime !== task.time) {
    return `${datePart} · ${task.time} – ${task.endTime}`
  }
  return `${datePart} · ${task.time}`
}
