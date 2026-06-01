import { encrypt, decrypt } from '@/lib/crypto'
import { db } from './schema'
import type { Settings } from '@/features/readings/types'

const SETTINGS_ID = 'profile'

const DEFAULT_SETTINGS: Settings = {
  id: 'profile',
  units: { weight: 'kg' },
  target: { systolic: 120, diastolic: 80 },
  createdAt: Date.now(),
}

export async function dbGetSettings(): Promise<Settings> {
  const record = await db.settings.get(SETTINGS_ID)
  if (!record) return DEFAULT_SETTINGS
  return JSON.parse(await decrypt(record.encryptedData)) as Settings
}

export async function dbSaveSettings(settings: Settings): Promise<void> {
  const encryptedData = await encrypt(JSON.stringify(settings))
  await db.settings.put({ id: SETTINGS_ID, encryptedData })
}

export async function dbClearAllData(): Promise<void> {
  await db.readings.clear()
  await db.settings.clear()
}
