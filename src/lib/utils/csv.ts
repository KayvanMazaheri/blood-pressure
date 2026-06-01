import { parseDate } from './date'
import { VALIDATION } from '@/features/readings/types'
import type { Reading } from '@/features/readings/types'

interface ParseResult {
  readings: Reading[]
  errors: string[]
}

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return { readings: [], errors: ['CSV has no data rows'] }

  const headers = lines[0]
    .toLowerCase()
    .split(',')
    .map((h) => h.trim())
  const col = (name: string) => headers.indexOf(name)

  const dateIdx = col('date')
  const timeIdx = col('time')
  const sysIdx = col('systolic')
  const diaIdx = col('diastolic')
  const pulseIdx = col('pulse')

  if (dateIdx === -1 || sysIdx === -1 || diaIdx === -1) {
    return { readings: [], errors: ['CSV must have columns: date, systolic, diastolic'] }
  }

  const readings: Reading[] = []
  const errors: string[] = []

  lines.slice(1).forEach((line, i) => {
    const rowNum = i + 2
    const cells = line.split(',').map((c) => c.trim())
    const dateStr = cells[dateIdx]
    const timeStr = timeIdx !== -1 ? cells[timeIdx] : undefined
    const sysStr = cells[sysIdx]
    const diaStr = cells[diaIdx]
    const pulseStr = pulseIdx !== -1 ? cells[pulseIdx] : undefined

    const parsedDate = parseDate(dateStr, timeStr)
    if (!parsedDate) {
      errors.push(`row ${rowNum}: invalid date "${dateStr}"`)
      return
    }

    const sys = Number(sysStr)
    const dia = Number(diaStr)
    const pulse = pulseStr ? Number(pulseStr) : undefined

    if (!sysStr || isNaN(sys) || sys < VALIDATION.systolic.min || sys > VALIDATION.systolic.max) {
      errors.push(`row ${rowNum}: invalid systolic "${sysStr}"`)
      return
    }
    if (!diaStr || isNaN(dia) || dia < VALIDATION.diastolic.min || dia > VALIDATION.diastolic.max) {
      errors.push(`row ${rowNum}: invalid diastolic "${diaStr}"`)
      return
    }
    if (
      pulse != null &&
      (isNaN(pulse) || pulse < VALIDATION.pulse.min || pulse > VALIDATION.pulse.max)
    ) {
      errors.push(`row ${rowNum}: invalid pulse "${pulseStr}"`)
      return
    }

    readings.push({
      id: crypto.randomUUID(),
      timestamp: parsedDate.getTime(),
      systolic: sys,
      diastolic: dia,
      pulse: pulse ?? undefined,
      source: 'import',
    })
  })

  return { readings, errors }
}
