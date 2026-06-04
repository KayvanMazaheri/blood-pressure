'use client'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/PageHeader'
import { TargetForm } from '@/features/settings/components/TargetForm'
import { UnitToggle } from '@/features/settings/components/UnitToggle'
import { DangerZone } from '@/features/settings/components/DangerZone'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useTelegramBackButton } from '@/lib/telegram/hooks/useTelegramBackButton'
import { SyncSettings } from '@/features/sync/components/SyncSettings'
import { TelegramConnect } from '@/features/settings/components/TelegramConnect'
import dynamic from 'next/dynamic'

const BackupRestore = dynamic(
  () =>
    import('@/features/backup/components/BackupRestore').then((m) => ({
      default: m.BackupRestore,
    })),
  {
    ssr: false,
    loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
  }
)

const CsvImport = dynamic(
  () => import('@/features/backup/components/CsvImport').then((m) => ({ default: m.CsvImport })),
  {
    ssr: false,
    loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
  }
)

export default function SettingsPage() {
  useTelegramBackButton(true)
  const { settings, updateSettings } = useSettings()
  const { reload } = useReadings()

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="Settings" backHref="/" />
      <main className="space-y-6 p-4">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Targets
          </h2>
          <TargetForm settings={settings} onSave={(target) => updateSettings({ target })} />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Weight Unit
          </h2>
          <UnitToggle
            value={settings?.units.weight ?? 'kg'}
            onChange={(weight) => updateSettings({ units: { weight } })}
          />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Google Drive Backup
          </h2>
          <BackupRestore onRestored={reload} />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Import
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Import a CSV file with columns: date, time (optional), systolic, diastolic, pulse
            (optional).
          </p>
          <CsvImport onImported={reload} />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Telegram Sync
          </h2>
          <SyncSettings />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Use in Telegram
          </h2>
          <TelegramConnect />
        </section>

        <Separator />

        <DangerZone />
      </main>
    </div>
  )
}
