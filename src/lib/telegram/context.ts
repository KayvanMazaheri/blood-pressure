export function isTelegram(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user
}

export function getTelegramUser(): TelegramWebApp['initDataUnsafe']['user'] | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}
