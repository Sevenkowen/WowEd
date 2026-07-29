<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSuperadminContext } from '@/composables/useSuperadminContext'

const route = useRoute()
const {
  institutions,
  selectedInstitutionId,
  selectedInstitution,
  loadingInstitutions,
  loadInstitutions,
} = useSuperadminContext()

const institutionRoutes: string[] = []

const showInstitutionPicker = computed(() =>
  institutionRoutes.some((path) => route.path.startsWith(path)),
)

onMounted(() => loadInstitutions())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <header
      v-if="showInstitutionPicker"
      class="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-gray-950/40 lg:px-6"
    >
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Institución</label>
      <select
        v-model="selectedInstitutionId"
        :disabled="loadingInstitutions || !institutions.length"
        class="form-field min-w-[12rem] flex-1 sm:max-w-md"
      >
        <option v-if="!institutions.length" value="" disabled>Sin instituciones</option>
        <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
          {{ inst.name }}
        </option>
      </select>
      <p v-if="selectedInstitution" class="text-xs text-muted">
        {{ selectedInstitution.schoolCount }} colegio(s)
      </p>
    </header>

    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 text-gray-900 dark:text-gray-100 lg:px-5 lg:py-5">
      <RouterView />
    </div>
  </div>
</template>
