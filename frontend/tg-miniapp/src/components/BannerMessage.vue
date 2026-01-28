<template>
  <div v-if="text" :class="kindClass">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  kind: 'status' | 'error'
}>()

const kindClass = computed(() => (props.kind === 'error' ? 'banner error' : 'banner status'))
</script>

<style scoped>
.banner {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
}

.status {
  background: rgba(255, 255, 255, 0.06);
}

.error {
  background: rgba(255, 65, 65, 0.14);
  border: 1px solid rgba(255, 65, 65, 0.2);
  color: #ffd1d1;
}
</style>
