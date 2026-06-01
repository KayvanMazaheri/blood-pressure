import type { Reading } from '@/features/readings/types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToCSV(readings: Reading[]) {
  const header = 'date,time,systolic,diastolic,pulse'
  const rows = readings.map((r) => {
    const d = new Date(r.timestamp)
    const date = d.toISOString().slice(0, 10)
    const time = d.toTimeString().slice(0, 5)
    return `${date},${time},${r.systolic},${r.diastolic},${r.pulse ?? ''}`
  })
  const csv = [header, ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `bp-export-${Date.now()}.csv`)
}

export async function exportToBpdata(readings: Reading[]) {
  // Generate a one-time KEK for this export
  const kek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
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
  downloadBlob(new Blob([bpdata], { type: 'application/json' }), `bp-backup-${isoDate}.bpdata`)
}
