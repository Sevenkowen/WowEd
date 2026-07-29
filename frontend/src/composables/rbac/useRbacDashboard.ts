import { computed, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import type { RbacDashboardModuleConfig, RbacDashboardStats } from '@/types/rbac'

export function useRbacDashboard(configSource: MaybeRefOrGetter<RbacDashboardModuleConfig>) {
  const config = computed(() => toValue(configSource))
  const stats = ref<RbacDashboardStats | null>(null)
  const loadingStats = ref(false)

  const actionCards = computed(() => config.value.buildCards(stats.value, loadingStats.value))

  async function loadStats() {
    loadingStats.value = true
    try {
      stats.value = await config.value.fetchStats()
    } finally {
      loadingStats.value = false
    }
  }

  onMounted(() => {
    void loadStats()
  })

  return {
    config,
    stats,
    loadingStats,
    actionCards,
  }
}
