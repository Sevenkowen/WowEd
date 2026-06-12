import { computed, nextTick, type Ref } from 'vue'
import { formatTimeLabel } from '@/utils/calendarioEventTime'

export interface CalendarioNowLineConfig {
  now: Ref<Date>
  dayStartMinutes: number
  gridRows: number
  /** true si hoy está visible en la grilla (columna o día enfocado). */
  isTodayVisible: () => boolean
}

const DAY_END_MINUTES = 24 * 60

export function useCalendarioNowLine(config: CalendarioNowLineConfig) {
  const nowLineState = computed(() => {
    if (!config.isTodayVisible()) return null

    const n = config.now.value
    const nowMinutes = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60
    if (nowMinutes < config.dayStartMinutes || nowMinutes >= DAY_END_MINUTES) return null

    const slotOffset = (nowMinutes - config.dayStartMinutes) / 30
    const rowOffset = 1 + slotOffset
    const topPercent = (rowOffset / config.gridRows) * 100
    const h = Math.floor(nowMinutes / 60) % 24
    const m = Math.floor(nowMinutes % 60)

    return {
      topPercent,
      label: formatTimeLabel(h, m),
    }
  })

  const showNowLine = computed(() => nowLineState.value !== null)
  const nowLineTopPercent = computed(() => nowLineState.value?.topPercent ?? 0)
  const nowLineLabel = computed(() => nowLineState.value?.label ?? '')

  async function scrollToNowCentered(
    scrollEl: HTMLElement | null,
    gridEl: HTMLElement | null,
  ): Promise<void> {
    const state = nowLineState.value
    if (!scrollEl || !gridEl || !state) return

    await nextTick()
    requestAnimationFrame(() => {
      const scrollRect = scrollEl.getBoundingClientRect()
      const gridRect = gridEl.getBoundingClientRect()
      const gridTopInScroll = gridRect.top - scrollRect.top + scrollEl.scrollTop
      const lineTop = gridTopInScroll + (state.topPercent / 100) * gridEl.offsetHeight
      const ideal = lineTop - scrollEl.clientHeight / 2
      const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
      scrollEl.scrollTop = Math.max(0, Math.min(ideal, maxScroll))
    })
  }

  return { showNowLine, nowLineTopPercent, nowLineLabel, scrollToNowCentered }
}
