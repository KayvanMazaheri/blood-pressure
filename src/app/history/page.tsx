'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ReadingList } from '@/features/readings/components/ReadingList'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { exportToCSV, exportToBpdata } from '@/features/backup/export'
import type { SaveResult } from '@/features/backup/save-file'
import { useTelegramBackButton } from '@/lib/telegram/hooks/useTelegramBackButton'
import { isTelegram } from '@/lib/telegram/context'
import { tgAlert, tgConfirm, tgPopup } from '@/lib/telegram/dialogs'

export default function HistoryPage() {
  useTelegramBackButton(true)
  const { readings, deleteReading } = useReadings()
  const { settings } = useSettings()
  const [exporting, setExporting] = useState(false)

  async function notifySaveResult(result: SaveResult) {
    if (result === 'copied') {
      await tgAlert('Export copied to the clipboard — paste it into a file to save it.')
    } else if (result === 'failed') {
      await tgAlert(
        'Could not export on this device. Open the app in a browser to download a file.'
      )
    }
  }

  async function handleExportCSV() {
    const confirmed = await tgConfirm(
      'This exports unencrypted health data as a plain CSV. Continue?'
    )
    if (!confirmed) return
    await notifySaveResult(await exportToCSV(readings))
  }

  async function handleExportBpdata() {
    setExporting(true)
    try {
      await notifySaveResult(await exportToBpdata(readings))
    } finally {
      setExporting(false)
    }
  }

  async function handleTelegramExport() {
    const buttonId = await tgPopup({
      title: 'Export Data',
      message: 'Choose an export format',
      buttons: [
        { id: 'csv', type: 'default', text: 'CSV (plain text)' },
        { id: 'bpdata', type: 'default', text: 'Encrypted backup (.bpdata)' },
        { id: 'cancel', type: 'cancel' },
      ],
    })
    if (buttonId === 'csv') await handleExportCSV()
    else if (buttonId === 'bpdata') await handleExportBpdata()
  }

  const exportMenu = isTelegram() ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTelegramExport}
      disabled={readings.length === 0 || exporting}
      aria-label="Export readings"
    >
      <Download className="h-4 w-4" />
    </Button>
  ) : (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={handleExportCSV} disabled={readings.length === 0}>
        CSV
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportBpdata}
        disabled={readings.length === 0 || exporting}
        aria-label="Export encrypted backup"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="History" backHref="/" actions={exportMenu} />
      <main className="p-4">
        <ReadingList
          readings={readings}
          onDelete={deleteReading}
          weightUnit={settings?.units.weight ?? 'kg'}
        />
      </main>
    </div>
  )
}
