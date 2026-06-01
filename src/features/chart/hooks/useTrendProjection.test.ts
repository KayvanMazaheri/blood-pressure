import { describe, it, expect } from 'vitest'
import { computeTrendPoints } from './useTrendProjection'

const base = Date.now()
const readings = [
  { id: 'r1', timestamp: base, systolic: 120, diastolic: 80 },
  { id: 'r2', timestamp: base + 86_400_000, systolic: 122, diastolic: 81 },
  { id: 'r3', timestamp: base + 2 * 86_400_000, systolic: 124, diastolic: 82 },
]

describe('computeTrendPoints', () => {
  it('returns null for fewer than 3 readings', () => {
    expect(computeTrendPoints(readings.slice(0, 2))).toBeNull()
  })

  it('returns two projected points (at 10% and 20% extension)', () => {
    const result = computeTrendPoints(readings)
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].timestamp).toBeGreaterThan(readings[2].timestamp)
    expect(result![1].timestamp).toBeGreaterThan(result![0].timestamp)
  })

  it('trend points have systolic and diastolic values', () => {
    const result = computeTrendPoints(readings)!
    expect(typeof result[0].systolic).toBe('number')
    expect(typeof result[0].diastolic).toBe('number')
  })
})
