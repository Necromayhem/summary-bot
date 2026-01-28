<template>
  <div class="section">
    <div class="sectionTitle">📁 Мои группы</div>

    <div v-if="loading" class="muted">Загружаю…</div>

    <div v-else class="chatList">
      <button
        v-for="c in chats"
        :key="c.chatId"
        class="btn"
        type="button"
        @click="$emit('select', c.chatId)"
      >
        <div class="chatTitle">{{ c.title || 'Без названия' }}</div>
        <div class="chatMeta">{{ c.type || 'chat' }} · {{ c.chatId }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatItem } from '../types'

defineProps<{
  chats: ChatItem[]
  loading: boolean
}>()

defineEmits<{
  (e: 'select', chatId: string): void
}>()
</script>

<style scoped>
.section {
  margin-top: 14px;
}
.sectionTitle {
  font-weight: 800;
  font-size: 14px;
  margin-bottom: 10px;
  text-align: left;
}
.chatList {
  display: grid;
  gap: 10px;
}
.btn {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  transition: transform 0.08s ease, border-color 0.2s ease, background 0.2s ease;
}
.btn:hover {
  border-color: rgba(120, 170, 255, 0.6);
  background: rgba(255, 255, 255, 0.09);
}
.btn:active {
  transform: translateY(1px);
}
.chatTitle {
  font-weight: 750;
  font-size: 14px;
  margin-bottom: 4px;
}
.chatMeta {
  font-size: 12px;
  opacity: 0.8;
}
.muted {
  opacity: 0.75;
}
</style>
