import { describe, it, expect } from 'vitest'
import { average, linearRegression } from './stats'

describe('average', () => {
  it('returns null for empty array', () => {
    expect(average([])).toBeNull()
  })
  it('computes mean', () => {
    expect(average([120, 130, 110])).toBeCloseTo(120)
  })
})

describe('linearRegression', () => {
  it('returns null for fewer than 3 points', () => {
    expect(linearRegression([{ x: 1, y: 100 }, { x: 2, y: 110 }])).toBeNull()
  })
  it('fits a perfect line', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 110 },
      { x: 2, y: 120 },
    ]
    const result = linearRegression(points)
    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(10)
    expect(result!.intercept).toBeCloseTo(100)
  })
  it('predicts a value', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 110 },
      { x: 2, y: 120 },
    ]
    const result = linearRegression(points)!
    expect(result.predict(3)).toBeCloseTo(130)
  })
})
