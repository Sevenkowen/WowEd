<script setup lang="ts">
import RbacPersonnelPanel from '@/components/rbac/RbacPersonnelPanel.vue'
import { adminPersonnelConfig } from '@/composables/rbac/rbacModuleConfigs'
</script>

<template>
  <RbacPersonnelPanel :config="adminPersonnelConfig" />
</template>
