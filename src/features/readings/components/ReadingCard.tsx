'use client'
import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/telegram/haptics'
import { tgConfirm } from '@/lib/telegram/dialogs'
import { formatTimestamp } from '@/lib/utils/date'
import { classifyBP, ahaColor } from '@/lib/utils/aha'
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

  const color = ahaColor(classifyBP(reading.systolic, reading.diastolic))

  const contextKeys = (Object.keys(CONTEXT_ICONS) as Array<keyof Reading>).filter(
    (k) => reading[k] != null
  )

  async function handleDelete() {
    const confirmed = await tgConfirm('Delete this reading?')
    if (!confirmed) return
    haptic('warning')
    setDeleting(true)
    await onDelete(reading.id)
  }

  return (
    <div className="flex">
      <div className="w-1 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 px-4 py-3">
        {/* Header row — tap to expand/collapse */}
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse reading details' : 'Expand reading details'}
        >
          <div className="flex flex-1 items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums">{reading.systolic}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-xl font-bold tabular-nums">{reading.diastolic}</span>
            {reading.pulse && (
              <span className="ml-2 text-sm text-muted-foreground">{reading.pulse} bpm</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(reading.timestamp, 'short')}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-safe:duration-150 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Compact context icon strip (collapsed) */}
        {!expanded && contextKeys.length > 0 && (
          <div className="mt-1 flex gap-1">
            {contextKeys.map((k) => (
              <span key={k} className="text-xs" title={String(k)}>
                {CONTEXT_ICONS[k]}
              </span>
            ))}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <>
            <hr className="my-2 border-border" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {reading.armUsed && <p>💪 {reading.armUsed === 'right' ? 'Right' : 'Left'} arm</p>}
              {reading.bodyPosition && (
                <p>
                  🪑 {reading.bodyPosition.charAt(0).toUpperCase() + reading.bodyPosition.slice(1)}
                </p>
              )}
              {reading.stressLevel != null && <p>🧠 Stress: {reading.stressLevel}/5</p>}
              {reading.sleepHours != null && (
                <p>
                  😴 {reading.sleepHours}h{reading.sleepQuality ? ` · ${reading.sleepQuality}` : ''}
                </p>
              )}
              {reading.activityLevel && (
                <p>
                  🏃{' '}
                  {reading.activityLevel.charAt(0).toUpperCase() + reading.activityLevel.slice(1)}
                </p>
              )}
              {reading.caffeineCount != null && <p>☕ {reading.caffeineCount} cups</p>}
              {reading.alcoholDrinks != null && <p>🍷 {reading.alcoholDrinks} drinks</p>}
              {reading.sodiumIntake && (
                <p>
                  🧂 {reading.sodiumIntake.charAt(0).toUpperCase() + reading.sodiumIntake.slice(1)}{' '}
                  sodium
                </p>
              )}
              {reading.medicationTaken != null && (
                <p>💊 Meds: {reading.medicationTaken ? 'taken' : 'missed'}</p>
              )}
              {reading.weightKg != null && (
                <p>
                  ⚖️{' '}
                  {weightUnit === 'lbs'
                    ? `${Math.round(reading.weightKg * 2.20462 * 10) / 10} lbs`
                    : `${reading.weightKg} kg`}
                </p>
              )}
              {reading.notes && <p className="col-span-2">📝 {reading.notes}</p>}
            </div>
            <div className="mt-2 flex justify-end">
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
          </>
        )}
      </div>
    </div>
  )
}
