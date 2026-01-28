export type DigestMode = '12h' | '24h' | 'last10k'

export type ChatItem = {
  chatId: string
  title: string | null
  type: string | null
}

export type LatestSummary = {
  summary: string
  createdAt: string | null
}
