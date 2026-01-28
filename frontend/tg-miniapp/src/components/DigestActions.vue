<template>
  <div class="section">
    <div class="meta">
      <span class="metaLabel">Выбран чат:</span>
      <span class="mono">{{ chatId }}</span>
    </div>

    <div class="buttons">
      <button class="btn" type="button" :disabled="loading" @click="$emit('digest', '12h')">
        🕒 Дайджест за 12 часов
      </button>
      <button class="btn" type="button" :disabled="loading" @click="$emit('digest', '24h')">
        📆 Дайджест за 24 часа
      </button>
      <button class="btn" type="button" :disabled="loading" @click="$emit('digest', 'last10k')">
        📚 Последние 10 000 символов
      </button>
    </div>

    <button class="btnSecondary" type="button" :disabled="loading" @click="$emit('refresh')">
      🔄 Обновить последнюю суммаризацию
    </button>
  </div>
</template>

<script setup lang="ts">
import type { DigestMode } from '../types'

defineProps<{
  chatId: string
  loading: boolean
}>()

defineEmits<{
  (e: 'digest', mode: DigestMode): void
  (e: 'refresh'): void
}>()
</script>

<style scoped>
.section {
  margin-top: 14px;
}
.meta {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
  text-align: left;
}
.metaLabel {
  opacity: 0.8;
  margin-right: 6px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
.buttons {
  margin-top: 12px;
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
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btnSecondary {
  margin-top: 12px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
}
.btnSecondary:hover {
  background: rgba(255, 255, 255, 0.06);
}
.btnSecondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
