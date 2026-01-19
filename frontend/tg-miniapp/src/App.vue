<script setup lang="ts">
import { ref } from 'vue';

const summary = ref<string>('');
const loading = ref(false);
const error = ref<string>('');
const chatIdRef = ref<string>('');

// Telegram WebApp
const tg = (window as any).Telegram?.WebApp;

// 1) сначала берём chatId из query (?chatId=...)
// 2) только если его нет — пробуем tg.initDataUnsafe.chat.id
// ВАЖНО: НЕ делаем fallback на unsafe.user.id (это не chatId)
function getChatId(): string | null {
  const fromQuery = new URLSearchParams(location.search).get('chatId');
  if (fromQuery && fromQuery.trim()) return fromQuery.trim();

  const unsafe = tg?.initDataUnsafe;
  const fromTg = unsafe?.chat?.id?.toString();
  return fromTg?.trim() ? fromTg.trim() : null;
}

async function loadLatestSummary() {
  error.value = '';
  summary.value = '';
  loading.value = true;

  try {
    const chatId = getChatId();
    if (!chatId) throw new Error('chatId not found');

    chatIdRef.value = chatId;
    console.log('[MiniApp] chatId:', chatId);

    const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`.replace(/\/+$/, '');
    const url = `${baseUrl}/summaries/latest?chatId=${encodeURIComponent(chatId)}`;
    console.log('[MiniApp] API URL:', url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    summary.value = data.summary || 'Пока нет суммаризации';
  } catch (e: any) {
    error.value = e?.message ?? 'Ошибка';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="app">
    <button @click="loadLatestSummary" :disabled="loading">
      {{ loading ? 'Загружаю…' : 'Получить последнюю суммаризацию' }}
    </button>

    <p v-if="chatIdRef">
      <strong>chatId:</strong> {{ chatIdRef }}
    </p>

    <p v-if="error" class="error">
      {{ error }}
    </p>

    <pre v-if="summary" class="summary">
{{ summary }}
    </pre>
  </div>
</template>

<style scoped>
.app {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

button {
  padding: 12px;
  font-size: 16px;
}

.summary {
  white-space: pre-wrap;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
}

.error {
  color: red;
}
</style>


