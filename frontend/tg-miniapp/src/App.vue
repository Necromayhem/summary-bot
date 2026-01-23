<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type DigestMode = '12h' | '24h' | 'last10k';

const tg = (window as any).Telegram?.WebApp;

const apiBase = computed(() => `${import.meta.env.VITE_API_BASE_URL}`.replace(/\/+$/, ''));

const loading = ref(false);
const error = ref<string>('');
const status = ref<string>('');

const tokenRef = ref<string>('');
const chatIdRef = ref<string>('');
const chats = ref<Array<{ chatId: string; title: string | null; type: string | null }>>([]);

const summary = ref<string>('');
const selectedMode = ref<DigestMode>('12h');

function getChatIdFromContext(): string | null {
  const fromQuery = new URLSearchParams(location.search).get('chatId');
  if (fromQuery && fromQuery.trim()) return fromQuery.trim();

  const unsafe = tg?.initDataUnsafe;
  const fromTg = unsafe?.chat?.id?.toString();
  return fromTg?.trim() ? fromTg.trim() : null;
}

function getInitialMode(): DigestMode {
  const m = new URLSearchParams(location.search).get('mode')?.trim();
  if (m === '12h' || m === '24h' || m === 'last10k') return m;
  return '12h';
}

function modeLabel(mode: DigestMode) {
  if (mode === '12h') return '🕒 Дайджест за 12 часов';
  if (mode === '24h') return '📆 Дайджест за 24 часа';
  return '📚 Последние 10 000 символов';
}

function getInitData(): string {
  const initData = tg?.initData;
  if (!initData) throw new Error('Open this Mini App inside Telegram');
  return String(initData);
}

function getStoredToken(): string | null {
  return sessionStorage.getItem('accessToken');
}

function storeToken(token: string) {
  sessionStorage.setItem('accessToken', token);
}

async function ensureJwt(): Promise<string> {
  const stored = tokenRef.value || getStoredToken();
  if (stored) {
    tokenRef.value = stored;
    return stored;
  }

  status.value = '🔐 Авторизация…';
  const initData = getInitData();

  const res = await fetch(`${apiBase.value}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Auth failed: HTTP ${res.status} ${txt}`.trim());
  }

  const data = await res.json();
  const token = String(data?.accessToken ?? '');
  if (!token) throw new Error('Auth failed: no accessToken');

  tokenRef.value = token;
  storeToken(token);
  return token;
}

async function fetchMyChats() {
  const token = await ensureJwt();
  status.value = '📁 Загружаю список чатов…';

  const res = await fetch(`${apiBase.value}/telegram-chats/my?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Load chats failed: HTTP ${res.status} ${txt}`.trim());
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((x: any) => ({
    chatId: String(x.chatId),
    title: x.title ? String(x.title) : null,
    type: x.type ? String(x.type) : null,
  }));
}

