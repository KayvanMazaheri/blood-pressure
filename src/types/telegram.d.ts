interface TelegramThemeParams {
  bg_color?: string
  secondary_bg_color?: string
  text_color?: string
  hint_color?: string
  button_color?: string
  button_text_color?: string
  destructive_text_color?: string
  accent_text_color?: string
  section_bg_color?: string
  link_color?: string
}

interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(fn: () => void): void
  offClick(fn: () => void): void
}

interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: Error | null) => void): void
  getItem(key: string, cb: (err: Error | null, value: string) => void): void
  getItems(
    keys: string[],
    cb: (err: Error | null, values: Record<string, string>) => void,
  ): void
  removeItem(key: string, cb?: (err: Error | null) => void): void
  removeItems(keys: string[], cb?: (err: Error | null) => void): void
  getKeys(cb: (err: Error | null, keys: string[]) => void): void
}

interface TelegramWebApp {
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    auth_date?: number
    hash?: string
  }
  HapticFeedback: TelegramHapticFeedback
  BackButton: TelegramBackButton
  CloudStorage: TelegramCloudStorage
  ready(): void
  expand(): void
  close(): void
  onEvent(eventType: string, eventHandler: () => void): void
  offEvent(eventType: string, eventHandler: () => void): void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export {}
