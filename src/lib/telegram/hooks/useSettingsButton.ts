'use client'
import { useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'

interface UseSettingsButtonOptions {
  onClick: () => void
}

export function useSettingsButton({ onClick }: UseSettingsButtonOptions): void {
  useEffect(() => {
    if (!isTelegram()) return
    const btn = window.Telegram!.WebApp.SettingsButton
    btn.show()
    btn.onClick(onClick)
    return () => {
      btn.offClick(onClick)
      btn.hide()
    }
  }, [onClick])
}
