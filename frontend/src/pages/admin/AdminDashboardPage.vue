<script setup lang="ts">
import RbacDashboardPanel from '@/components/rbac/RbacDashboardPanel.vue'
import { adminDashboardConfig } from '@/composables/rbac/rbacModuleConfigs'
</script>

<template>
  <RbacDashboardPanel :config="adminDashboardConfig" />
</template>
