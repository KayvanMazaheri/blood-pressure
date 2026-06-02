// src/features/settings/components/DangerZone.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function DangerZone() {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete ALL readings and settings permanently? This cannot be undone.')) return
    setBusy(true)
    await dbClearAllData()
    if (isTelegram()) {
      await getSyncManager().clearCloudData()
    } else {
      localStorage.removeItem('bp_enc_key')
    }
    window.location.reload()
  }

  return (
    <div className="rounded-xl border border-destructive/30 p-4">
      <h3 className="mb-1 font-medium text-destructive">Danger Zone</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Permanently delete all readings and settings. This cannot be undone.
      </p>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete all data'}
      </Button>
    </div>
  )
}
