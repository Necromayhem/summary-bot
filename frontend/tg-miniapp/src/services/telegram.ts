type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: any
  ready?: () => void
  expand?: () => void
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return (window as any).Telegram?.WebApp ?? null
}

export function tryPrepareTelegramUi() {
  const tg = getTelegramWebApp()
  try {
    tg?.ready?.()
    tg?.expand?.()
  } catch {
    // ignore
  }
}

export function getInitDataOrThrow(): string {
  const tg = getTelegramWebApp()
  const initData = tg?.initData
  if (!initData) throw new Error('Open this Mini App inside Telegram')
  return String(initData)
}

export function getChatIdFromTelegramContext(): string | null {
  const tg = getTelegramWebApp()
  const unsafe = tg?.initDataUnsafe
  const fromTg = unsafe?.chat?.id?.toString()
  return fromTg?.trim() ? fromTg.trim() : null
}
