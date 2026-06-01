'use client'
import { useState, useEffect, useCallback } from 'react'
import { dbAddReading, dbGetAllReadings, dbDeleteReading } from '@/lib/db/readings'
import type { Reading } from '@/features/readings/types'

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

  useEffect(() => { load() }, [load])

  const addReading = useCallback(async (data: NewReading) => {
    const reading: Reading = {
      ...data,
      id: crypto.randomUUID(),
      source: 'manual',
    }
    try {
      await dbAddReading(reading)
      setReadings((prev) => [...prev, reading].sort((a, b) => a.timestamp - b.timestamp))
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      throw e
    }
  }, [])

  const deleteReading = useCallback(async (id: string) => {
    try {
      await dbDeleteReading(id)
      setReadings((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      throw e
    }
  }, [])

  return { readings, loading, error, addReading, deleteReading, reload: load }
}
