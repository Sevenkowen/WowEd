<script setup lang="ts">
import RbacRolesPanel from '@/components/rbac/RbacRolesPanel.vue'
import { adminRolesConfig } from '@/composables/rbac/rbacModuleConfigs'
</script>

<template>
  <RbacRolesPanel :config="adminRolesConfig" />
</template>
