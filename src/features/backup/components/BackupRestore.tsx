'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  signInWithGoogle,
  getAccessToken,
  uploadBackup,
  listBackupFiles,
  downloadBackup,
  type DriveFile,
} from '../google-drive'
import { dbAddReading, dbGetAllReadings } from '@/lib/db/readings'
import { useReadings } from '@/features/readings/hooks/useReadings'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

export function BackupRestore({ onRestored }: { onRestored: () => void }) {
  const [authed, setAuthed] = useState(!!getAccessToken())
  const [files, setFiles] = useState<DriveFile[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const { reload } = useReadings()

  async function handleAuth() {
    try {
      await signInWithGoogle(GOOGLE_CLIENT_ID)
      setAuthed(true)
      setStatus('Connected to Google Drive')
    } catch (e) {
      setStatus(`Auth failed: ${(e as Error).message}`)
    }
  }

  async function handleBackup() {
    setBusy(true)
    setStatus('Backing up…')
    try {
      const readings = await dbGetAllReadings()
      const kek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ])
      const kekJwk = await crypto.subtle.exportKey('jwk', kek)
      const payload = JSON.stringify(readings)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encoded = new TextEncoder().encode(payload)
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, encoded)
      const combined = new Uint8Array(12 + ciphertext.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(ciphertext), 12)
      const encryptedPayload = btoa(String.fromCharCode(...combined))
      const content = JSON.stringify({
        version: 1,
        exportedAt: Date.now(),
        kek: kekJwk,
        encryptedPayload,
      })
      const filename = `bp-backup-${new Date().toISOString().slice(0, 10)}.bpdata`
      await uploadBackup(content, filename)
      setStatus(`Backup saved: ${filename}`)
    } catch (e) {
      setStatus(`Backup failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleListFiles() {
    setBusy(true)
    try {
      const list = await listBackupFiles()
      setFiles(list)
      if (list.length === 0) setStatus('No backups found in Drive')
    } catch (e) {
      setStatus(`Could not list files: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore(fileId: string) {
    if (!confirm('This will merge backup readings into your local data. Continue?')) return
    setBusy(true)
    setStatus('Restoring…')
    try {
      const content = await downloadBackup(fileId)
      const { kek: kekJwk, encryptedPayload } = JSON.parse(content) as {
        kek: JsonWebKey
        encryptedPayload: string
        version: number
      }
      const kek = await crypto.subtle.importKey(
        'jwk',
        kekJwk,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      )
      const combined = Uint8Array.from(atob(encryptedPayload), (c) => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const ciphertext = combined.slice(12)
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ciphertext)
      const readings = JSON.parse(new TextDecoder().decode(decrypted)) as Parameters<
        typeof dbAddReading
      >[0][]
      await Promise.all(readings.map((r) => dbAddReading(r)))
      onRestored()
      reload()
      setStatus(`Restored ${readings.length} readings`)
    } catch (e) {
      setStatus(`Restore failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-sm text-muted-foreground">
        Google Drive backup requires{' '}
        <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to be
        set.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {!authed ? (
        <Button variant="outline" className="w-full" onClick={handleAuth} disabled={busy}>
          Connect Google Drive
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleBackup} disabled={busy}>
            Back up now
          </Button>
          <Button variant="ghost" className="flex-1" onClick={handleListFiles} disabled={busy}>
            Restore…
          </Button>
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Select a backup to restore:</p>
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between text-sm">
              <span>{f.name}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRestore(f.id)} disabled={busy}>
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}
