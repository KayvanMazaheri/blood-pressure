export function isTelegram(): boolean {
  if (typeof window === 'undefined') return false
  const twa = window.Telegram?.WebApp
  // colorScheme is always 'light'|'dark' in any Telegram Mini App context,
  // unlike initDataUnsafe.user which is absent in many launch scenarios.
  return !!twa && typeof twa.colorScheme === 'string'
}

export function getTelegramUser(): TelegramWebApp['initDataUnsafe']['user'] | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}
