<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import CalendarioAssigneeChip from '@/components/calendario/CalendarioAssigneeChip.vue'
import { useInstitutionUsers } from '@/composables/useInstitutionUsers'
import { useApi } from '@/api/http'
import type { CalAssignee } from '@/data/calendarioEscolarTypes'

defineOptions({ name: 'CalendarioAssigneePicker' })

const model = defineModel<string[]>({ default: () => [] })

const props = defineProps<{
  disabled?: boolean
  label?: string
  /** Asignados que ya no están en la institución pero siguen vinculados al ítem. */
  inactiveAssignees?: CalAssignee[]
}>()

const { users, loadUsers } = useInstitutionUsers()
const query = ref('')

onMounted(() => {
  if (useApi()) void loadUsers()
})

const selectedSet = computed(() => new Set(model.value))

const inactiveSelected = computed(() =>
  (props.inactiveAssignees ?? []).filter((a) => selectedSet.value.has(a.id)),
)

const filteredUsers = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
  )
})

function toggleUser(userId: string): void {
  if (props.disabled) return
  const next = new Set(selectedSet.value)
  if (next.has(userId)) next.delete(userId)
  else next.add(userId)
  model.value = [...next]
}

function removeInactive(userId: string): void {
  if (props.disabled) return
  model.value = model.value.filter((id) => id !== userId)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}
</script>

<template>
  <div v-if="useApi()">
    <label v-if="label" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </label>
    <div
      v-if="inactiveSelected.length"
      class="mb-3 flex flex-wrap gap-1.5"
    >
      <button
        v-for="person in inactiveSelected"
        :key="person.id"
        type="button"
        class="group relative"
        :disabled="disabled"
        :title="disabled ? undefined : 'Quitar asignación'"
        @click="removeInactive(person.id)"
      >
        <CalendarioAssigneeChip :person="person" />
      </button>
    </div>
    <div
      v-if="!users.length"
      class="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400"
    >
      No hay usuarios disponibles en esta institución.
    </div>
    <template v-else>
      <div class="relative mb-2">
        <MagnifyingGlassIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          v-model="query"
          type="search"
          :disabled="disabled"
          placeholder="Buscar por nombre o email…"
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-70 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
        />
      </div>
      <ul
        class="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-gray-800"
        :class="disabled ? 'opacity-70' : ''"
      >
        <li v-if="!filteredUsers.length" class="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
          No se encontraron usuarios para «{{ query.trim() }}».
        </li>
        <li v-for="user in filteredUsers" :key="user.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 disabled:cursor-default dark:hover:bg-white/5"
          :disabled="disabled"
          @click="toggleUser(user.id)"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          >
            {{ initials(user.displayName) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ user.displayName }}
            </span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</span>
          </span>
          <input
            type="checkbox"
            class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
            :checked="selectedSet.has(user.id)"
            :disabled="disabled"
            tabindex="-1"
            @click.stop
            @change="toggleUser(user.id)"
          />
        </button>
      </li>
    </ul>
    </template>
    <p v-if="model.length" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      {{ model.length }} persona{{ model.length === 1 ? '' : 's' }} asignada{{ model.length === 1 ? '' : 's' }}
    </p>
  </div>
</template>
