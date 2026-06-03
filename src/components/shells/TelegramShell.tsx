// src/components/shells/TelegramShell.tsx
'use client'
import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { applyChrome } from '@/lib/telegram/theme'
import { getSyncManager } from '@/lib/telegram/sync'
import { isTelegram } from '@/lib/telegram/context'

export function TelegramShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isTelegram()) return
    const tg = window.Telegram!.WebApp

    tg.ready()
    tg.expand()

    applyChrome(tg)

    const handleThemeChange = () => applyChrome(tg)
    tg.onEvent('themeChanged', handleThemeChange)

    // Pull on open if cloud is newer or local is empty
    const sync = getSyncManager()
    sync.shouldPullOnOpen().then((should) => {
      if (should) sync.pull().catch(() => {})
    })

    // Push when app goes to background
    const handleVisibility = () => {
      if (document.hidden) sync.schedulePush(0)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      tg.offEvent('themeChanged', handleThemeChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        paddingTop: 'var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        // Bottom padding = BottomNav height (3.5rem) + safe area
        paddingBottom:
          'calc(3.5rem + var(--tg-content-safe-area-inset-bottom, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {children}
      <BottomNav />
    </div>
  )
}
