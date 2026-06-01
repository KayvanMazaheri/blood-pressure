import { describe, it, expect } from 'vitest'
import { parseCSV } from './csv'

describe('parseCSV', () => {
  it('parses ISO date + time + all fields', () => {
    const csv = 'date,time,systolic,diastolic,pulse\n2025-01-15,08:30,128,84,72'
    const { readings, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(readings).toHaveLength(1)
    expect(readings[0].systolic).toBe(128)
    expect(readings[0].diastolic).toBe(84)
    expect(readings[0].pulse).toBe(72)
    expect(readings[0].source).toBe('import')
  })

  it('parses DD/MM/YYYY date without time', () => {
    const csv = 'date,systolic,diastolic\n15/01/2025,120,80'
    const { readings, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(readings[0].systolic).toBe(120)
    expect(readings[0].pulse).toBeUndefined()
  })

  it('reports error for invalid systolic', () => {
    const csv = 'date,systolic,diastolic\n2025-01-01,999,80'
    const { readings, errors } = parseCSV(csv)
    expect(readings).toHaveLength(0)
    expect(errors[0]).toMatch(/row 2/)
  })

  it('imports valid rows and reports errors for invalid rows', () => {
    const csv = 'date,systolic,diastolic\n2025-01-01,120,80\n2025-01-02,999,80'
    const { readings, errors } = parseCSV(csv)
    expect(readings).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})
