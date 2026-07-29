import { computed, ref } from 'vue'
import { useApi } from '@/api/http'
import {
  apiCreateEventType,
  apiCreateTaskType,
  apiDeleteEventType,
  apiDeleteTaskType,
  apiUpdateEventType,
  apiUpdateTaskType,
  fetchEventTypes,
  fetchTaskTypes,
} from '@/api/catalogApi'
import {
  DEFAULT_EVENT_CATALOG,
  DEFAULT_TASK_CATALOG,
  LEGACY_EVENT_TYPE_COLORS,
  type CalendarioCatalogItem,
} from '@/data/calendarioCatalogDefaults'

const EVENT_STORAGE_KEY = 'wowed-calendario-event-types'
const TASK_STORAGE_KEY = 'wowed-calendario-task-types'

const eventCatalog = ref<CalendarioCatalogItem[]>([])
const taskCatalog = ref<CalendarioCatalogItem[]>([])
const catalogLoaded = ref(false)
const catalogLoading = ref(false)
const catalogLoadError = ref('')
let loadPromise: Promise<void> | null = null

function seedDefaultCatalogs() {
  if (eventCatalog.value.length === 0) {
    eventCatalog.value = DEFAULT_EVENT_CATALOG.map((item) => ({ ...item }))
  }
  if (taskCatalog.value.length === 0) {
    taskCatalog.value = DEFAULT_TASK_CATALOG.map((item) => ({ ...item }))
  }
}

function loadCatalogLocal(key: string, defaults: CalendarioCatalogItem[]): CalendarioCatalogItem[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaults.map((item) => ({ ...item }))
    const parsed = JSON.parse(raw) as CalendarioCatalogItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) return defaults.map((item) => ({ ...item }))
    return parsed
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        name: item.name.trim(),
        color: item.color,
      }))
  } catch {
    return defaults.map((item) => ({ ...item }))
  }
}

