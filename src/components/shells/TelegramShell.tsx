// src/components/shells/TelegramShell.tsx
'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from './BottomNav'
import { applyChrome } from '@/lib/telegram/theme'
import { useSettingsButton } from '@/lib/telegram/hooks/useSettingsButton'
import { getSyncManager } from '@/lib/telegram/sync'
import { isTelegram } from '@/lib/telegram/context'
import { haptic } from '@/lib/telegram/haptics'

export function TelegramShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const goToSettings = useCallback(() => {
    haptic('selection')
    router.push('/settings')
  }, [router])

  useSettingsButton({ onClick: goToSettings })

  useEffect(() => {
    if (!isTelegram()) return
    const tg = window.Telegram!.WebApp

    tg.ready()
    tg.expand()

    document.documentElement.dataset.shell = 'telegram'
    applyChrome(tg)

    const handleThemeChange = () => applyChrome(tg)
    tg.onEvent('themeChanged', handleThemeChange)

    const handleViewportChange = () => {
      if (!tg.isExpanded) tg.expand()
    }
    tg.onEvent('viewportChanged', handleViewportChange)

    const sync = getSyncManager()
    sync.shouldPullOnOpen().then((should) => {
      if (should) sync.pull().catch(() => {})
    })

    const handleVisibility = () => {
      if (document.hidden) sync.schedulePush(0)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const HOME_KEY = 'bp_home_prompted'
    const promptTimer = setTimeout(() => {
      if (localStorage.getItem(HOME_KEY)) return
      tg.checkHomeScreenStatus((status) => {
        if (status === 'unknown') {
          tg.addToHomeScreen()
          localStorage.setItem(HOME_KEY, '1')
        }
      })
    }, 3000)

    return () => {
      tg.offEvent('themeChanged', handleThemeChange)
      tg.offEvent('viewportChanged', handleViewportChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearTimeout(promptTimer)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        paddingTop: 'var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        paddingBottom:
          'calc(3.5rem + var(--tg-content-safe-area-inset-bottom, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {children}
      <BottomNav />
    </div>
  )
}
