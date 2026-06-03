import { describe, it, expect } from 'vitest'
import { compressString, decompressString } from '../compression'

describe('compression', () => {
  it('round-trips a plain string', async () => {
    const original = 'hello world'
    expect(await decompressString(await compressString(original))).toBe(original)
  })

  it('round-trips a JSON payload', async () => {
    const original = JSON.stringify({
      readings: [{ id: 'abc', systolic: 120, diastolic: 80, timestamp: 1717286400000 }],
    })
    expect(await decompressString(await compressString(original))).toBe(original)
  })

  it('compressed output is smaller than a large repetitive input', async () => {
    const large = JSON.stringify({
      readings: Array.from({ length: 200 }, (_, i) => ({
        id: `id-${i}`,
        systolic: 120,
        diastolic: 80,
        timestamp: 1717286400000 + i * 86400000,
      })),
    })
    const compressed = await compressString(large)
    expect(compressed.length).toBeLessThan(large.length)
  })
})
