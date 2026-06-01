export interface Reading {
  id: string
  timestamp: number
  systolic: number
  diastolic: number
  pulse?: number
  armUsed?: 'left' | 'right'
  bodyPosition?: 'sitting' | 'standing' | 'lying'
  stressLevel?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  sleepQuality?: 'poor' | 'fair' | 'good'
  activityLevel?: 'none' | 'light' | 'moderate' | 'intense'
  caffeineCount?: number
  alcoholDrinks?: number
  sodiumIntake?: 'low' | 'normal' | 'high'
  medicationTaken?: boolean
  weightKg?: number
  notes?: string
  source?: 'manual' | 'import'
}

export interface Settings {
  id: 'profile'
  units: { weight: 'kg' | 'lbs' }
  target: { systolic: number; diastolic: number }
  createdAt: number
}

export const VALIDATION = {
  systolic: { min: 60, max: 250 },
  diastolic: { min: 40, max: 150 },
  pulse: { min: 30, max: 200 },
} as const

export type TimeRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all'

export function timeRangeToMs(range: TimeRange): number | null {
  const day = 86_400_000
  const map: Record<TimeRange, number | null> = {
    '7d': 7 * day,
    '1m': 30 * day,
    '3m': 90 * day,
    '6m': 180 * day,
    '1y': 365 * day,
    all: null,
  }
  return map[range]
}

export function filterByTimeRange(readings: Reading[], range: TimeRange): Reading[] {
  const ms = timeRangeToMs(range)
  if (!ms) return readings
  const cutoff = Date.now() - ms
  return readings.filter((r) => r.timestamp >= cutoff)
}
