'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { History, Settings } from 'lucide-react'
import { FAB } from '@/components/FAB'
import { StatCard } from '@/components/StatCard'
import { TimeRangeTabs } from '@/components/TimeRangeTabs'
import { KeyMissingError } from '@/components/KeyMissingError'
import { ReadingForm } from '@/features/readings/components/ReadingForm'
import { BPChart } from '@/features/chart/components/BPChart'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useReadingStats } from '@/features/readings/hooks/useReadingStats'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { formatTimestamp } from '@/lib/utils/date'
import { isKeyPresent } from '@/lib/crypto'
import type { TimeRange } from '@/features/readings/types'

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('1m')
  const [formOpen, setFormOpen] = useState(false)
  const [keyPresent, setKeyPresent] = useState<boolean | null>(null)

  useEffect(() => {
    isKeyPresent().then(setKeyPresent)
  }, [])
  const { readings, loading, error, addReading } = useReadings()
  const { settings } = useSettings()
  const { avgSystolic, avgDiastolic, avgPulse, filtered } = useReadingStats(readings, range)

  if (!loading && error && keyPresent === false) {
    return <KeyMissingError />
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-destructive">Failed to load data: {error.message}</p>
      </div>
    )
  }

  const recent = [...readings].reverse().slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur">
        <h1 className="flex-1 text-lg font-semibold">Blood Pressure</h1>
        <Link
          href="/history"
          aria-label="History"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm hover:bg-accent"
        >
          <History className="h-5 w-5" />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="flex-1 space-y-4 p-4">
        <TimeRangeTabs value={range} onChange={setRange} />

        <BPChart
          readings={filtered}
          range={range}
          targetSystolic={settings?.target.systolic}
          targetDiastolic={settings?.target.diastolic}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Avg Sys"
            value={avgSystolic != null ? Math.round(avgSystolic) : null}
            unit="mmHg"
            colorClass="text-red-400"
          />
          <StatCard
            label="Avg Dia"
            value={avgDiastolic != null ? Math.round(avgDiastolic) : null}
            unit="mmHg"
            colorClass="text-blue-400"
          />
          <StatCard
            label="Avg Pulse"
            value={avgPulse != null ? Math.round(avgPulse) : null}
            unit="bpm"
          />
        </div>

        {/* Recent readings */}
        {recent.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent
            </h2>
            <div className="divide-y divide-border rounded-xl border">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums text-red-400">
                      {r.systolic}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-lg font-bold tabular-nums text-blue-400">
                      {r.diastolic}
                    </span>
                    {r.pulse && (
                      <span className="ml-2 text-sm text-muted-foreground">{r.pulse} bpm</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(r.timestamp, 'short')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
      </main>

      <FAB onClick={() => setFormOpen(true)} />
      <ReadingForm open={formOpen} onOpenChange={setFormOpen} onSave={addReading} />
    </div>
  )
}
