// src/components/shells/ShellProvider.tsx
'use client'
import { isTelegram } from '@/lib/telegram/context'
import { WebShell } from './WebShell'
import { TelegramShell } from './TelegramShell'

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const tg = typeof window !== 'undefined' && isTelegram()
  if (tg) return <TelegramShell>{children}</TelegramShell>
  return <WebShell>{children}</WebShell>
}
