import { computed, type Ref } from 'vue'
import { formatTimeLabel } from '@/utils/calendarioEventTime'
import { isCalendarSlotCreateAllowed } from '@/utils/calendarioDates'

export function slotPastKey(date: string, time: string): string {
  return `${date}|${time}`
}

/** Mapa reactivo de franjas pasadas (día anterior o hora ya transcurrida hoy). */
export function useCalendarioPastSlots(
  now: Ref<Date>,
  dayStartMinutes: number,
  gridRows: number,
  getDays: () => { date: string }[],
) {
  const pastSlotKeys = computed(() => {
    const current = now.value
    const keys = new Set<string>()
    for (const day of getDays()) {
      for (let row = 2; row < gridRows; row++) {
        const slotIndex = row - 2
        const minutes = dayStartMinutes + slotIndex * 30
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        const time = formatTimeLabel(h, m)
        if (!isCalendarSlotCreateAllowed(day.date, time, current)) {
          keys.add(slotPastKey(day.date, time))
        }
      }
    }
    return keys
  })

  function isSlotDisabled(date: string, startTime: string): boolean {
    return pastSlotKeys.value.has(slotPastKey(date, startTime))
  }

  return { pastSlotKeys, isSlotDisabled }
}
