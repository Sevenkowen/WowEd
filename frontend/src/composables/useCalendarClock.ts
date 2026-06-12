import { onMounted, onUnmounted, ref } from 'vue'

/** Hora actual reactiva para que las franjas pasadas del día se actualicen solas. */
export function useCalendarClock(intervalMs = 60_000) {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | undefined
  let alignTimer: ReturnType<typeof setTimeout> | undefined

  function tick() {
    now.value = new Date()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') tick()
  }

  onMounted(() => {
    tick()
    const msToNextMinute =
      (60 - now.value.getSeconds()) * 1000 - now.value.getMilliseconds()
    alignTimer = setTimeout(() => {
      tick()
      timer = setInterval(tick, intervalMs)
    }, Math.max(0, msToNextMinute))
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (alignTimer) clearTimeout(alignTimer)
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return now
}
