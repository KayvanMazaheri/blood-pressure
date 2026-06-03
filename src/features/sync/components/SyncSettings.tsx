// src/features/sync/components/SyncSettings.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SyncStatus } from './SyncStatus'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function SyncSettings() {
  const [clearing, setClearing] = useState(false)

  if (!isTelegram()) return null

  async function handleClear() {
    if (
      !confirm(
        'This removes your data from Telegram Cloud Storage. Your local data is not affected. Continue?'
      )
    )
      return
    setClearing(true)
    try {
      await getSyncManager().clearCloudData()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-3">
      <SyncStatus />
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={handleClear}
        disabled={clearing}
      >
        {clearing ? 'Clearing…' : 'Clear cloud data'}
      </Button>
    </div>
  )
}
