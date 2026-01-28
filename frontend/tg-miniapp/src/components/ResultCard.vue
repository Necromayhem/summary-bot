<template>
  <div v-if="summary" class="card result">
    <div class="resultTitle">{{ title }}</div>
    <div class="resultBody" v-html="summary"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  summary: string
}>()
</script>

<style scoped>
.card.result {
  margin-top: 12px;
}

.resultTitle {
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 10px;
}

.resultBody {
  white-space: normal;
  line-height: 1.45;
  font-size: 14px;
}

.resultBody :deep(a) {
  color: #6cb7ff;
  text-decoration: underline;
}

.resultBody :deep(b) {
  font-weight: 800;
}

.resultBody :deep(ul) {
  margin: 8px 0 0 18px;
}

.resultBody :deep(li) {
  margin: 4px 0;
}
</style>
