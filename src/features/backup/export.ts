import type { Reading } from '@/features/readings/types'
import { saveTextFile, type SaveResult } from './save-file'

export function exportToCSV(readings: Reading[]): Promise<SaveResult> {
  const header = 'date,time,systolic,diastolic,pulse'
  const rows = readings.map((r) => {
    const d = new Date(r.timestamp)
    const date = d.toISOString().slice(0, 10)
    const time = d.toTimeString().slice(0, 5)
    return `${date},${time},${r.systolic},${r.diastolic},${r.pulse ?? ''}`
  })
  const csv = [header, ...rows].join('\n')
  return saveTextFile(csv, `bp-export-${Date.now()}.csv`, 'text/csv')
}

export async function exportToBpdata(readings: Reading[]): Promise<SaveResult> {
  // Generate a one-time KEK for this export
  const kek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const kekJwk = await crypto.subtle.exportKey('jwk', kek)

  // Encrypt the readings payload with the KEK
  const payload = JSON.stringify(readings)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(payload)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, encoded)
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), 12)
  const encryptedPayload = btoa(String.fromCharCode(...combined))

  const bpdata = JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    kek: kekJwk,
    encryptedPayload,
  })

  const isoDate = new Date().toISOString().slice(0, 10)
  return saveTextFile(bpdata, `bp-backup-${isoDate}.bpdata`, 'application/json')
}
