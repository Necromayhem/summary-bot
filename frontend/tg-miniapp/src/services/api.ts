import type { ChatItem, DigestMode, LatestSummary } from '../types'

function cleanBaseUrl(base: string) {
  return String(base || '').replace(/\/+$/, '')
}

export function getApiBase(): string {
  return cleanBaseUrl(import.meta.env.VITE_API_BASE_URL)
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem('accessToken')
}

export function storeToken(token: string) {
  sessionStorage.setItem('accessToken', token)
}

export async function authTelegram(initData: string): Promise<string> {
  const apiBase = getApiBase()

  const res = await fetch(`${apiBase}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Auth failed: HTTP ${res.status} ${txt}`.trim())
  }

  const data = await res.json()
  const token = String(data?.accessToken ?? '')
  if (!token) throw new Error('Auth failed: no accessToken')
  return token
}

export async function fetchMyChats(token: string, limit = 50): Promise<ChatItem[]> {
  const apiBase = getApiBase()

  const res = await fetch(`${apiBase}/telegram-chats/my?limit=${encodeURIComponent(String(limit))}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Load chats failed: HTTP ${res.status} ${txt}`.trim())
  }

  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map((x: any) => ({
    chatId: String(x.chatId),
    title: x.title ? String(x.title) : null,
    type: x.type ? String(x.type) : null,
  }))
}

export async function requestDigest(token: string, chatId: string, mode: DigestMode): Promise<void> {
  const apiBase = getApiBase()

  const res = await fetch(`${apiBase}/digest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId, mode }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Digest request failed: HTTP ${res.status} ${txt}`.trim())
  }
}

export async function fetchLatestSummary(chatId: string): Promise<LatestSummary> {
  const apiBase = getApiBase()

  const url = `${apiBase}/summaries/latest?chatId=${encodeURIComponent(chatId)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  if (!data || !data.summary) return { summary: '', createdAt: null }

  return {
    summary: String(data.summary ?? ''),
    createdAt: data.createdAt ? String(data.createdAt) : null,
  }
}
