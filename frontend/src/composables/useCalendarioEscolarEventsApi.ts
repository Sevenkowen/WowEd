import { computed, ref } from 'vue'
import type { CalEvent } from '@/data/calendarioEscolarDemo'
import {
  apiCreateEvent,
  apiMoveEvent,
  apiResizeEvent,
  fetchEventsPorFecha,
  type CreateEventPayload,
} from '@/api/calendarioApi'
import { isCalendarModifyAllowed, isDateBeforeToday } from '@/utils/calendarioDates'
import type { CalRecurrencePreset } from '@/utils/calendarioRecurrence'
import { expandRecurrenceDates } from '@/utils/calendarioRecurrence'
import type { NuevoCalendarioEvento } from '@/composables/useCalendarioEscolarEvents'

const apiPorFecha = ref<Record<string, CalEvent[]>>({})

async function loadAll() {
  apiPorFecha.value = await fetchEventsPorFecha()
}

void loadAll()

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
    if (isDateBeforeToday(input.date)) return null
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
    if (!from || !isCalendarModifyAllowed(from, newDate)) return false
    await apiMoveEvent(eventId, newDate, newStartTime)
    await loadAll()
    return true
  }

  async function resizeEvent(eventId: string, newEndTime: string): Promise<boolean> {
    const date = findEventDate(apiPorFecha.value, eventId)
    if (!date || !isCalendarModifyAllowed(date)) return false
    await apiResizeEvent(eventId, newEndTime)
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
  }
}
