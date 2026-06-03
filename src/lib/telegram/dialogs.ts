// src/lib/telegram/dialogs.ts
import { isTelegram } from './context'

export function tgConfirm(message: string): Promise<boolean> {
  if (!isTelegram()) return Promise.resolve(window.confirm(message))
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showConfirm(message, resolve)
  })
}

export function tgAlert(message: string): Promise<void> {
  if (!isTelegram()) {
    window.alert(message)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showAlert(message, resolve)
  })
}

export function tgPopup(params: TelegramPopupParams): Promise<string> {
  if (!isTelegram()) {
    const buttons = params.buttons ?? []
    const cancelBtn = buttons.find((b) => b.type === 'cancel' || b.type === 'close')
    const confirmBtn = buttons.find((b) => b !== cancelBtn)
    if (cancelBtn) {
      const confirmed = window.confirm(params.message)
      return Promise.resolve(confirmed ? (confirmBtn?.id ?? '') : (cancelBtn.id ?? ''))
    }
    return Promise.resolve(buttons[0]?.id ?? '')
  }
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showPopup(params, resolve)
  })
}
