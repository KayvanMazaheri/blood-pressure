'use client'
import { useState, useEffect, useCallback } from 'react'
import { dbAddReading, dbGetAllReadings, dbDeleteReading } from '@/lib/db/readings'
import type { Reading } from '@/features/readings/types'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

type NewReading = Omit<Reading, 'id' | 'source'>

export function useReadings() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await dbGetAllReadings()
      setReadings(data)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted) await load()
    })()
    return () => {
      mounted = false
    }
  }, [load])

  const addReading = useCallback(async (data: NewReading) => {
    const reading: Reading = {
      ...data,
      id: crypto.randomUUID(),
      source: 'manual',
    }
    try {
      await dbAddReading(reading)
      setReadings((prev) => [...prev, reading].sort((a, b) => a.timestamp - b.timestamp))
      if (isTelegram()) getSyncManager().schedulePush(30_000)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      throw e
    }
  }, [])

  const deleteReading = useCallback(async (id: string) => {
    try {
      await dbDeleteReading(id)
      setReadings((prev) => prev.filter((r) => r.id !== id))
      if (isTelegram()) {
        await getSyncManager().addTombstone(id)
        getSyncManager().schedulePush(5_000)
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      throw e
    }
  }, [])

  return { readings, loading, error, addReading, deleteReading, reload: load }
}
