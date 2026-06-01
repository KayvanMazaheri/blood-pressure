import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReadings } from './useReadings'

vi.mock('@/lib/db/readings', () => ({
  dbAddReading: vi.fn(async () => {}),
  dbGetAllReadings: vi.fn(async () => []),
  dbDeleteReading: vi.fn(async () => {}),
  dbClearAllReadings: vi.fn(async () => {}),
}))

import * as dbModule from '@/lib/db/readings'

const mockReading = {
  id: 'test-1',
  timestamp: Date.now(),
  systolic: 128,
  diastolic: 84,
  source: 'manual' as const,
}

describe('useReadings', () => {
  beforeEach(() => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([])
  })

  it('loads readings on mount', async () => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([mockReading])
    const { result } = renderHook(() => useReadings())
    await act(async () => {})
    expect(result.current.readings).toHaveLength(1)
    expect(result.current.readings[0].systolic).toBe(128)
  })

  it('adds a reading', async () => {
    const { result } = renderHook(() => useReadings())
    await act(async () => {
      await result.current.addReading({ systolic: 120, diastolic: 80, timestamp: Date.now() })
    })
    expect(dbModule.dbAddReading).toHaveBeenCalledOnce()
  })

  it('deletes a reading', async () => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([mockReading])
    const { result } = renderHook(() => useReadings())
    await act(async () => {})
    await act(async () => {
      await result.current.deleteReading('test-1')
    })
    expect(dbModule.dbDeleteReading).toHaveBeenCalledWith('test-1')
  })
})
