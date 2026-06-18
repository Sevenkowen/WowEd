import { computed, ref } from 'vue'
import { useApi } from '@/api/http'
import { useCalendarioEscolarEventsApi } from '@/composables/useCalendarioEscolarEventsApi'
import { demoPorFecha, type CalEvent } from '@/data/calendarioEscolarDemo'
import {
  buildEventDatetime,
  ALL_DAY_EVENT_LABEL,
  endMinutesFromEvent,
  formatEventTimeRange,
  formatTimeLabel,
  isAllDayEvent,
  minutesFromEvent,
  parseTimeToMinutes,
  resizeCalEvent,
  moveCalEvent,
} from '@/utils/calendarioEventTime'
import {
  isCalendarModifyAllowed,
  isCalendarSlotCreateAllowed,
  isDateBeforeToday,
} from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'

const STORAGE_KEY = 'wowed-calendario-escolar-eventos'
const ID_KEY = 'wowed-calendario-escolar-eventos-next-id'
const RELOCATED_DEMO_KEY = 'wowed-calendario-escolar-demo-reubicados'

export interface NuevoCalendarioEvento {
  date: string
  title: string
  description?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  recurrence?: CalRecurrencePreset
  eventType?: string
}

export interface UpdateCalendarioEvento {
  title?: string
  description?: string
  date?: string
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
  eventType?: string
}

const userEventsByDate = ref<Record<string, CalEvent[]>>(loadUserEvents())
const relocatedDemoEventIds = ref<Set<string>>(loadRelocatedDemoIds())
let nextId = loadNextId()

function loadRelocatedDemoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(RELOCATED_DEMO_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as (number | string)[]
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function persistRelocatedDemoIds() {
  localStorage.setItem(RELOCATED_DEMO_KEY, JSON.stringify([...relocatedDemoEventIds.value]))
}

function loadUserEvents(): Record<string, CalEvent[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CalEvent[]>
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
  const demoIds = Object.values(demoPorFecha).flatMap((list) =>
    list.map((e) => {
      const n = Number(e.id)
      return Number.isFinite(n) ? n : 0
    }),
  )
  return demoIds.length > 0 ? Math.max(...demoIds) + 1 : 1000
}

function persistUserEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userEventsByDate.value))
  localStorage.setItem(ID_KEY, String(nextId))
}

function mergePorFecha(): Record<string, CalEvent[]> {
  const merged: Record<string, CalEvent[]> = {}
  for (const [date, events] of Object.entries(demoPorFecha)) {
    merged[date] = events.filter((e) => !relocatedDemoEventIds.value.has(e.id))
  }
  for (const [date, events] of Object.entries(userEventsByDate.value)) {
    merged[date] = [...(merged[date] ?? []), ...events]
  }
  for (const date of Object.keys(merged)) {
    merged[date].sort((a, b) => a.datetime.localeCompare(b.datetime))
  }
  return merged
}

function findDemoEvent(eventId: string): CalEvent | null {
  for (const events of Object.values(demoPorFecha)) {
    const ev = events.find((e) => String(e.id) === String(eventId))
    if (ev) return ev
  }
  return null
}

function buildResizedEvent(source: CalEvent, date: string, newEndTime: string, newId?: string): CalEvent {
  const resized = resizeCalEvent(source, date, newEndTime)
  return newId ? { ...resized, id: newId } : resized
}

function buildMovedEvent(source: CalEvent, newDate: string, newStartTime: string, newId?: string): CalEvent {
  const moved = moveCalEvent(source, newDate, newStartTime)
  return newId ? { ...moved, id: newId } : moved
}

function buildEventFromInput(input: NuevoCalendarioEvento, date: string, id?: string): CalEvent | null {
  const title = input.title.trim()
  if (!title || !date) return null

  const allDay = input.allDay === true
  if (allDay) {
    return {
      id: id ?? String(nextId++),
      name: title,
      description: input.description?.trim() || undefined,
      eventType: input.eventType,
      time: ALL_DAY_EVENT_LABEL,
      datetime: `${date}T00:00`,
      href: '#',
      allDay: true,
      recurrence: input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined,
    }
  }

  const startTime = input.startTime?.trim()
  const endTime = input.endTime?.trim()
  if (!startTime || !endTime) return null
  if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) return null

  return {
    id: id ?? String(nextId++),
    name: title,
    description: input.description?.trim() || undefined,
    eventType: input.eventType,
    time: formatEventTimeRange(startTime, endTime),
    datetime: buildEventDatetime(date, startTime),
    endDatetime: buildEventDatetime(date, endTime),
    href: '#',
    recurrence: input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined,
  }
}

