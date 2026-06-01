import { useMemo } from 'react'
import type { Reading } from '@/features/readings/types'
import { computeTrendPoints } from './useTrendProjection'

export interface ChartPoint {
  timestamp: number
  systolic?: number
  diastolic?: number
  isTrend?: boolean
}

export interface ChartDomain {
  yMin: number
  yMax: number
}

export function useChartData(readings: Reading[]): {
  data: ChartPoint[]
  domain: ChartDomain
} {
  return useMemo(() => {
    const base: ChartPoint[] = readings.map((r) => ({
      timestamp: r.timestamp,
      systolic: r.systolic,
      diastolic: r.diastolic,
    }))

    const trendPoints = computeTrendPoints(readings)
    const trend: ChartPoint[] = trendPoints
      ? trendPoints.map((t) => ({
          timestamp: t.timestamp,
          systolic: t.systolic,
          diastolic: t.diastolic,
          isTrend: true,
        }))
      : []

    const allSys = readings.map((r) => r.systolic)
    const allDia = readings.map((r) => r.diastolic)
    const allValues = [...allSys, ...allDia]

    if (allValues.length === 0) {
      return { data: [], domain: { yMin: 60, yMax: 160 } }
    }

    const rawMin = Math.min(...allValues)
    const rawMax = Math.max(...allValues)
    const span = rawMax - rawMin
    const padding = Math.max(10, (40 - span) / 2)
    const yMin = Math.max(40, Math.floor(rawMin - padding))
    const yMax = Math.ceil(rawMax + padding)

    return { data: [...base, ...trend], domain: { yMin, yMax } }
  }, [readings])
}
