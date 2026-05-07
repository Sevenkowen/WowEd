import { computed, ref, watch } from 'vue'

export type ColorMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'wowed-color-mode'

export const colorMode = ref<ColorMode>('system')

const systemPrefersDark = ref(false)

let initialized = false

function readStored(): ColorMode {
  if (typeof window === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

function syncSystemFlag(): void {
  if (typeof window === 'undefined') return
  systemPrefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const isDark = computed(
  () => colorMode.value === 'dark' || (colorMode.value === 'system' && systemPrefersDark.value),
)

function applyHtmlClass(): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark.value)
}

export function setColorMode(mode: ColorMode): void {
  colorMode.value = mode
}

/** Llamar una sola vez al arranque (main.ts). */
export function initColorMode(): void {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  colorMode.value = readStored()
  syncSystemFlag()
  applyHtmlClass()

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncSystemFlag)

  watch(colorMode, (m) => {
    localStorage.setItem(STORAGE_KEY, m)
  })

  watch(
    isDark,
    () => {
      applyHtmlClass()
    },
    { flush: 'sync' },
  )
}
