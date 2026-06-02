import type { Reading, Settings } from '@/features/readings/types'
import { compressString, decompressString } from '@/lib/utils/compression'
import { encrypt, decrypt } from '@/lib/crypto'
import { dbAddReading, dbGetAllReadings, dbDeleteReading } from '@/lib/db/readings'
import { dbGetSettings, dbSaveSettings } from '@/lib/db/settings'

// ── Pure logic ────────────────────────────────────────────────────────────────

export function mergeReadings(
  local: Reading[],
  cloud: Reading[],
  tombstones: string[],
): Reading[] {
  const tombstoneSet = new Set(tombstones)
  const merged = new Map<string, Reading>()

  for (const r of local) {
    if (!tombstoneSet.has(r.id)) merged.set(r.id, r)
  }
  for (const r of cloud) {
    if (!tombstoneSet.has(r.id) && !merged.has(r.id)) {
      merged.set(r.id, r)
    }
  }
  return Array.from(merged.values())
}

// ── CloudStorage Promise wrappers ─────────────────────────────────────────────

function cs() {
  return window.Telegram!.WebApp.CloudStorage
}

export function csGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    cs().getItem(key, (err, val) => resolve(err ? null : val || null))
  })
}

export function csSet(key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cs().setItem(key, value, (err) => (err ? reject(err) : resolve()))
  })
}

export function csGetMany(keys: string[]): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    cs().getItems(keys, (err, vals) => resolve(err ? {} : vals))
  })
}

export function csRemove(keys: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    cs().removeItems(keys, (err) => (err ? reject(err) : resolve()))
  })
}

export function csGetAllKeys(): Promise<string[]> {
  return new Promise((resolve) => {
    cs().getKeys((err, keys) => resolve(err ? [] : keys))
  })
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const SYNC_META_KEY = 'bp_sync_meta'
export const SYNC_TOMBSTONES_KEY = 'bp_sync_tombstones'
export const SYNC_CHUNK_PREFIX = 'bp_sync_chunk_'
export const LAST_SYNC_TS_KEY = 'bp_last_sync_at'
const CHUNK_SIZE = 3800

// ── Types (exported for SyncManager) ─────────────────────────────────────────

export interface SyncMeta {
  version: number
  lastSyncAt: number
  deviceId: string
  chunkCount: number
}

export interface SyncPayload {
  readings: Reading[]
  settings: Settings | null
}

export function chunkString(str: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size))
  return chunks
}

export { CHUNK_SIZE }

