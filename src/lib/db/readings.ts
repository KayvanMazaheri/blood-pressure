import { encrypt, decrypt } from '@/lib/crypto'
import { db } from './schema'
import type { Reading } from '@/features/readings/types'

export async function dbAddReading(reading: Reading): Promise<void> {
  const encryptedData = await encrypt(JSON.stringify(reading))
  await db.readings.put({ id: reading.id, encryptedData })
}

export async function dbGetAllReadings(): Promise<Reading[]> {
  const records = await db.readings.toArray()
  const readings = await Promise.all(
    records.map(async (r) => JSON.parse(await decrypt(r.encryptedData)) as Reading)
  )
  return readings.sort((a, b) => a.timestamp - b.timestamp)
}

export async function dbDeleteReading(id: string): Promise<void> {
  await db.readings.delete(id)
}

export async function dbClearAllReadings(): Promise<void> {
  await db.readings.clear()
}
