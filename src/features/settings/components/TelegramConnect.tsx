// src/features/settings/components/TelegramConnect.tsx
'use client'
import { Button } from '@/components/ui/button'
import { isTelegram } from '@/lib/telegram/context'
import { exportToBpdata } from '@/features/backup/export'
import { useReadings } from '@/features/readings/hooks/useReadings'

const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME

export function TelegramConnect() {
  const { readings } = useReadings()

  // Hidden inside Telegram and when env vars are not configured
  if (isTelegram() || !botName || !appName) return null

  const miniAppUrl = `https://t.me/${botName}/${appName}`

  async function handleExport() {
    if (readings.length === 0) {
      alert('No readings to export.')
      return
    }
    await exportToBpdata(readings)
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">
        Open this app inside Telegram to get automatic cross-device sync. Your data syncs
        to Telegram Cloud Storage so every device stays up to date.
      </p>
      <a
        href={miniAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        Open in Telegram ↗
      </a>
      {readings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Already have data here? Export it first, then import it after opening in
            Telegram.
          </p>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            Export your data
          </Button>
        </div>
      )}
    </div>
  )
}