function findUserEvent(eventId: string): { date: string; index: number; event: CalEvent } | null {
  for (const [date, events] of Object.entries(userEventsByDate.value)) {
    const index = events.findIndex((e) => String(e.id) === String(eventId))
    if (index >= 0) return { date, index, event: events[index] }
  }
  return null
}

function eventFieldsToInput(ev: CalEvent, date: string): NuevoCalendarioEvento {
  if (isAllDayEvent(ev)) {
    return {
      date,
      title: ev.name,
      description: ev.description,
      allDay: true,
      eventType: ev.eventType,
    }
  }
  const startMin = minutesFromEvent(ev)
  const endMin = endMinutesFromEvent(ev)
  const startTime =
    startMin !== null
      ? formatTimeLabel(Math.floor(startMin / 60) % 24, startMin % 60)
      : '09:00'
  const endTime = formatTimeLabel(Math.floor(endMin / 60) % 24, endMin % 60)
  return {
    date,
    title: ev.name,
    description: ev.description,
    allDay: false,
    startTime,
    endTime,
    eventType: ev.eventType,
  }
}

function mergeEventPatch(ev: CalEvent, date: string, patch: UpdateCalendarioEvento): NuevoCalendarioEvento {
  const current = eventFieldsToInput(ev, date)
  const newDate = patch.date ?? date
  const allDay = patch.allDay ?? current.allDay ?? false
  return {
    date: newDate,
    title: patch.title ?? current.title,
    description: patch.description !== undefined ? patch.description : current.description,
    allDay,
    startTime:
      patch.startTime !== undefined
        ? patch.startTime ?? undefined
        : current.startTime,
    endTime:
      patch.endTime !== undefined ? patch.endTime ?? undefined : current.endTime,
    eventType: patch.eventType ?? current.eventType,
  }
}

function applyEventPatch(eventId: string, patch: UpdateCalendarioEvento, sourceId?: string): boolean {
  const found = findUserEvent(eventId)
  if (found) {
    const newDate = patch.date ?? found.date
    const startForCheck = patch.allDay
      ? null
      : (patch.startTime !== undefined ? patch.startTime : eventFieldsToInput(found.event, found.date).startTime) ?? null
    if (!isCalendarModifyAllowed(found.date, newDate, startForCheck)) return false
    if (!isCalendarSlotCreateAllowed(newDate, patch.allDay ? null : startForCheck)) return false

    const merged = mergeEventPatch(found.event, found.date, patch)
    const rebuilt = buildEventFromInput(merged, newDate, sourceId ?? found.event.id)
    if (!rebuilt) return false

    let next = removeFromDateMap(userEventsByDate.value, found.date, found.index)
    next = { ...next, [newDate]: [...(next[newDate] ?? []), rebuilt] }
    userEventsByDate.value = next
    persistUserEvents()
    return true
  }

  const demoEvent = findDemoEvent(eventId)
  if (!demoEvent) return false
  const demoDate = demoEvent.datetime.slice(0, 10)
  const newDate = patch.date ?? demoDate
  const startForCheck = patch.allDay
    ? null
    : (patch.startTime !== undefined ? patch.startTime : eventFieldsToInput(demoEvent, demoDate).startTime) ?? null
  if (!isCalendarModifyAllowed(demoDate, newDate, startForCheck)) return false
  if (!isCalendarSlotCreateAllowed(newDate, patch.allDay ? null : startForCheck)) return false

  const merged = mergeEventPatch(demoEvent, demoDate, patch)
  const newId = sourceId ?? String(nextId++)
  const rebuilt = buildEventFromInput(merged, newDate, newId)
  if (!rebuilt) return false

  userEventsByDate.value = {
    ...userEventsByDate.value,
    [newDate]: [...(userEventsByDate.value[newDate] ?? []), rebuilt],
  }
  relocatedDemoEventIds.value = new Set([...relocatedDemoEventIds.value, eventId])
  persistUserEvents()
  persistRelocatedDemoIds()
  return true
}

function removeFromDateMap(
  map: Record<string, CalEvent[]>,
  date: string,
  index: number,
): Record<string, CalEvent[]> {
  const next = { ...map }
  const list = [...(next[date] ?? [])]
  list.splice(index, 1)
  if (list.length > 0) next[date] = list
  else delete next[date]
  return next
}

