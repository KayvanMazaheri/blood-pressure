// src/components/KeyMissingError.tsx
'use client'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function KeyMissingError() {
  async function handleReset() {
    if (!confirm('This will delete all local data. Are you sure?')) return
    await dbClearAllData()
    if (isTelegram()) {
      await getSyncManager().clearCloudData()
    } else {
      localStorage.clear()
    }
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Encryption key missing</h1>
      <p className="max-w-sm text-muted-foreground">
        Your encryption key was cleared. Existing data cannot be decrypted. You can reset to
        start fresh.
      </p>
      <Button variant="destructive" onClick={handleReset}>
        Reset all data
      </Button>
    </div>
  )
}
