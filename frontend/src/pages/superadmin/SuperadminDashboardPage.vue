<script setup lang="ts">
import RbacDashboardPanel from '@/components/rbac/RbacDashboardPanel.vue'
import { superadminDashboardConfig } from '@/composables/rbac/rbacModuleConfigs'
</script>

<template>
  <RbacDashboardPanel :config="superadminDashboardConfig" />
</template>
