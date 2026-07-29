import { computed, ref, watch } from 'vue'
import {
  fetchAllSuperadminInstitutions,
  type SuperadminInstitution,
} from '@/api/superadminApi'

const STORAGE_KEY = 'wowed:superadmin:institutionId'

const institutions = ref<SuperadminInstitution[]>([])
const selectedInstitutionId = ref(localStorage.getItem(STORAGE_KEY) ?? '')
const loadingInstitutions = ref(false)
let loadPromise: Promise<void> | null = null

watch(selectedInstitutionId, (id) => {
  if (id) localStorage.setItem(STORAGE_KEY, id)
  else localStorage.removeItem(STORAGE_KEY)
})

async function loadInstitutions(force = false) {
  if (!force && institutions.value.length) return
  if (loadPromise) return loadPromise

  loadingInstitutions.value = true
  loadPromise = (async () => {
    try {
      institutions.value = await fetchAllSuperadminInstitutions()
      if (
        selectedInstitutionId.value &&
        !institutions.value.some((i) => i.id === selectedInstitutionId.value)
      ) {
        selectedInstitutionId.value = ''
      }
      if (!selectedInstitutionId.value && institutions.value.length) {
        selectedInstitutionId.value = institutions.value[0].id
      }
    } finally {
      loadingInstitutions.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

function invalidateInstitutions() {
  institutions.value = []
  loadPromise = null
}

export function useSuperadminContext() {
  const selectedInstitution = computed(
    () => institutions.value.find((i) => i.id === selectedInstitutionId.value) ?? null,
  )

  return {
    institutions,
    selectedInstitutionId,
    selectedInstitution,
    loadingInstitutions,
    loadInstitutions,
    invalidateInstitutions,
  }
}
