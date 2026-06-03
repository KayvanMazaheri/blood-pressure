import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mergeReadings, csGet, csSet, csRemove, csGetAllKeys } from '../sync'
import type { Reading } from '@/features/readings/types'

const r = (id: string, systolic = 120): Reading => ({
  id,
  timestamp: 1717286400000,
  systolic,
  diastolic: 80,
  source: 'manual',
})

describe('mergeReadings', () => {
  it('returns local when cloud is empty', () => {
    const local = [r('a'), r('b')]
    expect(mergeReadings(local, [], [])).toEqual(local)
  })

  it('adds cloud readings not in local', () => {
    const merged = mergeReadings([r('a')], [r('b')], [])
    const ids = merged.map((x) => x.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('does not duplicate readings present in both', () => {
    const merged = mergeReadings([r('a')], [r('a', 130)], [])
    expect(merged).toHaveLength(1)
    expect(merged[0].systolic).toBe(120) // local wins for duplicates
  })

  it('filters out tombstoned readings from both sides', () => {
    const merged = mergeReadings([r('a'), r('b')], [r('c')], ['a', 'c'])
    expect(merged.map((x) => x.id)).toEqual(['b'])
  })

  it('returns empty array when all are tombstoned', () => {
    expect(mergeReadings([r('a')], [r('b')], ['a', 'b'])).toHaveLength(0)
  })
})

describe('CloudStorage helpers', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    // Type cast needed: test mock only implements the CloudStorage subset used by helpers
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {
        CloudStorage: {
          getItem: (key: string, cb: (err: null, val: string) => void) =>
            cb(null, store[key] ?? ''),
          setItem: (key: string, val: string, cb?: (err: null) => void) => {
            store[key] = val
            cb?.(null)
          },
          removeItem: (key: string, cb?: (err: null) => void) => {
            delete store[key]
            cb?.(null)
          },
          removeItems: (keys: string[], cb?: (err: null) => void) => {
            keys.forEach((k) => delete store[k])
            cb?.(null)
          },
          getItems: (keys: string[], cb: (err: null, vals: Record<string, string>) => void) => {
            const vals: Record<string, string> = {}
            keys.forEach((k) => {
              if (store[k] !== undefined) vals[k] = store[k]
            })
            cb(null, vals)
          },
          getKeys: (cb: (err: null, keys: string[]) => void) => cb(null, Object.keys(store)),
        } satisfies TelegramCloudStorage,
      } as unknown as TelegramWebApp,
    }
  })

  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('csSet then csGet returns the value', async () => {
    await csSet('my_key', 'my_value')
    expect(await csGet('my_key')).toBe('my_value')
  })

  it('csGet returns null for missing key', async () => {
    expect(await csGet('missing')).toBeNull()
  })

  it('csRemove deletes keys', async () => {
    await csSet('k1', 'v1')
    await csSet('k2', 'v2')
    await csRemove(['k1'])
    expect(await csGet('k1')).toBeNull()
    expect(await csGet('k2')).toBe('v2')
  })

  it('csGetAllKeys returns all stored keys', async () => {
    await csSet('a', '1')
    await csSet('b', '2')
    const keys = await csGetAllKeys()
    expect(keys.sort()).toEqual(['a', 'b'])
  })
})
