import { ref, watch } from 'vue'

const STORAGE_KEY = 'wowed-sidebar-collapsed'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useSidebarCollapsed() {
  const collapsed = ref(readStored())

  watch(collapsed, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* ignore */
    }
  })

  function toggle(): void {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
