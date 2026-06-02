'use client'
import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/telegram/haptics'
import { formatTimestamp } from '@/lib/utils/date'
import type { Reading } from '@/features/readings/types'

interface ReadingCardProps {
  reading: Reading
  onDelete: (id: string) => Promise<void>
  weightUnit: 'kg' | 'lbs'
}

const CONTEXT_ICONS: Partial<Record<keyof Reading, string>> = {
  stressLevel: '🧠',
  sleepHours: '😴',
  caffeineCount: '☕',
  alcoholDrinks: '🍷',
  medicationTaken: '💊',
  activityLevel: '🏃',
  sodiumIntake: '🧂',
  armUsed: '💪',
  bodyPosition: '🪑',
  weightKg: '⚖️',
}

export function ReadingCard({ reading, onDelete, weightUnit }: ReadingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const ahaClass =
    reading.systolic >= 140
      ? 'text-red-400'
      : reading.systolic >= 130
        ? 'text-orange-400'
        : reading.systolic >= 120
          ? 'text-yellow-400'
          : 'text-green-400'

  const contextKeys = (Object.keys(CONTEXT_ICONS) as Array<keyof Reading>).filter(
    (k) => reading[k] != null
  )

  async function handleDelete() {
    if (!confirm('Delete this reading?')) return
    haptic('warning')
    setDeleting(true)
    await onDelete(reading.id)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-baseline gap-1">
          <span className={`text-xl font-bold tabular-nums ${ahaClass}`}>{reading.systolic}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-xl font-bold tabular-nums text-blue-400">{reading.diastolic}</span>
          {reading.pulse && (
            <span className="ml-2 text-sm text-muted-foreground">{reading.pulse} bpm</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(reading.timestamp, 'long')}
        </span>
        {contextKeys.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground"
            aria-label={expanded ? 'Collapse context' : 'Expand context'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete reading"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Compact context icon strip */}
      {!expanded && contextKeys.length > 0 && (
        <div className="mt-1 flex gap-1">
          {contextKeys.map((k) => (
            <span key={k} className="text-xs" title={String(k)}>
              {CONTEXT_ICONS[k]}
            </span>
          ))}
        </div>
      )}

      {/* Expanded context */}
      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {reading.armUsed && <p>💪 Arm: {reading.armUsed}</p>}
          {reading.bodyPosition && <p>🪑 Position: {reading.bodyPosition}</p>}
          {reading.stressLevel != null && <p>🧠 Stress: {reading.stressLevel}/5</p>}
          {reading.sleepHours != null && (
            <p>
              😴 Sleep: {reading.sleepHours}h {reading.sleepQuality ?? ''}
            </p>
          )}
          {reading.activityLevel && <p>🏃 Activity: {reading.activityLevel}</p>}
          {reading.caffeineCount != null && <p>☕ Caffeine: {reading.caffeineCount} cups</p>}
          {reading.alcoholDrinks != null && <p>🍷 Alcohol: {reading.alcoholDrinks}</p>}
          {reading.sodiumIntake && <p>🧂 Sodium: {reading.sodiumIntake}</p>}
          {reading.medicationTaken != null && (
            <p>💊 Meds: {reading.medicationTaken ? 'taken' : 'missed'}</p>
          )}
          {reading.weightKg != null && (
            <p>
              ⚖️ Weight:{' '}
              {weightUnit === 'lbs'
                ? `${Math.round(reading.weightKg * 2.20462 * 10) / 10} lbs`
                : `${reading.weightKg} kg`}
            </p>
          )}
          {reading.notes && <p className="col-span-2">📝 {reading.notes}</p>}
        </div>
      )}
    </div>
  )
}
