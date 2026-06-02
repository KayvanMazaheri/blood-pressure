import type { Reading, Settings } from '@/features/readings/types'

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
