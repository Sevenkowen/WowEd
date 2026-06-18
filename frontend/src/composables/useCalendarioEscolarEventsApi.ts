import { computed, ref } from 'vue'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import {
  apiCreateEvent,
  apiDeleteEvent,
  apiMoveEvent,
  apiPatchEvent,
  apiResizeEvent,
  fetchEventsPorFecha,
  type CreateEventPayload,
} from '@/api/calendarioApi'
import {
  isCalendarModifyAllowed,
  isCalendarSlotCreateAllowed,
  isDateBeforeToday,
} from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'
import { moveCalEvent, resizeCalEvent } from '@/utils/calendarioEventTime'
import type { NuevoCalendarioEvento } from '@/composables/useCalendarioEscolarEvents'

const apiPorFecha = ref<Record<string, CalEvent[]>>({})

async function loadAll() {
  apiPorFecha.value = await fetchEventsPorFecha()
}

void loadAll()

function patchEventInMap(
  map: Record<string, CalEvent[]>,
  eventId: string,
  patch: (event: CalEvent) => CalEvent,
): Record<string, CalEvent[]> {
  for (const [date, events] of Object.entries(map)) {
    const idx = events.findIndex((e) => e.id === eventId)
    if (idx < 0) continue
    const next = { ...map }
    const list = [...events]
    list[idx] = patch(list[idx])
    next[date] = list
    return next
  }
  return map
}

function moveEventInMap(
  map: Record<string, CalEvent[]>,
  eventId: string,
  newDate: string,
  newStartTime: string,
): Record<string, CalEvent[]> {
  const from = findEventDate(map, eventId)
  if (!from) return map
  const fromList = map[from] ?? []
  const idx = fromList.findIndex((e) => e.id === eventId)
  if (idx < 0) return map

  const moved = moveCalEvent(fromList[idx], newDate, newStartTime)
  if (from === newDate) {
    const next = { ...map }
    const list = [...fromList]
    list[idx] = moved
    next[from] = list
    return next
  }

  const next = { ...map }
  const oldList = [...fromList]
  oldList.splice(idx, 1)
  if (oldList.length) next[from] = oldList
  else delete next[from]
  next[newDate] = [...(next[newDate] ?? []), moved]
  return next
}

function findEventDate(map: Record<string, CalEvent[]>, eventId: string): string | null {
  for (const [date, events] of Object.entries(map)) {
    if (events.some((e) => e.id === eventId)) return date
  }
  return null
}

export function useCalendarioEscolarEventsApi() {
  const porFecha = computed(() => apiPorFecha.value)

  function eventosDelDia(ymd: string | null): CalEvent[] {
    if (!ymd) return []
    return porFecha.value[ymd] ?? []
  }

  function isUserEvent(_eventId: string): boolean {
    return true
  }

  async function reload(): Promise<void> {
    await loadAll()
  }

  async function addEvent(input: NuevoCalendarioEvento): Promise<CalEvent | null> {
    if (
      !isCalendarSlotCreateAllowed(
        input.date,
        input.allDay ? null : input.startTime,
      )
    ) {
      return null
    }
    const payload: CreateEventPayload = {
      date: input.date,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      allDay: input.allDay,
      eventType: input.eventType,
      recurrence: input.recurrence,
    }
    const ev = await apiCreateEvent(payload)
    await loadAll()
    return ev
  }

  async function addEventWithRecurrence(input: NuevoCalendarioEvento): Promise<CalEvent[]> {
    const preset = (input.recurrence ?? 'none') as CalRecurrencePreset
    const dates = expandRecurrenceDates(input.date, preset).filter((d) => !isDateBeforeToday(d))
    const created: CalEvent[] = []
    for (const date of dates) {
      const ev = await apiCreateEvent({
        date,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        allDay: input.allDay,
        eventType: input.eventType,
        recurrence: preset,
      })
      created.push(ev)
    }
    await loadAll()
    return created
  }

  async function moveEvent(eventId: string, newDate: string, newStartTime: string): Promise<boolean> {
    const from = findEventDate(apiPorFecha.value, eventId)
    if (!from || !isCalendarModifyAllowed(from, newDate, newStartTime)) return false

    const snapshot = apiPorFecha.value
    apiPorFecha.value = moveEventInMap(snapshot, eventId, newDate, newStartTime)

    try {
      await apiMoveEvent(eventId, newDate, newStartTime)
      await loadAll()
      return true
    } catch {
      apiPorFecha.value = snapshot
      return false
    }
  }

  async function resizeEvent(eventId: string, newEndTime: string): Promise<boolean> {
    const date = findEventDate(apiPorFecha.value, eventId)
    if (!date || !isCalendarModifyAllowed(date)) return false

    const snapshot = apiPorFecha.value
    apiPorFecha.value = patchEventInMap(snapshot, eventId, (event) =>
      resizeCalEvent(event, date, newEndTime),
    )

    try {
      await apiResizeEvent(eventId, newEndTime)
      await loadAll()
      return true
    } catch {
      apiPorFecha.value = snapshot
      return false
    }
  }

  async function patchEvent(
    eventId: string,
    patch: {
      title?: string
      description?: string
      date?: string
      startTime?: string
      endTime?: string
      allDay?: boolean
      eventType?: string
    },
  ): Promise<boolean> {
    const date = findEventDate(apiPorFecha.value, eventId)
    if (!date || !isCalendarModifyAllowed(date, patch.date)) return false
    await apiPatchEvent(eventId, patch)
    await loadAll()
    return true
  }

  async function deleteEvent(eventId: string): Promise<boolean> {
    const date = findEventDate(apiPorFecha.value, eventId)
    if (!date || !isCalendarModifyAllowed(date)) return false
    await apiDeleteEvent(eventId)
    await loadAll()
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
