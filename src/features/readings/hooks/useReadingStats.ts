import { useMemo } from 'react'
import { average } from '@/lib/utils/stats'
import { filterByTimeRange } from '@/features/readings/types'
import type { Reading, TimeRange } from '@/features/readings/types'

export interface ReadingStats {
  avgSystolic: number | null
  avgDiastolic: number | null
  avgPulse: number | null
  count: number
  filtered: Reading[]
}

export function useReadingStats(readings: Reading[], range: TimeRange): ReadingStats {
  return useMemo(() => {
    const filtered = filterByTimeRange(readings, range)
    return {
      avgSystolic: average(filtered.map((r) => r.systolic)),
      avgDiastolic: average(filtered.map((r) => r.diastolic)),
      avgPulse: average(filtered.filter((r) => r.pulse != null).map((r) => r.pulse!)),
      count: filtered.length,
      filtered,
    }
  }, [readings, range])
}
