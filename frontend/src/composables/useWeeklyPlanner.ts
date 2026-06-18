import { onMounted, ref } from 'vue'
import { useApi } from '@/api/http'
import {
  fetchWeeklyPlanner,
  saveWeeklyPlanner,
  type DayId,
  type DelegatedTaskDto,
  type QuadrantId,
  type ScheduleBlockDto,
} from '@/api/weeklyPlannerApi'

export type { DayId, QuadrantId } from '@/api/weeklyPlannerApi'

export type TaskItem = { id: string; text: string }
export type BlockType = 'P' | 'A' | 'SC' | 'F' | 'PE'
export type WeekBlock = ScheduleBlockDto & { type: BlockType }
export type DelegatedStatus = 'En progreso' | 'Pendiente' | 'Completada'
export type DelegatedTask = DelegatedTaskDto & { status: DelegatedStatus }

const QUADRANTS: QuadrantId[] = ['ui', 'nui', 'uni', 'nuni']
const DAYS: DayId[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

function emptyMatrix(): Record<QuadrantId, TaskItem[]> {
  return { ui: [], nui: [], uni: [], nuni: [] }
}

function emptySchedule(): Record<DayId, WeekBlock[]> {
  return { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] }
}

function getIsoWeekYear(date = new Date()): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

const DEMO_TAREAS: Record<QuadrantId, TaskItem[]> = {
  ui: [{ id: 'ui-1', text: 'Resolver situación de alumno en riesgo' }],
  nui: [
    { id: 'nui-1', text: 'Revisar planificaciones docentes' },
    { id: 'nui-2', text: 'Preparar reunión pedagógica' },
  ],
  uni: [
    { id: 'uni-1', text: 'Responder correos pendientes' },
    { id: 'uni-2', text: 'Atender reclamo de proveedor' },
  ],
  nuni: [{ id: 'nuni-1', text: 'Actualizar redes sociales' }],
}

const DEMO_SCHEDULE: Record<DayId, WeekBlock[]> = {
  lunes: [
    { id: 'b1', start: '08:00', end: '09:00', type: 'P', title: 'Observación de clases' },
    { id: 'b2', start: '09:00', end: '10:00', type: 'P', title: 'Seguimiento docente' },
    { id: 'b3', start: '10:00', end: '11:00', type: 'A', title: 'Reunión administrativa' },
    { id: 'b4', start: '11:00', end: '12:00', type: 'F', title: 'Tiempo flexible' },
    { id: 'b5', start: '12:00', end: '13:00', type: 'PE', title: 'Almuerzo' },
    { id: 'b6', start: '13:00', end: '14:00', type: 'SC', title: 'Atención a familias' },
  ],
  martes: [
    { id: 'b7', start: '08:00', end: '10:00', type: 'P', title: 'Capacitación docente' },
    { id: 'b8', start: '10:00', end: '11:00', type: 'A', title: 'Tareas administrativas' },
    { id: 'b9', start: '11:00', end: '12:00', type: 'F', title: 'Tiempo flexible' },
    { id: 'b10', start: '12:00', end: '13:00', type: 'PE', title: 'Almuerzo' },
    { id: 'b11', start: '13:00', end: '15:00', type: 'P', title: 'Reunión equipo directivo' },
  ],
  miercoles: [
    { id: 'b12', start: '08:00', end: '09:00', type: 'P', title: 'Revisión planificaciones' },
    { id: 'b13', start: '09:00', end: '11:00', type: 'SC', title: 'Reunión consejo escolar' },
    { id: 'b14', start: '11:00', end: '12:00', type: 'F', title: 'Tiempo flexible' },
    { id: 'b15', start: '12:00', end: '13:00', type: 'PE', title: 'Almuerzo' },
    { id: 'b16', start: '13:00', end: '15:00', type: 'A', title: 'Elaboración de informes' },
  ],
  jueves: [
    { id: 'b17', start: '08:00', end: '10:00', type: 'P', title: 'Observación de clases' },
    { id: 'b18', start: '10:00', end: '11:00', type: 'F', title: 'Tiempo flexible' },
    { id: 'b19', start: '11:00', end: '12:00', type: 'A', title: 'Reunión con proveedores' },
    { id: 'b20', start: '12:00', end: '13:00', type: 'PE', title: 'Almuerzo' },
    { id: 'b21', start: '13:00', end: '15:00', type: 'SC', title: 'Encuentro con familias' },
  ],
  viernes: [
    { id: 'b22', start: '08:00', end: '09:00', type: 'A', title: 'Revisión presupuesto' },
    { id: 'b23', start: '09:00', end: '11:00', type: 'P', title: 'Reunión equipo docente' },
    { id: 'b24', start: '11:00', end: '12:00', type: 'F', title: 'Tiempo flexible' },
    { id: 'b25', start: '12:00', end: '13:00', type: 'PE', title: 'Almuerzo' },
    { id: 'b26', start: '13:00', end: '14:00', type: 'SC', title: 'Comunicación institucional' },
    { id: 'b27', start: '14:00', end: '15:00', type: 'A', title: 'Cierre semanal' },
  ],
}

