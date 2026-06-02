// src/lib/telegram/hooks/useTelegramBackButton.ts
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isTelegram } from '@/lib/telegram/context'

export function useTelegramBackButton(show: boolean): void {
  const router = useRouter()

  useEffect(() => {
    if (!isTelegram()) return
    const btn = window.Telegram!.WebApp.BackButton
    const handleClick = () => router.back()

    if (show) {
      btn.show()
      btn.onClick(handleClick)
    } else {
      btn.hide()
    }

    return () => {
      btn.offClick(handleClick)
      if (show) btn.hide()
    }
  }, [show, router])
}