async function fetchLatestSummary(chatId: string) {
  const url = `${apiBase.value}/summaries/latest?chatId=${encodeURIComponent(chatId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (!data || !data.summary) {
    return { summary: '', createdAt: null as string | null };
  }
  return { summary: String(data.summary ?? ''), createdAt: data.createdAt ? String(data.createdAt) : null };
}

async function selectChat(chatId: string) {
  chatIdRef.value = chatId;
  summary.value = '';
  error.value = '';
  status.value = '✅ Чат выбран. Можно делать дайджест.';
}

async function startDigest(mode: DigestMode) {
  error.value = '';
  status.value = '';
  summary.value = '';
  loading.value = true;

  try {
    const chatId = chatIdRef.value.trim();
    if (!chatId) throw new Error('Сначала выбери чат');

    selectedMode.value = mode;

    const startedAt = Date.now();
    const token = await ensureJwt();

    status.value = '⏳ Ставлю задачу в очередь…';
    const res = await fetch(`${apiBase.value}/digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chatId, mode }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Digest request failed: HTTP ${res.status} ${txt}`.trim());
    }

    status.value = '🧠 Генерирую дайджест…';

    const timeoutMs = 90_000;
    const intervalMs = 2_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const latest = await fetchLatestSummary(chatId);
      if (!latest.summary) continue;

      if (latest.createdAt) {
        const createdMs = Date.parse(latest.createdAt);
        if (!Number.isNaN(createdMs) && createdMs >= startedAt - 1000) {
          summary.value = latest.summary;
          status.value = '✅ Дайджест готов';
          return;
        }
      } else {
        summary.value = latest.summary;
        status.value = '✅ Дайджест готов';
        return;
      }
    }

    status.value = '⏱️ Долго генерируется. Попробуй обновить позже.';
  } catch (e: any) {
    error.value = e?.message ?? 'Ошибка';
    status.value = '';
  } finally {
    loading.value = false;
  }
}

async function refreshLatest() {
  error.value = '';
  status.value = '';
  loading.value = true;

  try {
    const chatId = chatIdRef.value.trim();
    if (!chatId) throw new Error('Сначала выбери чат');

    const latest = await fetchLatestSummary(chatId);
    summary.value = latest.summary || 'Пока нет суммаризации';
    status.value = '✅ Обновлено';
  } catch (e: any) {
    error.value = e?.message ?? 'Ошибка';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    selectedMode.value = getInitialMode();

    try {
      tg?.ready?.();
      tg?.expand?.();
    } catch {}

    // если чат уже в контексте (открыли из группы /app) — сразу выбираем
    const ctxChatId = getChatIdFromContext();
    if (ctxChatId) {
      chatIdRef.value = ctxChatId;
      status.value = '✅ Чат определён из контекста';
      return;
    }

    // иначе — грузим список “Мои группы”
    loading.value = true;
    const list = await fetchMyChats();
    chats.value = list;

    if (list.length === 0) {
      status.value = 'Нет доступных чатов. Добавь бота в группу и попробуй снова.';
    } else {
      status.value = 'Выбери чат ниже 👇';
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Ошибка';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="wrap">
    <div class="card">
      <div class="title">Summary Bot</div>
      <div class="subtitle">
        Выбери чат и сделай дайджест прямо здесь.
      </div>

      <div v-if="status" class="status">{{ status }}</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="!chatIdRef" class="section">
        <div class="sectionTitle">📁 Мои группы</div>

        <div v-if="loading" class="muted">Загружаю…</div>

        <div v-else class="chatList">
          <button
            v-for="c in chats"
            :key="c.chatId"
            class="btn"
            @click="selectChat(c.chatId)"
          >
            <div class="chatTitle">{{ c.title || 'Без названия' }}</div>
            <div class="chatMeta">{{ c.type || 'chat' }} · {{ c.chatId }}</div>
          </button>
        </div>
      </div>

      <div v-else class="section">
        <div class="meta">
          <span class="metaLabel">Выбран чат:</span>
          <span class="mono">{{ chatIdRef }}</span>
        </div>

        <div class="buttons">
          <button class="btn" :disabled="loading" @click="startDigest('12h')">
            🕒 Дайджест за 12 часов
          </button>
          <button class="btn" :disabled="loading" @click="startDigest('24h')">
            📆 Дайджест за 24 часа
          </button>
          <button class="btn" :disabled="loading" @click="startDigest('last10k')">
            📚 Последние 10 000 символов
          </button>
        </div>

        <button class="btnSecondary" :disabled="loading" @click="refreshLatest">
          🔄 Обновить последнюю суммаризацию
        </button>
      </div>
    </div>

    <div v-if="summary" class="card result">
      <div class="resultTitle">{{ modeLabel(selectedMode) }}</div>
      <div class="resultBody" v-html="summary"></div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #e8eef6;
  background: #0f1722;
  min-height: 100vh;
}

.card {
  background: #172334;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.06);
}

.title {
  font-size: 18px;
  font-weight: 700;
}

.subtitle {
  margin-top: 6px;
  opacity: 0.85;
  line-height: 1.35;
}

.section {
  margin-top: 12px;
}

.sectionTitle {
  font-weight: 700;
  margin-bottom: 10px;
}

.chatList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chatTitle {
  font-size: 15px;
  font-weight: 700;
}

.chatMeta {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.75;
}

.buttons {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  width: 100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: #1c2b40;
  color: #e8eef6;
  font-size: 15px;
  text-align: left;
}

.btn:disabled {
  opacity: 0.65;
}

.btnSecondary {
  margin-top: 12px;
  width: 100%;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px dashed rgba(255,255,255,0.16);
  background: transparent;
  color: #e8eef6;
  font-size: 14px;
  text-align: left;
  opacity: 0.9;
}

.status {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  font-size: 14px;
}

.error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 65, 65, 0.14);
  border: 1px solid rgba(255, 65, 65, 0.2);
  color: #ffd1d1;
  font-size: 14px;
}

.meta {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.9;
}

.metaLabel {
  opacity: 0.8;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.resultTitle {
  font-size: 15px;
  font-weight: 700;
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
  font-weight: 700;
}

.resultBody :deep(ul) {
  margin: 8px 0 0 18px;
}

.resultBody :deep(li) {
  margin: 4px 0;
}

.muted {
  opacity: 0.75;
}
</style>
