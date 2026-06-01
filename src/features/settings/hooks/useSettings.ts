'use client'
import { useState, useEffect, useCallback } from 'react'
import { dbGetSettings, dbSaveSettings } from '@/lib/db/settings'
import type { Settings } from '@/features/readings/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    dbGetSettings().then(setSettings)
  }, [])

  const updateSettings = useCallback(
    async (updates: Partial<Omit<Settings, 'id' | 'createdAt'>>) => {
      const current = settings ?? (await dbGetSettings())
      const next: Settings = { ...current, ...updates }
      await dbSaveSettings(next)
      setSettings(next)
    },
    [settings]
  )

  return { settings, updateSettings }
}