export class SyncManager {
  private _isSyncing = false
  private _lastSyncAt: number | null = null
  private _error: string | null = null
  private _deviceId: string
  private _pushTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this._deviceId = this._getOrCreateDeviceId()
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNC_TS_KEY) : null
    this._lastSyncAt = stored ? Number(stored) : null
  }

  get isSyncing() {
    return this._isSyncing
  }
  get lastSyncAt() {
    return this._lastSyncAt
  }
  get error() {
    return this._error
  }

  private _getOrCreateDeviceId(): string {
    const key = 'bp_device_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    return id
  }

  async getMeta(): Promise<SyncMeta | null> {
    const raw = await csGet(SYNC_META_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SyncMeta
    } catch {
      return null
    }
  }

  async getTombstones(): Promise<string[]> {
    const raw = await csGet(SYNC_TOMBSTONES_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  }

  async addTombstone(readingId: string): Promise<void> {
    const existing = await this.getTombstones()
    if (!existing.includes(readingId)) {
      existing.push(readingId)
      await csSet(SYNC_TOMBSTONES_KEY, JSON.stringify(existing))
    }
  }

  async push(): Promise<void> {
    if (this._isSyncing) return
    this._isSyncing = true
    this._error = null

    try {
      const [readings, settings] = await Promise.all([
        dbGetAllReadings(),
        dbGetSettings(),
      ])

      const payload: SyncPayload = { readings, settings }
      const json = JSON.stringify(payload)
      const compressed = await compressString(json)
      const encryptedBase64 = await encrypt(compressed)
      const chunks = chunkString(encryptedBase64, CHUNK_SIZE)

      const meta: SyncMeta = {
        version: 1,
        lastSyncAt: Date.now(),
        deviceId: this._deviceId,
        chunkCount: chunks.length,
      }

      await csSet(SYNC_META_KEY, JSON.stringify(meta))
      await Promise.all(
        chunks.map((chunk, i) =>
          csSet(`${SYNC_CHUNK_PREFIX}${String(i).padStart(3, '0')}`, chunk),
        ),
      )

      // Clean up stale chunks from a prior push that had more chunks
      const allKeys = await csGetAllKeys()
      const staleKeys = allKeys.filter((k) => {
        if (!k.startsWith(SYNC_CHUNK_PREFIX)) return false
        const idx = parseInt(k.slice(SYNC_CHUNK_PREFIX.length), 10)
        return idx >= chunks.length
      })
      if (staleKeys.length > 0) await csRemove(staleKeys)

      this._lastSyncAt = meta.lastSyncAt
      localStorage.setItem(LAST_SYNC_TS_KEY, String(meta.lastSyncAt))
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Sync failed'
      throw err
    } finally {
      this._isSyncing = false
    }
  }

  async pull(): Promise<void> {
    if (this._isSyncing) return
    this._isSyncing = true
    this._error = null

    try {
      const meta = await this.getMeta()
      if (!meta) return

      const chunkKeys = Array.from(
        { length: meta.chunkCount },
        (_, i) => `${SYNC_CHUNK_PREFIX}${String(i).padStart(3, '0')}`,
      )
      const chunkMap = await csGetMany(chunkKeys)
      const encryptedBase64 = chunkKeys.map((k) => chunkMap[k] ?? '').join('')

      const compressed = await decrypt(encryptedBase64)
      const json = await decompressString(compressed)
      const payload = JSON.parse(json) as SyncPayload

      const tombstones = await this.getTombstones()

      const localReadings = await dbGetAllReadings()
      const merged = mergeReadings(localReadings, payload.readings, tombstones)

      // Add readings that are in merged but not in local
      const localIds = new Set(localReadings.map((r) => r.id))
      for (const reading of merged) {
        if (!localIds.has(reading.id)) {
          await dbAddReading(reading)
        }
      }

      // Remove readings that are in local but not in merged (tombstoned)
      const mergedIds = new Set(merged.map((r) => r.id))
      for (const localReading of localReadings) {
        if (!mergedIds.has(localReading.id)) {
          await dbDeleteReading(localReading.id)
        }
      }

      // Settings: cloud wins if this is the authoritative sync
      if (payload.settings && meta.lastSyncAt > (this._lastSyncAt ?? 0)) {
        await dbSaveSettings(payload.settings)
      }

      this._lastSyncAt = meta.lastSyncAt
      localStorage.setItem(LAST_SYNC_TS_KEY, String(meta.lastSyncAt))
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Sync failed'
      throw err
    } finally {
      this._isSyncing = false
    }
  }

  schedulePush(debounceMs: number): void {
    if (this._pushTimer) clearTimeout(this._pushTimer)
    this._pushTimer = setTimeout(() => {
      this.push().catch(() => {})
      this._pushTimer = null
    }, debounceMs)
  }

  async shouldPullOnOpen(): Promise<boolean> {
    const meta = await this.getMeta()
    if (!meta) return false
    const localReadings = await dbGetAllReadings()
    if (localReadings.length === 0) return true
    return meta.lastSyncAt > (this._lastSyncAt ?? 0)
  }

  async clearCloudData(): Promise<void> {
    const allKeys = await csGetAllKeys()
    const syncKeys = allKeys.filter(
      (k) =>
        k === SYNC_META_KEY ||
        k === SYNC_TOMBSTONES_KEY ||
        k.startsWith(SYNC_CHUNK_PREFIX),
    )
    if (syncKeys.length > 0) await csRemove(syncKeys)
    const { TelegramCloudKeyProvider } = await import('./storage')
    const keyProvider = new TelegramCloudKeyProvider()
    await keyProvider.removeKey()
  }
}

let _instance: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!_instance) _instance = new SyncManager()
  return _instance
}

export function resetSyncManager(): void {
  _instance = null
}