const DEMO_DELEGATED: DelegatedTask[] = [
  {
    id: 'dt-1',
    title: 'Completar informe mensual de asistencia',
    assignee: 'María López (Secretaria)',
    due: '2025-05-19',
    followUp: '2025-05-17',
    status: 'En progreso',
  },
  {
    id: 'dt-2',
    title: 'Coordinar visita del equipo de orientación',
    assignee: 'Carlos Gómez (Vicedirector)',
    due: '2025-05-18',
    followUp: '2025-05-16',
    status: 'Pendiente',
  },
  {
    id: 'dt-3',
    title: 'Actualizar cartelera institucional',
    assignee: 'Laura Martínez (Docente)',
    due: '2025-05-20',
    followUp: '2025-05-14',
    status: 'Completada',
  },
]

export function useWeeklyPlanner() {
  const { year, week } = getIsoWeekYear()
  const plannerYear = ref(year)
  const plannerWeek = ref(week)
  const focoSemanal = ref('Mejorar las estrategias de enseñanza de comprensión lectora')
  const tareas = ref<Record<QuadrantId, TaskItem[]>>({ ...DEMO_TAREAS })
  const schedule = ref<Record<DayId, WeekBlock[]>>({ ...DEMO_SCHEDULE })
  const delegatedTasks = ref<DelegatedTask[]>([...DEMO_DELEGATED])
  const saving = ref(false)
  const loadError = ref('')

  function applyDto(dto: Awaited<ReturnType<typeof fetchWeeklyPlanner>>) {
    plannerYear.value = dto.year
    plannerWeek.value = dto.week
    focoSemanal.value = dto.foco || ''
    const matrix = emptyMatrix()
    for (const q of QUADRANTS) {
      matrix[q] = (dto.matrix?.[q] ?? []).map((item) => ({ id: item.id, text: item.text }))
    }
    tareas.value = matrix
    const sched = emptySchedule()
    for (const d of DAYS) {
      sched[d] = (dto.schedule?.[d] ?? []).map((b) => ({
        id: b.id,
        start: b.start,
        end: b.end,
        type: b.type as BlockType,
        title: b.title,
      }))
    }
    schedule.value = sched
    delegatedTasks.value = (dto.delegated ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee,
      due: t.due,
      followUp: t.followUp,
      status: t.status as DelegatedStatus,
    }))
  }

  async function loadPlanner() {
    if (!useApi()) return
    loadError.value = ''
    try {
      const dto = await fetchWeeklyPlanner(plannerYear.value, plannerWeek.value)
      if (dto.foco || Object.values(dto.matrix ?? {}).some((l) => l.length > 0)) {
        applyDto(dto)
      }
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : 'No se pudo cargar el planificador.'
    }
  }

  async function persistPlanner() {
    if (!useApi()) return
    saving.value = true
    loadError.value = ''
    try {
      const saved = await saveWeeklyPlanner({
        year: plannerYear.value,
        week: plannerWeek.value,
        foco: focoSemanal.value,
        matrix: tareas.value,
        schedule: schedule.value,
        delegated: delegatedTasks.value,
      })
      applyDto(saved)
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : 'No se pudo guardar.'
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    void loadPlanner()
  })

  return {
    plannerYear,
    plannerWeek,
    focoSemanal,
    tareas,
    schedule,
    delegatedTasks,
    saving,
    loadError,
    persistPlanner,
    reloadPlanner: loadPlanner,
  }
}