function persistCatalogLocal(key: string, items: CalendarioCatalogItem[]) {
  localStorage.setItem(key, JSON.stringify(items))
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function newCatalogId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function refreshCatalogsFromApi(): Promise<void> {
  if (!useApi()) return
  try {
    const [events, tasks] = await Promise.all([fetchEventTypes(), fetchTaskTypes()])
    if (events.length > 0) eventCatalog.value = events
    if (tasks.length > 0) taskCatalog.value = tasks
  } catch {
    /* conservar estado en memoria */
  }
}

async function loadCatalogsFromApi(): Promise<void> {
  if (catalogLoaded.value) return
  if (loadPromise) return loadPromise
  seedDefaultCatalogs()
  catalogLoading.value = true
  catalogLoadError.value = ''
  loadPromise = (async () => {
    try {
      const [events, tasks] = await Promise.all([fetchEventTypes(), fetchTaskTypes()])
      if (events.length > 0) eventCatalog.value = events
      if (tasks.length > 0) taskCatalog.value = tasks
      catalogLoaded.value = true
    } catch (e) {
      catalogLoadError.value =
        e instanceof Error ? e.message : 'No se pudieron cargar los tipos desde el servidor.'
      catalogLoaded.value = true
    } finally {
      catalogLoading.value = false
    }
  })()
  await loadPromise
}

function ensureLocalCatalogs() {
  if (eventCatalog.value.length === 0) {
    eventCatalog.value = loadCatalogLocal(EVENT_STORAGE_KEY, DEFAULT_EVENT_CATALOG)
  }
  if (taskCatalog.value.length === 0) {
    taskCatalog.value = loadCatalogLocal(TASK_STORAGE_KEY, DEFAULT_TASK_CATALOG)
  }
  catalogLoaded.value = true
}

export function resolveEventTypeColor(eventType?: string): string {
  if (!eventType) return '#7986CB'
  const fromCatalog = eventCatalog.value.find((item) => item.name === eventType)
  if (fromCatalog?.color) return fromCatalog.color
  return LEGACY_EVENT_TYPE_COLORS[eventType] ?? '#7986CB'
}

export function useCalendarioCatalogs() {
  seedDefaultCatalogs()
  void loadCatalogsFromApi()

  const eventTypeOptions = computed(() =>
    eventCatalog.value.length > 0 ? eventCatalog.value : DEFAULT_EVENT_CATALOG,
  )
  const taskTipoOptions = computed(() =>
    taskCatalog.value.length > 0 ? taskCatalog.value : DEFAULT_TASK_CATALOG,
  )

  const defaultEventType = computed(() => eventCatalog.value[0] ?? DEFAULT_EVENT_CATALOG[0])
  const defaultTaskTipo = computed(() => taskCatalog.value[0] ?? DEFAULT_TASK_CATALOG[0])

  function findEventTypeByName(name: string): CalendarioCatalogItem | undefined {
    return eventCatalog.value.find((item) => item.name === name)
  }

  function findTaskTipoByName(name: string): CalendarioCatalogItem | undefined {
    return taskCatalog.value.find((item) => item.name === name)
  }

  async function addEventType(name: string, color: string): Promise<string | null> {
    const label = normalizeName(name)
    if (!label) return 'Ingresá un nombre.'
    if (useApi()) {
      try {
        const created = await apiCreateEventType(label, color)
        if (!eventCatalog.value.some((item) => item.id === created.id)) {
          eventCatalog.value = [...eventCatalog.value, created]
        }
        await refreshCatalogsFromApi()
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo crear el tipo.'
      }
    }
    if (eventCatalog.value.some((item) => item.name.toLowerCase() === label.toLowerCase())) {
      return 'Ya existe un tipo de evento con ese nombre.'
    }
    eventCatalog.value = [...eventCatalog.value, { id: newCatalogId('ev'), name: label, color }]
    persistCatalogLocal(EVENT_STORAGE_KEY, eventCatalog.value)
    return null
  }

  async function updateEventType(id: string, name: string, color: string): Promise<string | null> {
    const label = normalizeName(name)
    if (!label) return 'Ingresá un nombre.'
    if (useApi()) {
      try {
        const updated = await apiUpdateEventType(id, { name: label, color })
        eventCatalog.value = eventCatalog.value.map((item) => (item.id === id ? updated : item))
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo actualizar el tipo.'
      }
    }
    const idx = eventCatalog.value.findIndex((item) => item.id === id)
    if (idx < 0) return 'No se encontró el tipo.'
    if (
      eventCatalog.value.some(
        (item, i) => i !== idx && item.name.toLowerCase() === label.toLowerCase(),
      )
    ) {
      return 'Ya existe un tipo de evento con ese nombre.'
    }
    const next = [...eventCatalog.value]
    next[idx] = { ...next[idx], name: label, color }
    eventCatalog.value = next
    persistCatalogLocal(EVENT_STORAGE_KEY, eventCatalog.value)
    return null
  }

  async function removeEventType(id: string, usedNames: string[] = []): Promise<string | null> {
    if (useApi()) {
      const item = eventCatalog.value.find((entry) => entry.id === id)
      if (!item) return 'No se encontró el tipo.'
      if (usedNames.includes(item.name)) {
        return `No se puede eliminar: hay eventos con el tipo «${item.name}».`
      }
      try {
        await apiDeleteEventType(id)
        eventCatalog.value = eventCatalog.value.filter((entry) => entry.id !== id)
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo eliminar el tipo.'
      }
    }
    if (eventCatalog.value.length <= 1) return 'Debe quedar al menos un tipo de evento.'
    const item = eventCatalog.value.find((entry) => entry.id === id)
    if (!item) return 'No se encontró el tipo.'
    if (usedNames.includes(item.name)) {
      return `No se puede eliminar: hay eventos con el tipo «${item.name}».`
    }
    eventCatalog.value = eventCatalog.value.filter((entry) => entry.id !== id)
    persistCatalogLocal(EVENT_STORAGE_KEY, eventCatalog.value)
    return null
  }

  async function addTaskTipo(name: string): Promise<string | null> {
    const label = normalizeName(name)
    if (!label) return 'Ingresá un nombre.'
    if (useApi()) {
      try {
        const created = await apiCreateTaskType(label)
        if (!taskCatalog.value.some((item) => item.id === created.id)) {
          taskCatalog.value = [...taskCatalog.value, created]
        }
        await refreshCatalogsFromApi()
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo crear el tipo.'
      }
    }
    if (taskCatalog.value.some((item) => item.name.toLowerCase() === label.toLowerCase())) {
      return 'Ya existe un tipo de tarea con ese nombre.'
    }
    taskCatalog.value = [...taskCatalog.value, { id: newCatalogId('task'), name: label }]
    persistCatalogLocal(TASK_STORAGE_KEY, taskCatalog.value)
    return null
  }

  async function updateTaskTipo(id: string, name: string): Promise<string | null> {
    const label = normalizeName(name)
    if (!label) return 'Ingresá un nombre.'
    if (useApi()) {
      try {
        const updated = await apiUpdateTaskType(id, label)
        taskCatalog.value = taskCatalog.value.map((item) => (item.id === id ? updated : item))
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo actualizar el tipo.'
      }
    }
    const idx = taskCatalog.value.findIndex((item) => item.id === id)
    if (idx < 0) return 'No se encontró el tipo.'
    if (
      taskCatalog.value.some((item, i) => i !== idx && item.name.toLowerCase() === label.toLowerCase())
    ) {
      return 'Ya existe un tipo de tarea con ese nombre.'
    }
    const next = [...taskCatalog.value]
    next[idx] = { ...next[idx], name: label }
    taskCatalog.value = next
    persistCatalogLocal(TASK_STORAGE_KEY, taskCatalog.value)
    return null
  }

  async function removeTaskTipo(id: string, usedNames: string[] = []): Promise<string | null> {
    if (useApi()) {
      const item = taskCatalog.value.find((entry) => entry.id === id)
      if (!item) return 'No se encontró el tipo.'
      if (usedNames.includes(item.name)) {
        return `No se puede eliminar: hay tareas con el tipo «${item.name}».`
      }
      try {
        await apiDeleteTaskType(id)
        taskCatalog.value = taskCatalog.value.filter((entry) => entry.id !== id)
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo eliminar el tipo.'
      }
    }
    if (taskCatalog.value.length <= 1) return 'Debe quedar al menos un tipo de tarea.'
    const item = taskCatalog.value.find((entry) => entry.id === id)
    if (!item) return 'No se encontró el tipo.'
    if (usedNames.includes(item.name)) {
      return `No se puede eliminar: hay tareas con el tipo «${item.name}».`
    }
    taskCatalog.value = taskCatalog.value.filter((entry) => entry.id !== id)
    persistCatalogLocal(TASK_STORAGE_KEY, taskCatalog.value)
    return null
  }

  async function resetEventTypes(): Promise<void> {
    if (useApi()) {
      await loadCatalogsFromApi()
      return
    }
    eventCatalog.value = DEFAULT_EVENT_CATALOG.map((item) => ({ ...item }))
    persistCatalogLocal(EVENT_STORAGE_KEY, eventCatalog.value)
  }

  async function resetTaskTipos(): Promise<void> {
    if (useApi()) {
      await loadCatalogsFromApi()
      return
    }
    taskCatalog.value = DEFAULT_TASK_CATALOG.map((item) => ({ ...item }))
    persistCatalogLocal(TASK_STORAGE_KEY, taskCatalog.value)
  }

  async function reloadCatalogs(): Promise<void> {
    if (!useApi()) {
      ensureLocalCatalogs()
      return
    }
    catalogLoaded.value = false
    loadPromise = null
    await loadCatalogsFromApi()
  }

  return {
    eventTypeOptions,
    taskTipoOptions,
    defaultEventType,
    defaultTaskTipo,
    catalogLoading,
    catalogLoadError,
    findEventTypeByName,
    findTaskTipoByName,
    addEventType,
    updateEventType,
    removeEventType,
    addTaskTipo,
    updateTaskTipo,
    removeTaskTipo,
    resetEventTypes,
    resetTaskTipos,
    reloadCatalogs,
  }
}