export function useCalendarioEscolarEvents() {
  if (useApi()) return useCalendarioEscolarEventsApi()
  const porFecha = computed(() => mergePorFecha())

  function eventosDelDia(ymd: string | null): CalEvent[] {
    if (!ymd) return []
    return porFecha.value[ymd] ?? []
  }

  function isUserEvent(eventId: string): boolean {
    return findUserEvent(eventId) !== null
  }

  function reload(): void {
    userEventsByDate.value = loadUserEvents()
    relocatedDemoEventIds.value = loadRelocatedDemoIds()
    nextId = loadNextId()
  }

  function addEvent(input: NuevoCalendarioEvento): CalEvent | null {
    if (
      !isCalendarSlotCreateAllowed(
        input.date,
        input.allDay ? null : input.startTime,
      )
    ) {
      return null
    }
    const event = buildEventFromInput(input, input.date)
    if (!event) return null

    const list = userEventsByDate.value[input.date] ?? []
    userEventsByDate.value = {
      ...userEventsByDate.value,
      [input.date]: [...list, event],
    }
    persistUserEvents()
    return event
  }

  function addEventWithRecurrence(input: NuevoCalendarioEvento): CalEvent[] {
    const preset = input.recurrence ?? 'none'
    const dates = expandRecurrenceDates(input.date, preset).filter((d) => !isDateBeforeToday(d))
    const created: CalEvent[] = []
    for (const date of dates) {
      const event = buildEventFromInput({ ...input, date, recurrence: preset }, date)
      if (!event) continue
      const list = userEventsByDate.value[date] ?? []
      userEventsByDate.value = {
        ...userEventsByDate.value,
        [date]: [...list, event],
      }
      created.push(event)
    }
    if (created.length > 0) persistUserEvents()
    return created
  }

  function moveEvent(eventId: string, newDate: string, newStartTime: string): boolean {
    if (isDateBeforeToday(newDate)) return false
    const found = findUserEvent(eventId)
    if (found && !isCalendarModifyAllowed(found.date, newDate, newStartTime)) return false
    if (found) {
      const moved = buildMovedEvent(found.event, newDate, newStartTime)
      let next = removeFromDateMap(userEventsByDate.value, found.date, found.index)
      next = {
        ...next,
        [newDate]: [...(next[newDate] ?? []), moved],
      }
      userEventsByDate.value = next
      persistUserEvents()
      return true
    }

    const demoEvent = findDemoEvent(eventId)
    if (!demoEvent) return false
    const demoDate = demoEvent.datetime.slice(0, 10)
    if (!isCalendarModifyAllowed(demoDate, newDate, newStartTime)) return false

    const copy = buildMovedEvent(demoEvent, newDate, newStartTime, String(nextId++))
    userEventsByDate.value = {
      ...userEventsByDate.value,
      [newDate]: [...(userEventsByDate.value[newDate] ?? []), copy],
    }
    relocatedDemoEventIds.value = new Set([...relocatedDemoEventIds.value, eventId])
    persistUserEvents()
    persistRelocatedDemoIds()
    return true
  }

  function resizeEvent(eventId: string, newEndTime: string): boolean {
    const found = findUserEvent(eventId)
    if (found && !isCalendarModifyAllowed(found.date)) return false
    if (found) {
      const resized = buildResizedEvent(found.event, found.date, newEndTime)
      const next = { ...userEventsByDate.value }
      const list = [...(next[found.date] ?? [])]
      list[found.index] = resized
      next[found.date] = list
      userEventsByDate.value = next
      persistUserEvents()
      return true
    }

    const demoEvent = findDemoEvent(eventId)
    if (!demoEvent) return false

    const date = demoEvent.datetime.slice(0, 10)
    if (!isCalendarModifyAllowed(date)) return false
    const copy = buildResizedEvent(demoEvent, date, newEndTime, String(nextId++))
    userEventsByDate.value = {
      ...userEventsByDate.value,
      [date]: [...(userEventsByDate.value[date] ?? []), copy],
    }
    relocatedDemoEventIds.value = new Set([...relocatedDemoEventIds.value, eventId])
    persistUserEvents()
    persistRelocatedDemoIds()
    return true
  }

  function patchEvent(eventId: string, patch: UpdateCalendarioEvento): boolean {
    return applyEventPatch(eventId, patch)
  }

  function deleteEvent(eventId: string): boolean {
    const found = findUserEvent(eventId)
    if (found) {
      if (!isCalendarModifyAllowed(found.date)) return false
      userEventsByDate.value = removeFromDateMap(userEventsByDate.value, found.date, found.index)
      persistUserEvents()
      return true
    }

    const demoEvent = findDemoEvent(eventId)
    if (!demoEvent) return false
    const date = demoEvent.datetime.slice(0, 10)
    if (!isCalendarModifyAllowed(date)) return false
    relocatedDemoEventIds.value = new Set([...relocatedDemoEventIds.value, eventId])
    persistRelocatedDemoIds()
    return true
  }

  return {
    porFecha,
    eventosDelDia,
    addEvent,
    addEventWithRecurrence,
    reload,
    isUserEvent,
    moveEvent,
    resizeEvent,
    patchEvent,
    deleteEvent,
  }
}
