'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TimeRange } from '@/features/readings/types'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
]

interface TimeRangeTabsProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <TabsList className="grid w-full grid-cols-6">
        {RANGES.map((r) => (
          <TabsTrigger key={r.value} value={r.value} className="text-xs">
            {r.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
