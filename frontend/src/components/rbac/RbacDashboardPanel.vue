<script setup lang="ts">
import { computed, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRightIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline'
import { useRbacDashboard } from '@/composables/rbac/useRbacDashboard'
import { useAuth } from '@/composables/useAuth'
import type { RbacDashboardModuleConfig } from '@/types/rbac'

const props = defineProps<{
  config: RbacDashboardModuleConfig
}>()

const { user, displayName } = useAuth()
const { config, stats, loadingStats, actionCards } = useRbacDashboard(toRef(props, 'config'))

const roleDescription = computed(() =>
  config.value.roleDescription({
    institutionName: stats.value?.institutionName ?? user.value?.institution_name ?? undefined,
  }),
)
</script>

<template>
  <div class="w-full space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ config.title }}</h2>
        <p class="mt-1 text-sm text-muted">Bienvenido al Sistema de Gestión con Control de Acceso RBAC.</p>
      </div>
      <span class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
        <span class="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
        {{ config.sessionBadge }}
      </span>
    </header>

    <section class="flex gap-4 rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-5 dark:border-indigo-500/20 dark:bg-indigo-950/25">
      <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-400">
        <ShieldCheckIcon class="size-6" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          Alcance de tu Rol:
          <span class="text-indigo-600 dark:text-indigo-400">{{ config.roleLabel }}</span>
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-muted">{{ roleDescription }}</p>
        <p v-if="user?.email" class="mt-2 text-xs text-muted">Conectado como {{ displayName }} · {{ user.email }}</p>
        <p v-if="stats && !loadingStats" class="mt-2 text-xs text-muted">{{ config.statsSummary(stats) }}</p>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <component
        :is="card.static ? 'div' : RouterLink"
        v-for="card in actionCards"
        :key="card.title"
        :to="card.static ? undefined : card.to"
        class="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-colors dark:border-white/10 dark:bg-gray-900"
        :class="card.static ? '' : 'hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-950/20'"
      >
        <div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-gray-100 text-indigo-600 dark:bg-white/10 dark:text-indigo-400">
          <component :is="card.icon" class="size-5" aria-hidden="true" />
        </div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ card.eyebrow }}</p>
        <h4 class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ card.title }}</h4>
        <p v-if="card.stat" class="mt-2 text-xs text-muted">{{ card.stat }}</p>
        <p v-if="card.status" class="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{{ card.status }}</p>
        <span v-if="!card.static" class="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
          {{ card.linkLabel }}
          <ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </component>
    </section>
  </div>
</template>
