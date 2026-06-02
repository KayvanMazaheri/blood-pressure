// src/features/sync/hooks/useSync.ts
'use client'
import { useState, useCallback, useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTelegram()) return
    setLastSyncAt(getSyncManager().lastSyncAt)
  }, [])

  const sync = useCallback(async () => {
    if (!isTelegram()) return
    const manager = getSyncManager()
    setIsSyncing(true)
    setError(null)
    try {
      await manager.pull()
      await manager.push()
      setLastSyncAt(manager.lastSyncAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { isSyncing, lastSyncAt, error, sync, isAvailable: isTelegram() }
}
