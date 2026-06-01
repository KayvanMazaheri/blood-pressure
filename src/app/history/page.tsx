'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ReadingList } from '@/features/readings/components/ReadingList'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { exportToCSV, exportToBpdata } from '@/features/backup/export'

export default function HistoryPage() {
  const { readings, deleteReading } = useReadings()
  const { settings } = useSettings()
  const [exporting, setExporting] = useState(false)

  async function handleExport(format: 'csv' | 'bpdata') {
    if (format === 'csv') {
      if (!confirm('This exports unencrypted health data as a plain CSV. Continue?')) return
      exportToCSV(readings)
    } else {
      setExporting(true)
      try { await exportToBpdata(readings) }
      finally { setExporting(false) }
    }
  }

  const exportMenu = (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} disabled={readings.length === 0}>
        CSV
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleExport('bpdata')} disabled={readings.length === 0 || exporting}>
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
