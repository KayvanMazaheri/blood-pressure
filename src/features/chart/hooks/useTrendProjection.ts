import { useMemo } from 'react'
import { linearRegression } from '@/lib/utils/stats'
import type { Reading } from '@/features/readings/types'

export interface TrendPoint {
  timestamp: number
  systolic: number
  diastolic: number
}

export function computeTrendPoints(readings: Reading[]): TrendPoint[] | null {
  if (readings.length < 3) return null

  const sysPoints = readings.map((r) => ({ x: r.timestamp, y: r.systolic }))
  const diaPoints = readings.map((r) => ({ x: r.timestamp, y: r.diastolic }))

  const sysReg = linearRegression(sysPoints)
  const diaReg = linearRegression(diaPoints)
  if (!sysReg || !diaReg) return null

  const timeSpan = readings[readings.length - 1].timestamp - readings[0].timestamp
  const extension10 = readings[readings.length - 1].timestamp + timeSpan * 0.1
  const extension20 = readings[readings.length - 1].timestamp + timeSpan * 0.2

  return [
    {
      timestamp: extension10,
      systolic: Math.round(sysReg.predict(extension10)),
      diastolic: Math.round(diaReg.predict(extension10)),
    },
    {
      timestamp: extension20,
      systolic: Math.round(sysReg.predict(extension20)),
      diastolic: Math.round(diaReg.predict(extension20)),
    },
  ]
}

export function useTrendProjection(readings: Reading[]): TrendPoint[] | null {
  return useMemo(() => computeTrendPoints(readings), [readings])
}
