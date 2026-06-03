'use client'
import { useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'

interface UseMainButtonOptions {
  text: string
  visible: boolean
  onClick: () => void
}

export function useMainButton({ text, visible, onClick }: UseMainButtonOptions): void {
  useEffect(() => {
    if (!isTelegram()) return
    const btn = window.Telegram!.WebApp.MainButton

    btn.setText(text)
    if (visible) {
      btn.show()
    } else {
      btn.hide()
    }
    btn.onClick(onClick)

    return () => {
      btn.offClick(onClick)
      btn.hide()
    }
  }, [text, visible, onClick])
}
