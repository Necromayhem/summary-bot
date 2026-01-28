import { computed, onMounted, ref } from 'vue'
import type { ChatItem, DigestMode } from '../types'
import { authTelegram, fetchLatestSummary, fetchMyChats, getStoredToken, requestDigest, storeToken } from '../services/api'
import { getChatIdFromTelegramContext, getInitDataOrThrow, tryPrepareTelegramUi } from '../services/telegram'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function getChatIdFromQuery(): string | null {
  const fromQuery = new URLSearchParams(location.search).get('chatId')
  if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  return null
}

function getInitialMode(): DigestMode {
  const m = new URLSearchParams(location.search).get('mode')?.trim()
  if (m === '12h' || m === '24h' || m === 'last10k') return m
  return '12h'
}

export function modeLabel(mode: DigestMode) {
  if (mode === '12h') return '🕒 Дайджест за 12 часов'
  if (mode === '24h') return '📆 Дайджест за 24 часа'
  return '📚 Последние 10 000 символов'
}

export function useDigestApp() {
  const loading = ref(false)
  const error = ref('')
  const status = ref('')

  const token = ref<string>('')

  const chatId = ref<string>('')
  const chats = ref<ChatItem[]>([])

  const summary = ref<string>('')
  const selectedMode = ref<DigestMode>('12h')

  const hasChatSelected = computed(() => Boolean(chatId.value?.trim()))

  async function ensureJwt(): Promise<string> {
    const stored = token.value || getStoredToken()
    if (stored) {
      token.value = stored
      return stored
    }

    status.value = '🔐 Авторизация…'
    const initData = getInitDataOrThrow()
    const t = await authTelegram(initData)

    token.value = t
    storeToken(t)
    return t
  }

  async function selectChat(nextChatId: string) {
    chatId.value = String(nextChatId || '').trim()
    summary.value = ''
    error.value = ''
    status.value = '✅ Чат выбран. Можно делать дайджест.'
  }

  async function loadChats() {
    const t = await ensureJwt()
    status.value = '📁 Загружаю список чатов…'
    const list = await fetchMyChats(t, 50)
    chats.value = list

    if (list.length === 0) status.value = 'Нет доступных чатов. Добавь бота в группу и попробуй снова.'
    else status.value = 'Выбери чат ниже 👇'
  }

  async function startDigest(mode: DigestMode) {
    error.value = ''
    status.value = ''
    summary.value = ''
    loading.value = true

    try {
      const id = chatId.value.trim()
      if (!id) throw new Error('Сначала выбери чат')

      selectedMode.value = mode

      const startedAt = Date.now()
      const t = await ensureJwt()

      status.value = '⏳ Ставлю задачу в очередь…'
      await requestDigest(t, id, mode)

      status.value = '🧠 Генерирую дайджест…'

      const timeoutMs = 90_000
      const intervalMs = 2_000
      const deadline = Date.now() + timeoutMs

      while (Date.now() < deadline) {
        await sleep(intervalMs)

        const latest = await fetchLatestSummary(id)
        if (!latest.summary) continue

        // Если сервер отдаёт createdAt — фильтруем “старые” результаты
        if (latest.createdAt) {
          const createdMs = Date.parse(latest.createdAt)
          if (!Number.isNaN(createdMs) && createdMs >= startedAt - 1000) {
            summary.value = latest.summary
            status.value = '✅ Дайджест готов'
            return
          }
          continue
        }

        summary.value = latest.summary
        status.value = '✅ Дайджест готов'
        return
      }

      status.value = '⏱️ Долго генерируется. Попробуй обновить позже.'
    } catch (e: any) {
      error.value = e?.message ?? 'Ошибка'
      status.value = ''
    } finally {
      loading.value = false
    }
  }

  async function refreshLatest() {
    error.value = ''
    status.value = ''
    loading.value = true

    try {
      const id = chatId.value.trim()
      if (!id) throw new Error('Сначала выбери чат')

      const latest = await fetchLatestSummary(id)
      summary.value = latest.summary || 'Пока нет суммаризации'
      status.value = '✅ Обновлено'
    } catch (e: any) {
      error.value = e?.message ?? 'Ошибка'
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    try {
      selectedMode.value = getInitialMode()
      tryPrepareTelegramUi()

      // 1) chatId из query
      const qChatId = getChatIdFromQuery()
      if (qChatId) {
        chatId.value = qChatId
        status.value = '✅ Чат определён из параметра chatId'
        return
      }

      // 2) chatId из Telegram контекста
      const tgChatId = getChatIdFromTelegramContext()
      if (tgChatId) {
        chatId.value = tgChatId
        status.value = '✅ Чат определён из контекста'
        return
      }

      // 3) иначе — “Мои группы”
      loading.value = true
      await loadChats()
    } catch (e: any) {
      error.value = e?.message ?? 'Ошибка'
    } finally {
      loading.value = false
    }
  })

  return {
    // state
    loading,
    error,
    status,
    chats,
    chatId,
    summary,
    selectedMode,
    hasChatSelected,

    // actions
    selectChat,
    startDigest,
    refreshLatest,
  }
}
