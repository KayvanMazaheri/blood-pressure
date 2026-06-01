'use client'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'

export function KeyMissingError() {
  async function handleReset() {
    if (!confirm('This will delete all local data. Are you sure?')) return
    await dbClearAllData()
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Encryption key missing</h1>
      <p className="max-w-sm text-muted-foreground">
        Your local encryption key was cleared (e.g. localStorage was reset). Existing data cannot be
        decrypted. You can reset to start fresh.
      </p>
      <Button variant="destructive" onClick={handleReset}>
        Reset all data
      </Button>
    </div>
  )
}
