// src/features/sync/components/SyncStatus.tsx
'use client'
import { Button } from '@/components/ui/button'
import { useSync } from '../hooks/useSync'

export function SyncStatus() {
  const { isSyncing, lastSyncAt, error, sync, isAvailable } = useSync()
  if (!isAvailable) return null

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never'

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">
        {error ? (
          <span className="text-destructive">Sync failed: {error}</span>
        ) : isSyncing ? (
          <span className="text-muted-foreground">Syncing…</span>
        ) : (
          <span className="text-muted-foreground">Last synced: {lastSyncLabel}</span>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={sync} disabled={isSyncing}>
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </div>
  )
}
