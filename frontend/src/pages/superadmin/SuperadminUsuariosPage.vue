<script setup lang="ts">
import { computed } from 'vue'
import RbacPersonnelPanel from '@/components/rbac/RbacPersonnelPanel.vue'
import { superadminPersonnelConfig } from '@/composables/rbac/rbacModuleConfigs'
import { useSuperadminContext } from '@/composables/useSuperadminContext'

const ctx = useSuperadminContext()

const config = computed(() => ({
  ...superadminPersonnelConfig,
  getInstitutions: async () => {
    await ctx.loadInstitutions()
    return ctx.institutions.value.map((i) => ({ id: i.id, name: i.name }))
  },
  getDefaultInstitutionId: () => ctx.selectedInstitutionId.value || ctx.institutions.value[0]?.id,
  onInstitutionChange: (institutionId: string) => {
    ctx.selectedInstitutionId.value = institutionId
  },
}))
</script>

<template>
  <RbacPersonnelPanel :config="config" />
</template>
