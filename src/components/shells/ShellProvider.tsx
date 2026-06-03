// src/components/shells/ShellProvider.tsx
'use client'
import { useState, useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'
import { WebShell } from './WebShell'
import { TelegramShell } from './TelegramShell'

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isTg, setIsTg] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTg(isTelegram())
  }, [])

  if (isTg) return <TelegramShell>{children}</TelegramShell>
  return <WebShell>{children}</WebShell>
}
