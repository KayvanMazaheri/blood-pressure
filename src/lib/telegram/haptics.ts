// src/lib/telegram/haptics.ts
import { isTelegram } from './context'

type HapticType = 'success' | 'warning' | 'error' | 'selection' | 'light'

export function haptic(type: HapticType): void {
  if (!isTelegram()) return
  const hf = window.Telegram!.WebApp.HapticFeedback
  if (type === 'selection') {
    hf.selectionChanged()
  } else if (type === 'light') {
    hf.impactOccurred('light')
  } else {
    hf.notificationOccurred(type)
  }
}
