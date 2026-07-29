import { computed } from 'vue'
import type { CalEvent } from '@/data/calendarioEscolarTypes'
import type { CalTask } from '@/data/calendarioEscolarTypes'
import { useCalendarioEscolarEvents } from '@/composables/useCalendarioEscolarEvents'
import { useCalendarioEscolarTasks } from '@/composables/useCalendarioEscolarTasks'
import { isDateBeforeToday, parseYmd, todayYmd } from '@/utils/calendarioDates'
import { taskTipoOf } from '@/data/calendarioTareaOptions'

export interface CalendarioSearchResult {
  type: 'event' | 'task'
  id: string
  date: string
  title: string
  subtitle: string
  isPast: boolean
}

function normalizeText(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function matchesTokens(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token))
}

function formatResultDate(ymd: string): string {
  const d = parseYmd(ymd)
  const raw = new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(d)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function findCalendarioEvent(
  id: string,
  porFecha: Record<string, CalEvent[]>,
): CalEvent | null {
  const needle = String(id)
  for (const list of Object.values(porFecha)) {
    const found = list.find((e) => String(e.id) === needle)
    if (found) return found
  }
  return null
}

export function findCalendarioTask(id: string, tasks: CalTask[]): CalTask | null {
  const needle = String(id)
  return tasks.find((t) => String(t.id) === needle) ?? null
}

export function useCalendarioSearch() {
  const { porFecha } = useCalendarioEscolarEvents()
  const { todasLasTareas } = useCalendarioEscolarTasks()

  const indexSize = computed(
    () =>
      Object.values(porFecha.value).reduce((n, list) => n + list.length, 0) +
      todasLasTareas.value.length,
  )

  function search(query: string, limit = 25): CalendarioSearchResult[] {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    if (!tokens.length) return []

    const today = todayYmd()
    const results: CalendarioSearchResult[] = []

    for (const [fallbackDate, events] of Object.entries(porFecha.value)) {
      for (const event of events) {
        const date = event.datetime?.slice(0, 10) || fallbackDate
        const haystack = normalizeText([
          event.name,
          event.description,
          event.eventType,
          event.time,
          ...(event.assignees?.map((a) => `${a.displayName} ${a.email ?? ''}`) ?? []),
        ])
        if (!matchesTokens(haystack, tokens)) continue
        results.push({
          type: 'event',
          id: String(event.id),
          date,
          title: event.name,
          subtitle: [event.time, event.eventType].filter(Boolean).join(' · ') || 'Evento',
          isPast: date < today,
        })
      }
    }

    for (const task of todasLasTareas.value) {
      const haystack = normalizeText([
        task.title,
        task.description,
        task.tipo,
        task.cuadrante,
        task.time,
        taskTipoOf(task),
        ...(task.assignees?.map((a) => `${a.displayName} ${a.email ?? ''}`) ?? []),
      ])
      if (!matchesTokens(haystack, tokens)) continue
      results.push({
        type: 'task',
        id: String(task.id),
        date: task.date,
        title: task.title,
        subtitle: [task.time, taskTipoOf(task)].filter(Boolean).join(' · ') || 'Tarea',
        isPast: isDateBeforeToday(task.date),
      })
    }

    return results
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return a.title.localeCompare(b.title, 'es')
      })
      .slice(0, limit)
  }

  return {
    indexSize,
    search,
    formatResultDate,
  }
}
