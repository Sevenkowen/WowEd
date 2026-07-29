import { ref } from 'vue'

export interface CalendarioSearchFocusRequest {
  type: 'event' | 'task'
  id: string
  date: string
}

const searchFocusRequest = ref<CalendarioSearchFocusRequest | null>(null)

export function useCalendarioSearchFocus() {
  function requestSearchFocus(req: CalendarioSearchFocusRequest): void {
    searchFocusRequest.value = req
  }

  function clearSearchFocus(): void {
    searchFocusRequest.value = null
  }

  return {
    searchFocusRequest,
    requestSearchFocus,
    clearSearchFocus,
  }
}
