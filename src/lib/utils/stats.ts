export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface Point {
  x: number
  y: number
}
interface RegressionResult {
  slope: number
  intercept: number
  predict: (x: number) => number
}

export interface TrendResult {
  direction: 'up' | 'down' | 'stable'
  delta: number | null
}

export function computeTrend(current: number | null, previous: number | null): TrendResult {
  if (current == null || previous == null) return { direction: 'stable', delta: null }
  const delta = Math.round(current - previous)
  if (Math.abs(delta) <= 2) return { direction: 'stable', delta: null }
  return { direction: delta > 0 ? 'up' : 'down', delta: Math.abs(delta) }
}

export function linearRegression(points: Point[]): RegressionResult | null {
  if (points.length < 3) return null
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, predict: (x) => slope * x + intercept }
}
