import { nextTick, watch, type Ref } from 'vue'
import type { CalEvent } from '@/data/calendarioEscolarTypes'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import type { CalendarioContentMode } from '@/utils/calendarioDates'
import { useCalendarioSearchFocus } from '@/composables/useCalendarioSearchFocus'

export function useCalendarioSearchFocusHandler(options: {
  selectedDate?: Ref<string | null>
  contentMode?: Ref<CalendarioContentMode>
  navigateToDate?: (date: string) => void
  openEventDetail: (event: CalEvent) => void
  openTaskDetail: (task: CalTask) => void
  findEvent: (id: string) => CalEvent | null
  findTask: (id: string) => CalTask | null
}): void {
  const { searchFocusRequest, clearSearchFocus } = useCalendarioSearchFocus()

  watch(
    searchFocusRequest,
    async (req) => {
      if (!req) return

      if (options.selectedDate) options.selectedDate.value = req.date
      if (options.contentMode && req.type === 'event') {
        options.contentMode.value = 'calendario'
      }
      options.navigateToDate?.(req.date)

      await nextTick()

      if (req.type === 'event') {
        const event = options.findEvent(req.id)
        if (event) options.openEventDetail(event)
      } else {
        const task = options.findTask(req.id)
        if (task) options.openTaskDetail(task)
      }

      clearSearchFocus()
    },
    { flush: 'post' },
  )
}
