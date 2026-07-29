import { ref } from 'vue'
import { fetchInstitutionUsers, type InstitutionUser } from '@/api/institutionApi'
import { useApi } from '@/api/http'

const users = ref<InstitutionUser[]>([])
const loaded = ref(false)
let loading: Promise<void> | null = null

async function loadUsers(): Promise<void> {
  if (!useApi()) {
    users.value = []
    loaded.value = true
    return
  }
  if (loading) {
    await loading
    return
  }
  loading = (async () => {
    try {
      users.value = await fetchInstitutionUsers()
      loaded.value = true
    } finally {
      loading = null
    }
  })()
  await loading
}

export function useInstitutionUsers() {
  return {
    users,
    loaded,
    loadUsers,
  }
}
