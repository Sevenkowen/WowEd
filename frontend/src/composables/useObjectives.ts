import { onMounted, ref } from 'vue'
import { useApi } from '@/api/http'
import {
  apiCreateObjective,
  apiDeleteObjective,
  apiUpdateObjective,
  fetchObjectives,
  type ObjectiveDto,
  type ObjectiveStatus,
} from '@/api/objectivesApi'

export type ObjectiveView = ObjectiveDto & { expanded: boolean }

const DEMO_OBJECTIVES: ObjectiveView[] = [
  {
    id: 'obj-1',
    title: 'Mejorar los niveles de comprensión lectora',
    description:
      'Incrementar en un 15% el nivel de comprensión lectora de los estudiantes, medido a través de evaluaciones estandarizadas.',
    indicators: [
      'Resultados en evaluaciones diagnósticas trimestrales',
      'Porcentaje de estudiantes que alcanzan nivel satisfactorio',
    ],
    responsables: ['Coordinación Académica', 'Docentes de Lenguaje'],
    plazo: 'Diciembre 2025',
    status: 'En Progreso',
    progress_pct: 0,
    sort_order: 0,
    expanded: false,
  },
  {
    id: 'obj-2',
    title: 'Implementar estrategias de educación emocional',
    description:
      'Desarrollar competencias socioemocionales en la comunidad educativa a través de un programa estructurado.',
    indicators: [
      'Número de talleres realizados',
      'Encuestas de clima escolar',
      'Reducción de conflictos registrados',
    ],
    responsables: ['Equipo de Orientación', 'Tutores'],
    plazo: 'Agosto 2025',
    status: 'En Progreso',
    progress_pct: 0,
    sort_order: 1,
    expanded: false,
  },
]

export function useObjectives() {
  const objetivos = ref<ObjectiveView[]>([])
  const loading = ref(false)
  const loadError = ref('')

  async function loadObjectives() {
    if (!useApi()) {
      objetivos.value = DEMO_OBJECTIVES.map((o) => ({ ...o }))
      return
    }
    loading.value = true
    loadError.value = ''
    try {
      const items = await fetchObjectives()
      objetivos.value = items.map((o) => ({ ...o, expanded: false }))
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : 'No se pudieron cargar los objetivos.'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void loadObjectives()
  })

  function toggleObjective(id: string) {
    objetivos.value = objetivos.value.map((o) => (o.id === id ? { ...o, expanded: !o.expanded } : o))
  }

  async function setObjectiveStatus(id: string, status: ObjectiveStatus) {
    const prev = objetivos.value.find((o) => o.id === id)?.status
    objetivos.value = objetivos.value.map((o) => (o.id === id ? { ...o, status } : o))
    if (!useApi()) return
    try {
      await apiUpdateObjective(id, { status })
    } catch (e) {
      objetivos.value = objetivos.value.map((o) =>
        o.id === id && prev ? { ...o, status: prev as ObjectiveStatus } : o,
      )
      loadError.value = e instanceof Error ? e.message : 'No se pudo actualizar el estado.'
    }
  }

  async function addObjective() {
    const title = window.prompt('Título del nuevo objetivo')
    if (!title?.trim()) return
    if (!useApi()) {
      objetivos.value = [
        ...objetivos.value,
        {
          id: `obj-${Date.now()}`,
          title: title.trim(),
          description: '',
          indicators: [],
          responsables: [],
          plazo: '',
          status: 'En Progreso',
          progress_pct: 0,
          sort_order: objetivos.value.length,
          expanded: false,
        },
      ]
      return
    }
    try {
      const created = await apiCreateObjective({ title: title.trim() })
      objetivos.value = [...objetivos.value, { ...created, expanded: false }]
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : 'No se pudo crear el objetivo.'
    }
  }

  async function removeObjective(id: string) {
    if (!window.confirm('¿Eliminar este objetivo?')) return
    const backup = objetivos.value
    objetivos.value = objetivos.value.filter((o) => o.id !== id)
    if (!useApi()) return
    try {
      await apiDeleteObjective(id)
    } catch (e) {
      objetivos.value = backup
      loadError.value = e instanceof Error ? e.message : 'No se pudo eliminar el objetivo.'
    }
  }

  return {
    objetivos,
    loading,
    loadError,
    toggleObjective,
    setObjectiveStatus,
    addObjective,
    removeObjective,
    reloadObjectives: loadObjectives,
  }
}
