'use client'
import { useMemo } from 'react'
import { ReadingCard } from './ReadingCard'
import { formatMonthYear } from '@/lib/utils/date'
import type { Reading } from '@/features/readings/types'

interface ReadingListProps {
  readings: Reading[]
  onDelete: (id: string) => Promise<void>
  weightUnit: 'kg' | 'lbs'
}

export function ReadingList({ readings, onDelete, weightUnit }: ReadingListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Reading[]>()
    ;[...readings].reverse().forEach((r) => {
      const key = formatMonthYear(r.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return map
  }, [readings])

  if (readings.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">No readings yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {Array.from(grouped.entries()).map(([month, items]) => (
        <section key={month}>
          <h2 className="px-4 pb-1 pt-4 text-xs uppercase tracking-wider text-muted-foreground">
            {month}
          </h2>
          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {items.map((r) => (
              <ReadingCard key={r.id} reading={r} onDelete={onDelete} weightUnit={weightUnit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
