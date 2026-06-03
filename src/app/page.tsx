'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { History, Settings } from 'lucide-react'
import { FAB } from '@/components/FAB'
import { StatCard } from '@/components/StatCard'
import { TimeRangeTabs } from '@/components/TimeRangeTabs'
import { KeyMissingError } from '@/components/KeyMissingError'
import { ReadingForm } from '@/features/readings/components/ReadingForm'
import { ReadingCard } from '@/features/readings/components/ReadingCard'
import { BPChart } from '@/features/chart/components/BPChart'
import { HealthStatusHero } from '@/features/dashboard/components/HealthStatusHero'
import { EmptyState } from '@/features/dashboard/components/EmptyState'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useReadingStats } from '@/features/readings/hooks/useReadingStats'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useMainButton } from '@/lib/telegram/hooks/useMainButton'
import { isTelegram } from '@/lib/telegram/context'
import { isKeyPresent } from '@/lib/crypto'
import { average, computeTrend } from '@/lib/utils/stats'
import { timeRangeToMs } from '@/features/readings/types'
import type { TimeRange } from '@/features/readings/types'

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('1m')
  const [formOpen, setFormOpen] = useState(false)
  const [keyPresent, setKeyPresent] = useState<boolean | null>(null)

  useEffect(() => {
    isKeyPresent().then(setKeyPresent)
  }, [])

  const { readings, loading, error, addReading, deleteReading } = useReadings()
  const { settings } = useSettings()
  const { avgSystolic, avgDiastolic, avgPulse, filtered } = useReadingStats(readings, range)

  const prevFiltered = useMemo(() => {
    const ms = timeRangeToMs(range)
    if (!ms) return []
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return readings.filter((r) => r.timestamp >= now - 2 * ms && r.timestamp < now - ms)
  }, [readings, range])

  const prevAvgSystolic = useMemo(
    () => (prevFiltered.length > 0 ? average(prevFiltered.map((r) => r.systolic)) : null),
    [prevFiltered]
  )
  const prevAvgDiastolic = useMemo(
    () => (prevFiltered.length > 0 ? average(prevFiltered.map((r) => r.diastolic)) : null),
    [prevFiltered]
  )
  const prevAvgPulse = useMemo(() => {
    const withPulse = prevFiltered.filter((r) => r.pulse != null)
    return withPulse.length > 0 ? average(withPulse.map((r) => r.pulse!)) : null
  }, [prevFiltered])

  const sysTrend = computeTrend(avgSystolic, prevAvgSystolic)
  const diaTrend = computeTrend(avgDiastolic, prevAvgDiastolic)
  const pulseTrend = computeTrend(avgPulse, prevAvgPulse)

  const hasPrevPeriod = prevFiltered.length > 0

  useMainButton({
    text: 'Add Reading',
    visible: !formOpen,
    onClick: () => setFormOpen(true),
  })

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
  const weightUnit = settings?.units.weight ?? 'kg'

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Web shell header */}
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
        {/* Skeleton loading */}
        {loading && (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-muted motion-safe:animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            </div>
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-xl bg-muted" />
              <div className="h-12 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && readings.length === 0 && (
          <EmptyState onAddReading={() => setFormOpen(true)} />
        )}

        {/* Main dashboard content */}
        {!loading && readings.length > 0 && (
          <>
            {avgSystolic != null && avgDiastolic != null && (
              <HealthStatusHero
                avgSystolic={avgSystolic}
                avgDiastolic={avgDiastolic}
                count={filtered.length}
                trend={hasPrevPeriod ? sysTrend.direction : undefined}
              />
            )}

            <TimeRangeTabs value={range} onChange={setRange} />

            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Avg Sys"
                value={avgSystolic != null ? Math.round(avgSystolic) : null}
                unit="mmHg"
                colorClass="text-red-400"
                trend={hasPrevPeriod ? sysTrend.direction : undefined}
                delta={sysTrend.delta ?? undefined}
              />
              <StatCard
                label="Avg Dia"
                value={avgDiastolic != null ? Math.round(avgDiastolic) : null}
                unit="mmHg"
                colorClass="text-blue-400"
                trend={hasPrevPeriod ? diaTrend.direction : undefined}
                delta={diaTrend.delta ?? undefined}
              />
              <StatCard
                label="Avg Pulse"
                value={avgPulse != null ? Math.round(avgPulse) : null}
                unit="bpm"
                trend={hasPrevPeriod ? pulseTrend.direction : undefined}
                delta={pulseTrend.delta ?? undefined}
                neutralTrend
              />
            </div>

            <BPChart
              readings={filtered}
              range={range}
              targetSystolic={settings?.target.systolic}
              targetDiastolic={settings?.target.diastolic}
            />

            {recent.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Recent
                </h2>
                <div className="divide-y divide-border rounded-xl border overflow-hidden">
                  {recent.map((r) => (
                    <ReadingCard
                      key={r.id}
                      reading={r}
                      onDelete={deleteReading}
                      weightUnit={weightUnit}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {!isTelegram() && <FAB onClick={() => setFormOpen(true)} />}
      <ReadingForm open={formOpen} onOpenChange={setFormOpen} onSave={addReading} />
    </div>
  )
}
