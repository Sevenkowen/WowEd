import { ref } from 'vue'
import { fetchLeadershipTeam, type LeadershipMember } from '@/api/institutionApi'
import { useApi } from '@/api/http'

const members = ref<LeadershipMember[]>([])
const loaded = ref(false)
const error = ref<string | null>(null)
let loading: Promise<void> | null = null

async function loadLeadershipTeam(): Promise<void> {
  if (!useApi()) {
    members.value = []
    loaded.value = true
    error.value = null
    return
  }
  if (loading) {
    await loading
    return
  }
  loading = (async () => {
    error.value = null
    try {
      members.value = await fetchLeadershipTeam()
      loaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el equipo directivo'
      members.value = []
      loaded.value = true
    } finally {
      loading = null
    }
  })()
  await loading
}

export function useLeadershipTeam() {
  return {
    members,
    loaded,
    error,
    loadLeadershipTeam,
  }
}

export function leadershipInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}
