<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import RbacEstructuraPanel from '@/components/rbac/RbacEstructuraPanel.vue'
import { adminEstructuraConfig } from '@/composables/rbac/rbacModuleConfigs'
import type { RbacEstructuraSection } from '@/types/rbac'

const route = useRoute()

const section = computed(
  () => (route.meta.estructuraSection as RbacEstructuraSection | undefined) ?? 'colegios',
)
</script>

<template>
  <RbacEstructuraPanel :config="adminEstructuraConfig" :section="section" />
</template>
