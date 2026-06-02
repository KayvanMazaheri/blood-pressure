# Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the blood pressure tracker into a Telegram Mini App with a native shell, cloud-synced cross-device data, and an unchanged standalone web experience.

**Architecture:** Dual-shell design — `TelegramShell` (bottom nav, Telegram theming, haptics, BackButton, CloudStorage sync) and `WebShell` (unchanged current layout) — selected at runtime via `isTelegram()`. All health data stays in IndexedDB; the encryption key moves to Telegram CloudStorage in Telegram context for cross-device access. A `SyncManager` periodically pushes compressed+encrypted snapshots of all readings to CloudStorage and merges on pull.

**Tech Stack:** Next.js 16 static export, TypeScript strict, shadcn/ui base-nova (oklch CSS vars), Tailwind v4, Dexie.js, Web Crypto API, CompressionStream (native, no library), Telegram WebApp JS SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-telegram-mini-app-design.md`

---

## File Map

```
CREATE  src/types/telegram.d.ts                                   Telegram SDK global type declarations
CREATE  src/lib/telegram/context.ts                               isTelegram(), getTelegramUser(), getTelegramWebApp()
CREATE  src/lib/telegram/storage.ts                               KeyStorage interface + LocalStorageKeyProvider + TelegramCloudKeyProvider + createKeyStorage()
CREATE  src/lib/telegram/theme.ts                                 applyTelegramTheme()
CREATE  src/lib/telegram/haptics.ts                               haptic() helper
CREATE  src/lib/telegram/sync.ts                                  mergeReadings() + CloudStorage helpers + SyncManager class + getSyncManager()
CREATE  src/lib/telegram/hooks/useTelegramBackButton.ts           BackButton show/hide/handler hook
CREATE  src/lib/utils/compression.ts                              compressString() / decompressString() via CompressionStream
CREATE  src/components/shells/WebShell.tsx                        Thin wrapper — unchanged web layout passthrough
CREATE  src/components/shells/ShellProvider.tsx                   Client component — picks TelegramShell or WebShell
CREATE  src/components/shells/BottomNav.tsx                       3-tab bottom navigation for Telegram shell
CREATE  src/components/shells/TelegramShell.tsx                   Telegram root wrapper: init, theme, BackButton ctx, sync-on-open
CREATE  src/features/sync/hooks/useSync.ts                        Sync state + manual sync trigger hook
CREATE  src/features/sync/components/SyncStatus.tsx               Last-synced indicator + sync now button
CREATE  src/features/sync/components/SyncSettings.tsx             Settings-page sync section

MODIFY  src/lib/crypto/index.ts                                   Use createKeyStorage() instead of localStorage; isKeyPresent() → async
MODIFY  src/app/layout.tsx                                        Add Telegram SDK script; use ShellProvider; remove hardcoded dark class
MODIFY  src/app/page.tsx                                          Handle async isKeyPresent() via useState
MODIFY  src/app/history/page.tsx                                  Add useTelegramBackButton(true)
MODIFY  src/app/settings/page.tsx                                 Add BackButton + SyncSettings + TelegramConnect sections
MODIFY  src/features/readings/hooks/useReadings.ts                Schedule sync push after add/delete
MODIFY  src/features/readings/components/ReadingCard.tsx          Add haptic on delete
MODIFY  src/features/readings/components/ReadingForm.tsx          Add haptic on save
MODIFY  src/features/settings/components/DangerZone.tsx           Clear CloudStorage on data wipe in Telegram context
MODIFY  src/components/KeyMissingError.tsx                        Clear CloudStorage on reset in Telegram context
MODIFY  .env.local.example                                        Document two new env vars
MODIFY  .github/workflows/ci-deploy.yml                           Pass new env vars at build time

CREATE  src/lib/telegram/__tests__/context.test.ts
CREATE  src/lib/telegram/__tests__/storage.test.ts
CREATE  src/lib/telegram/__tests__/sync.test.ts
CREATE  src/lib/utils/__tests__/compression.test.ts
MODIFY  src/lib/crypto/index.test.ts                              Update for async isKeyPresent
```

---

### Task 1: Telegram SDK TypeScript Declarations

**Files:**
- Create: `src/types/telegram.d.ts`

The Telegram SDK is not on npm. Declare global types so TypeScript knows about `window.Telegram`.

- [ ] **Step 1: Create the declarations file**

```typescript
// src/types/telegram.d.ts
interface TelegramThemeParams {
  bg_color?: string
  secondary_bg_color?: string
  text_color?: string
  hint_color?: string
  button_color?: string
  button_text_color?: string
  destructive_text_color?: string
  accent_text_color?: string
  section_bg_color?: string
  link_color?: string
}

interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(fn: () => void): void
  offClick(fn: () => void): void
}

interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: Error | null) => void): void
  getItem(key: string, cb: (err: Error | null, value: string) => void): void
  getItems(
    keys: string[],
    cb: (err: Error | null, values: Record<string, string>) => void,
  ): void
  removeItem(key: string, cb?: (err: Error | null) => void): void
  removeItems(keys: string[], cb?: (err: Error | null) => void): void
  getKeys(cb: (err: Error | null, keys: string[]) => void): void
}

interface TelegramWebApp {
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    auth_date?: number
    hash?: string
  }
  HapticFeedback: TelegramHapticFeedback
  BackButton: TelegramBackButton
  CloudStorage: TelegramCloudStorage
  ready(): void
  expand(): void
  close(): void
  onEvent(eventType: string, eventHandler: () => void): void
  offEvent(eventType: string, eventHandler: () => void): void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export {}
```

- [ ] **Step 2: Verify TypeScript accepts the types**

```bash
npx tsc --noEmit
```

Expected: no errors related to `window.Telegram`.

- [ ] **Step 3: Commit**

```bash
git add src/types/telegram.d.ts
git commit -m "Add Telegram SDK TypeScript global declarations"
```

---

### Task 2: Context Detection Module

**Files:**
- Create: `src/lib/telegram/context.ts`
- Create: `src/lib/telegram/__tests__/context.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/telegram/__tests__/context.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { isTelegram, getTelegramUser, getTelegramWebApp } from '../context'

describe('isTelegram', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns false when window.Telegram is absent', () => {
    expect(isTelegram()).toBe(false)
  })

  it('returns false when initDataUnsafe.user is absent', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: {} },
    }
    expect(isTelegram()).toBe(false)
  })

  it('returns true when user is present in initDataUnsafe', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: { user: { id: 1, first_name: 'Test' } } },
    }
    expect(isTelegram()).toBe(true)
  })
})

describe('getTelegramUser', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns null when not in Telegram', () => {
    expect(getTelegramUser()).toBeNull()
  })

  it('returns user object when in Telegram', () => {
    const user = { id: 42, first_name: 'Alice', username: 'alice' }
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: { user } },
    }
    expect(getTelegramUser()).toEqual(user)
  })
})

describe('getTelegramWebApp', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns null when window.Telegram is absent', () => {
    expect(getTelegramWebApp()).toBeNull()
  })

  it('returns WebApp when present', () => {
    const webApp = { initDataUnsafe: { user: { id: 1, first_name: 'T' } } }
    ;(window as Window & { Telegram: unknown }).Telegram = { WebApp: webApp }
    expect(getTelegramWebApp()).toBe(webApp)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --run src/lib/telegram/__tests__/context.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```typescript
// src/lib/telegram/context.ts
export function isTelegram(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.Telegram?.WebApp?.initDataUnsafe?.user
  )
}

export function getTelegramUser(): TelegramWebApp['initDataUnsafe']['user'] | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --run src/lib/telegram/__tests__/context.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/context.ts src/lib/telegram/__tests__/context.test.ts
git commit -m "Add Telegram context detection utility"
```

---

### Task 3: KeyStorage Abstraction

**Files:**
- Create: `src/lib/telegram/storage.ts`
- Create: `src/lib/telegram/__tests__/storage.test.ts`

`LocalStorageKeyProvider` wraps the existing `localStorage['bp_enc_key']` access. `TelegramCloudKeyProvider` wraps the callback-based CloudStorage API in Promises. `createKeyStorage()` is the factory used by the crypto module.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/telegram/__tests__/storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  LocalStorageKeyProvider,
  TelegramCloudKeyProvider,
  createKeyStorage,
} from '../storage'

describe('LocalStorageKeyProvider', () => {
  const provider = new LocalStorageKeyProvider()
  beforeEach(() => localStorage.clear())

  it('getKey returns null when nothing stored', async () => {
    expect(await provider.getKey()).toBeNull()
  })

  it('setKey then getKey returns the value', async () => {
    await provider.setKey('my-jwk')
    expect(await provider.getKey()).toBe('my-jwk')
  })

  it('hasKey returns false before set', async () => {
    expect(await provider.hasKey()).toBe(false)
  })

  it('hasKey returns true after set', async () => {
    await provider.setKey('my-jwk')
    expect(await provider.hasKey()).toBe(true)
  })

  it('removeKey clears the stored value', async () => {
    await provider.setKey('my-jwk')
    await provider.removeKey()
    expect(await provider.getKey()).toBeNull()
  })
})

describe('TelegramCloudKeyProvider', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {
        CloudStorage: {
          getItem: (key: string, cb: (err: null, val: string) => void) =>
            cb(null, store[key] ?? ''),
          setItem: (
            key: string,
            val: string,
            cb?: (err: null) => void,
          ) => {
            store[key] = val
            cb?.(null)
          },
          removeItem: (key: string, cb?: (err: null) => void) => {
            delete store[key]
            cb?.(null)
          },
        },
      },
    }
  })

  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('getKey returns null when nothing stored', async () => {
    const p = new TelegramCloudKeyProvider()
    expect(await p.getKey()).toBeNull()
  })

  it('setKey then getKey returns the value', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    expect(await p.getKey()).toBe('tg-jwk')
  })

  it('hasKey returns true after set', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    expect(await p.hasKey()).toBe(true)
  })

  it('removeKey clears the stored value', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    await p.removeKey()
    expect(await p.getKey()).toBeNull()
  })
})

describe('createKeyStorage', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns LocalStorageKeyProvider outside Telegram', () => {
    expect(createKeyStorage()).toBeInstanceOf(LocalStorageKeyProvider)
  })

  it('returns TelegramCloudKeyProvider inside Telegram', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: { user: { id: 1, first_name: 'T' } } },
    }
    expect(createKeyStorage()).toBeInstanceOf(TelegramCloudKeyProvider)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --run src/lib/telegram/__tests__/storage.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```typescript
// src/lib/telegram/storage.ts
import { isTelegram } from './context'

export interface KeyStorage {
  getKey(): Promise<string | null>
  setKey(key: string): Promise<void>
  removeKey(): Promise<void>
  hasKey(): Promise<boolean>
}

export class LocalStorageKeyProvider implements KeyStorage {
  private readonly storageKey = 'bp_enc_key'

  async getKey(): Promise<string | null> {
    return localStorage.getItem(this.storageKey)
  }

  async setKey(key: string): Promise<void> {
    localStorage.setItem(this.storageKey, key)
  }

  async removeKey(): Promise<void> {
    localStorage.removeItem(this.storageKey)
  }

  async hasKey(): Promise<boolean> {
    return localStorage.getItem(this.storageKey) !== null
  }
}

export class TelegramCloudKeyProvider implements KeyStorage {
  private readonly storageKey = 'bp_enc_key'

  async getKey(): Promise<string | null> {
    return new Promise((resolve) => {
      window.Telegram!.WebApp.CloudStorage.getItem(this.storageKey, (err, val) =>
        resolve(err ? null : val || null),
      )
    })
  }

  async setKey(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.setItem(this.storageKey, key, (err) =>
        err ? reject(err) : resolve(),
      )
    })
  }

  async removeKey(): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.removeItem(this.storageKey, (err) =>
        err ? reject(err) : resolve(),
      )
    })
  }

  async hasKey(): Promise<boolean> {
    const key = await this.getKey()
    return key !== null
  }
}

export function createKeyStorage(): KeyStorage {
  return isTelegram() ? new TelegramCloudKeyProvider() : new LocalStorageKeyProvider()
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --run src/lib/telegram/__tests__/storage.test.ts
```

Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/storage.ts src/lib/telegram/__tests__/storage.test.ts
git commit -m "Add KeyStorage abstraction with Local and Telegram Cloud providers"
```

---

### Task 4: Crypto Module Update + Dashboard Fix

**Files:**
- Modify: `src/lib/crypto/index.ts`
- Modify: `src/lib/crypto/index.test.ts`
- Modify: `src/app/page.tsx`

`isKeyPresent()` must become async to support CloudStorage. The dashboard page must await it.

- [ ] **Step 1: Update `src/lib/crypto/index.ts`**

Replace the entire file:

```typescript
// src/lib/crypto/index.ts
import { createKeyStorage } from '@/lib/telegram/storage'

let cachedKey: CryptoKey | null = null

export function clearKeyCache(): void {
  cachedKey = null
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const storage = createKeyStorage()
  const stored = await storage.getKey()

  if (stored) {
    const jwk = JSON.parse(stored) as JsonWebKey
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )
    return cachedKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', key)
  await storage.setKey(JSON.stringify(jwk))
  cachedKey = key
  return key
}

export async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), 12)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(data: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(decrypted)
}

export async function isKeyPresent(): Promise<boolean> {
  return createKeyStorage().hasKey()
}
```

- [ ] **Step 2: Update `src/lib/crypto/index.test.ts`**

Replace the entire test file:

```typescript
// src/lib/crypto/index.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt, clearKeyCache, isKeyPresent } from './index'

describe('crypto', () => {
  beforeEach(() => {
    localStorage.clear()
    clearKeyCache()
  })

  it('encrypts and decrypts a string', async () => {
    const original = JSON.stringify({ systolic: 128, diastolic: 84 })
    const ciphertext = await encrypt(original)
    expect(ciphertext).not.toBe(original)
    const plaintext = await decrypt(ciphertext)
    expect(plaintext).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const a = await encrypt('hello')
    const b = await encrypt('hello')
    expect(a).not.toBe(b)
  })

  it('persists the key in localStorage across calls', async () => {
    await encrypt('test')
    const key1 = localStorage.getItem('bp_enc_key')
    clearKeyCache()
    await encrypt('test2')
    const key2 = localStorage.getItem('bp_enc_key')
    expect(key1).toBe(key2)
  })

  it('isKeyPresent returns false before first use', async () => {
    expect(await isKeyPresent()).toBe(false)
  })

  it('isKeyPresent returns true after first encrypt', async () => {
    await encrypt('data')
    expect(await isKeyPresent()).toBe(true)
  })
})
```

- [ ] **Step 3: Run crypto tests — expect pass**

```bash
npm test -- --run src/lib/crypto/index.test.ts
```

Expected: 5 passed.

- [ ] **Step 4: Update `src/app/page.tsx` — fix async isKeyPresent**

Change the React import (line 2) from:
```typescript
import { useState } from 'react'
```
to:
```typescript
import { useState, useEffect } from 'react'
```

After the existing two `useState` lines, add:
```typescript
const [keyPresent, setKeyPresent] = useState<boolean | null>(null)
```

After that state line, add:
```typescript
useEffect(() => {
  isKeyPresent().then(setKeyPresent)
}, [])
```

Replace the early return guard (line 25):
```typescript
// OLD:
if (!loading && error && typeof window !== 'undefined' && !isKeyPresent()) {
  return <KeyMissingError />
}

// NEW:
if (!loading && error && keyPresent === false) {
  return <KeyMissingError />
}
```

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto/index.ts src/lib/crypto/index.test.ts src/app/page.tsx
git commit -m "Make isKeyPresent async; use KeyStorage abstraction in crypto module"
```

---

### Task 5: Compression Utilities

**Files:**
- Create: `src/lib/utils/compression.ts`
- Create: `src/lib/utils/__tests__/compression.test.ts`

Uses the native `CompressionStream` / `DecompressionStream` API (available in Node 18+ and all Telegram client WebViews). No library dependency.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/utils/__tests__/compression.test.ts
import { describe, it, expect } from 'vitest'
import { compressString, decompressString } from '../compression'

describe('compression', () => {
  it('round-trips a plain string', async () => {
    const original = 'hello world'
    expect(await decompressString(await compressString(original))).toBe(original)
  })

  it('round-trips a JSON payload', async () => {
    const original = JSON.stringify({
      readings: [
        { id: 'abc', systolic: 120, diastolic: 80, timestamp: 1717286400000 },
      ],
    })
    expect(await decompressString(await compressString(original))).toBe(original)
  })

  it('compressed output is smaller than a large repetitive input', async () => {
    const large = JSON.stringify({
      readings: Array.from({ length: 200 }, (_, i) => ({
        id: `id-${i}`,
        systolic: 120,
        diastolic: 80,
        timestamp: 1717286400000 + i * 86400000,
      })),
    })
    const compressed = await compressString(large)
    expect(compressed.length).toBeLessThan(large.length)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --run src/lib/utils/__tests__/compression.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```typescript
// src/lib/utils/compression.ts
async function streamToUint8Array(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function compressString(input: string): Promise<string> {
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(input))
  writer.close()
  const compressed = await streamToUint8Array(stream.readable)
  return btoa(String.fromCharCode(...compressed))
}

export async function decompressString(input: string): Promise<string> {
  const binary = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(binary)
  writer.close()
  const decompressed = await streamToUint8Array(stream.readable)
  return new TextDecoder().decode(decompressed)
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --run src/lib/utils/__tests__/compression.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/compression.ts src/lib/utils/__tests__/compression.test.ts
git commit -m "Add gzip compression utilities using native CompressionStream API"
```

---

### Task 6: Sync Pure Logic + CloudStorage Helpers

**Files:**
- Create: `src/lib/telegram/sync.ts` (partial — pure logic and helpers only)
- Create: `src/lib/telegram/__tests__/sync.test.ts`

`mergeReadings` is a pure function (easy to test). CloudStorage helpers wrap the callback API in Promises.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/telegram/__tests__/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mergeReadings, csGet, csSet, csRemove, csGetAllKeys } from '../sync'
import type { Reading } from '@/features/readings/types'

const r = (id: string, systolic = 120): Reading => ({
  id,
  timestamp: 1717286400000,
  systolic,
  diastolic: 80,
  source: 'manual',
})

describe('mergeReadings', () => {
  it('returns local when cloud is empty', () => {
    const local = [r('a'), r('b')]
    expect(mergeReadings(local, [], [])).toEqual(local)
  })

  it('adds cloud readings not in local', () => {
    const merged = mergeReadings([r('a')], [r('b')], [])
    const ids = merged.map((x) => x.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('does not duplicate readings present in both', () => {
    const merged = mergeReadings([r('a')], [r('a', 130)], [])
    expect(merged).toHaveLength(1)
    expect(merged[0].systolic).toBe(120) // local wins for duplicates
  })

  it('filters out tombstoned readings from both sides', () => {
    const merged = mergeReadings([r('a'), r('b')], [r('c')], ['a', 'c'])
    expect(merged.map((x) => x.id)).toEqual(['b'])
  })

  it('returns empty array when all are tombstoned', () => {
    expect(mergeReadings([r('a')], [r('b')], ['a', 'b'])).toHaveLength(0)
  })
})

describe('CloudStorage helpers', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {
        CloudStorage: {
          getItem: (key: string, cb: (err: null, val: string) => void) =>
            cb(null, store[key] ?? ''),
          setItem: (key: string, val: string, cb?: (err: null) => void) => {
            store[key] = val
            cb?.(null)
          },
          removeItems: (keys: string[], cb?: (err: null) => void) => {
            keys.forEach((k) => delete store[k])
            cb?.(null)
          },
          getKeys: (cb: (err: null, keys: string[]) => void) =>
            cb(null, Object.keys(store)),
        },
      },
    }
  })

  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('csSet then csGet returns the value', async () => {
    await csSet('my_key', 'my_value')
    expect(await csGet('my_key')).toBe('my_value')
  })

  it('csGet returns null for missing key', async () => {
    expect(await csGet('missing')).toBeNull()
  })

  it('csRemove deletes keys', async () => {
    await csSet('k1', 'v1')
    await csSet('k2', 'v2')
    await csRemove(['k1'])
    expect(await csGet('k1')).toBeNull()
    expect(await csGet('k2')).toBe('v2')
  })

  it('csGetAllKeys returns all stored keys', async () => {
    await csSet('a', '1')
    await csSet('b', '2')
    const keys = await csGetAllKeys()
    expect(keys.sort()).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --run src/lib/telegram/__tests__/sync.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure logic and helpers**

```typescript
// src/lib/telegram/sync.ts
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --run src/lib/telegram/__tests__/sync.test.ts
```

Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/sync.ts src/lib/telegram/__tests__/sync.test.ts
git commit -m "Add sync pure logic and CloudStorage Promise helpers"
```

---

### Task 7: SyncManager

**Files:**
- Modify: `src/lib/telegram/sync.ts` (append `SyncManager` class and `getSyncManager()`)

- [ ] **Step 1: Append `SyncManager` to `src/lib/telegram/sync.ts`**

Add the following to the end of the file:

```typescript
import { compressString, decompressString } from '@/lib/utils/compression'
import { encrypt, decrypt } from '@/lib/crypto'
import { dbAddReading, dbGetAllReadings, dbDeleteReading } from '@/lib/db/readings'
import { dbGetSettings, dbSaveSettings } from '@/lib/db/settings'

export class SyncManager {
  private _isSyncing = false
  private _lastSyncAt: number | null = null
  private _error: string | null = null
  private _deviceId: string
  private _pushTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this._deviceId = this._getOrCreateDeviceId()
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
      const tombstoneSet = new Set(tombstones)

      const localReadings = await dbGetAllReadings()
      const localIds = new Set(localReadings.map((r) => r.id))

      // Add cloud readings not present locally (and not tombstoned)
      for (const cloudReading of payload.readings) {
        if (!tombstoneSet.has(cloudReading.id) && !localIds.has(cloudReading.id)) {
          await dbAddReading(cloudReading)
        }
      }

      // Apply tombstones to local DB
      for (const id of tombstones) {
        if (localIds.has(id)) await dbDeleteReading(id)
      }

      // Settings: cloud wins if this is the authoritative sync
      if (payload.settings && meta.lastSyncAt > (this._lastSyncAt ?? 0)) {
        await dbSaveSettings(payload.settings)
      }

      this._lastSyncAt = meta.lastSyncAt
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
```

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass (SyncManager itself is not unit tested here — it requires a live DB and CloudStorage; end-to-end tested manually in Telegram).

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/sync.ts
git commit -m "Add SyncManager with push/pull/tombstone and debounced scheduling"
```

---

### Task 8: Telegram Theming + Haptics

**Files:**
- Create: `src/lib/telegram/theme.ts`
- Create: `src/lib/telegram/haptics.ts`

The CSS variables in `globals.css` use `oklch(...)` but are consumed directly (not inside a color function), so hex values from Telegram's `themeParams` are valid overrides.

- [ ] **Step 1: Create `src/lib/telegram/theme.ts`**

```typescript
// src/lib/telegram/theme.ts
export function applyTelegramTheme(params: TelegramThemeParams): void {
  const map: [string, string | undefined][] = [
    ['--background', params.bg_color],
    ['--card', params.secondary_bg_color],
    ['--muted', params.secondary_bg_color],
    ['--accent', params.secondary_bg_color],
    ['--popover', params.section_bg_color ?? params.secondary_bg_color],
    ['--foreground', params.text_color],
    ['--card-foreground', params.text_color],
    ['--popover-foreground', params.text_color],
    ['--accent-foreground', params.text_color],
    ['--muted-foreground', params.hint_color],
    ['--primary', params.button_color],
    ['--primary-foreground', params.button_text_color],
    ['--destructive', params.destructive_text_color],
    ['--ring', params.accent_text_color ?? params.button_color],
    ['--border', params.hint_color ? `${params.hint_color}33` : undefined],
    ['--input', params.hint_color ? `${params.hint_color}33` : undefined],
  ]

  let styleEl = document.getElementById('tg-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'tg-theme'
    document.head.appendChild(styleEl)
  }

  const vars = map
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')

  styleEl.textContent = `:root { ${vars} }`
}
```

- [ ] **Step 2: Create `src/lib/telegram/haptics.ts`**

```typescript
// src/lib/telegram/haptics.ts
import { isTelegram } from './context'

type HapticType = 'success' | 'warning' | 'error' | 'selection' | 'light'

export function haptic(type: HapticType): void {
  if (!isTelegram()) return
  const hf = window.Telegram!.WebApp.HapticFeedback
  if (type === 'selection') {
    hf.selectionChanged()
  } else if (type === 'light') {
    hf.impactOccurred('light')
  } else {
    hf.notificationOccurred(type)
  }
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/telegram/theme.ts src/lib/telegram/haptics.ts
git commit -m "Add Telegram theming and haptic feedback helpers"
```

---

### Task 9: Shell Infrastructure

**Files:**
- Create: `src/components/shells/WebShell.tsx`
- Create: `src/components/shells/ShellProvider.tsx`
- Modify: `src/app/layout.tsx`

The `WebShell` is a passthrough (no visual change for existing web users). `ShellProvider` detects context client-side and renders the appropriate shell. `layout.tsx` loads the Telegram SDK script and uses `ShellProvider`.

- [ ] **Step 1: Create `src/components/shells/WebShell.tsx`**

```tsx
// src/components/shells/WebShell.tsx
export function WebShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Create `src/components/shells/ShellProvider.tsx`**

```tsx
// src/components/shells/ShellProvider.tsx
'use client'
import { isTelegram } from '@/lib/telegram/context'
import { WebShell } from './WebShell'
import { TelegramShell } from './TelegramShell'

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const tg = typeof window !== 'undefined' && isTelegram()
  if (tg) return <TelegramShell>{children}</TelegramShell>
  return <WebShell>{children}</WebShell>
}
```

Note: `TelegramShell` is created in Task 11 — this file will throw a build error until then. The plan uses a placeholder approach: create the `TelegramShell` stub in this task so the app compiles.

Create `src/components/shells/TelegramShell.tsx` (stub — will be replaced in Task 11):

```tsx
// src/components/shells/TelegramShell.tsx (stub)
'use client'

export function TelegramShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

Replace the entire file:

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { ShellProvider } from '@/components/shells/ShellProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Blood Pressure Tracker',
  description: 'Private, local-first blood pressure tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <ShellProvider>{children}</ShellProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Run full test suite and type check**

```bash
npm test -- --run && npx tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shells/WebShell.tsx src/components/shells/ShellProvider.tsx \
        src/components/shells/TelegramShell.tsx src/app/layout.tsx
git commit -m "Add shell infrastructure: WebShell, ShellProvider, stub TelegramShell, update layout"
```

---

### Task 10: BackButton Hook + BottomNav

**Files:**
- Create: `src/lib/telegram/hooks/useTelegramBackButton.ts`
- Create: `src/components/shells/BottomNav.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create `src/lib/telegram/hooks/useTelegramBackButton.ts`**

```typescript
// src/lib/telegram/hooks/useTelegramBackButton.ts
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isTelegram } from '@/lib/telegram/context'

export function useTelegramBackButton(show: boolean): void {
  const router = useRouter()

  useEffect(() => {
    if (!isTelegram()) return
    const btn = window.Telegram!.WebApp.BackButton
    const handleClick = () => router.back()

    if (show) {
      btn.show()
      btn.onClick(handleClick)
    } else {
      btn.hide()
    }

    return () => {
      btn.offClick(handleClick)
      if (show) btn.hide()
    }
  }, [show, router])
}
```

- [ ] **Step 2: Create `src/components/shells/BottomNav.tsx`**

```tsx
// src/components/shells/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Settings } from 'lucide-react'
import { haptic } from '@/lib/telegram/haptics'

const TABS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/history', icon: ClipboardList, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: 'var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors"
              style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
              onClick={() => haptic('selection')}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Add `useTelegramBackButton` to `src/app/history/page.tsx`**

Add the import at the top of the file (after the existing imports):

```typescript
import { useTelegramBackButton } from '@/lib/telegram/hooks/useTelegramBackButton'
```

Inside `HistoryPage`, add as the first line of the component body:

```typescript
useTelegramBackButton(true)
```

- [ ] **Step 4: Add `useTelegramBackButton` to `src/app/settings/page.tsx`**

Add the import at the top of the file:

```typescript
import { useTelegramBackButton } from '@/lib/telegram/hooks/useTelegramBackButton'
```

Inside `SettingsPage`, add as the first line of the component body:

```typescript
useTelegramBackButton(true)
```

- [ ] **Step 5: Run full test suite and type check**

```bash
npm test -- --run && npx tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telegram/hooks/useTelegramBackButton.ts \
        src/components/shells/BottomNav.tsx \
        src/app/history/page.tsx \
        src/app/settings/page.tsx
git commit -m "Add BackButton hook and BottomNav; wire to History and Settings pages"
```

---

### Task 11: TelegramShell (Full Implementation)

**Files:**
- Modify: `src/components/shells/TelegramShell.tsx` (replace stub from Task 9)

- [ ] **Step 1: Replace the stub with the full implementation**

```tsx
// src/components/shells/TelegramShell.tsx
'use client'
import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { applyTelegramTheme } from '@/lib/telegram/theme'
import { getSyncManager } from '@/lib/telegram/sync'
import { isTelegram } from '@/lib/telegram/context'

export function TelegramShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isTelegram()) return
    const tg = window.Telegram!.WebApp

    tg.ready()
    tg.expand()

    // Remove the default dark class; Telegram theme controls colors
    document.documentElement.classList.remove('dark')
    applyTelegramTheme(tg.themeParams)

    const handleThemeChange = () => applyTelegramTheme(tg.themeParams)
    tg.onEvent('themeChanged', handleThemeChange)

    // Pull on open if cloud is newer or local is empty
    const sync = getSyncManager()
    sync.shouldPullOnOpen().then((should) => {
      if (should) sync.pull().catch(() => {})
    })

    // Push when app goes to background
    const handleVisibility = () => {
      if (document.hidden) sync.schedulePush(0)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      tg.offEvent('themeChanged', handleThemeChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        paddingTop: 'var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        // Bottom padding = BottomNav height (3.5rem) + safe area
        paddingBottom:
          'calc(3.5rem + var(--tg-content-safe-area-inset-bottom, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite and type check**

```bash
npm test -- --run && npx tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shells/TelegramShell.tsx
git commit -m "Implement TelegramShell with init, theming, BackButton context, and sync-on-open"
```

---

### Task 12: Sync Hooks + UI + useReadings Sync Triggers

**Files:**
- Create: `src/features/sync/hooks/useSync.ts`
- Create: `src/features/sync/components/SyncStatus.tsx`
- Create: `src/features/sync/components/SyncSettings.tsx`
- Modify: `src/features/readings/hooks/useReadings.ts`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create `src/features/sync/hooks/useSync.ts`**

```typescript
// src/features/sync/hooks/useSync.ts
'use client'
import { useState, useCallback, useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTelegram()) return
    setLastSyncAt(getSyncManager().lastSyncAt)
  }, [])

  const sync = useCallback(async () => {
    if (!isTelegram()) return
    const manager = getSyncManager()
    setIsSyncing(true)
    setError(null)
    try {
      await manager.pull()
      await manager.push()
      setLastSyncAt(manager.lastSyncAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { isSyncing, lastSyncAt, error, sync, isAvailable: isTelegram() }
}
```

- [ ] **Step 2: Create `src/features/sync/components/SyncStatus.tsx`**

```tsx
// src/features/sync/components/SyncStatus.tsx
'use client'
import { Button } from '@/components/ui/button'
import { useSync } from '../hooks/useSync'

export function SyncStatus() {
  const { isSyncing, lastSyncAt, error, sync, isAvailable } = useSync()
  if (!isAvailable) return null

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never'

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">
        {error ? (
          <span className="text-destructive">Sync failed: {error}</span>
        ) : isSyncing ? (
          <span className="text-muted-foreground">Syncing…</span>
        ) : (
          <span className="text-muted-foreground">Last synced: {lastSyncLabel}</span>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={sync} disabled={isSyncing}>
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/features/sync/components/SyncSettings.tsx`**

```tsx
// src/features/sync/components/SyncSettings.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SyncStatus } from './SyncStatus'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function SyncSettings() {
  const [clearing, setClearing] = useState(false)

  if (!isTelegram()) return null

  async function handleClear() {
    if (
      !confirm(
        'This removes your data from Telegram Cloud Storage. Your local data is not affected. Continue?',
      )
    )
      return
    setClearing(true)
    try {
      await getSyncManager().clearCloudData()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-3">
      <SyncStatus />
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={handleClear}
        disabled={clearing}
      >
        {clearing ? 'Clearing…' : 'Clear cloud data'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Modify `src/features/readings/hooks/useReadings.ts` — add sync triggers**

Add this import at the top:

```typescript
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'
```

In `addReading`, add sync scheduling after the `setReadings` call:

```typescript
// After: setReadings((prev) => [...prev, reading].sort(...))
if (isTelegram()) getSyncManager().schedulePush(30_000)
```

In `deleteReading`, add tombstone + sync scheduling after `setReadings`:

```typescript
// After: setReadings((prev) => prev.filter(...))
if (isTelegram()) {
  await getSyncManager().addTombstone(id)
  getSyncManager().schedulePush(5_000)
}
```

- [ ] **Step 5: Add `SyncSettings` section to `src/app/settings/page.tsx`**

Add the import:

```typescript
import { SyncSettings } from '@/features/sync/components/SyncSettings'
```

Add a new section just before the `<Separator />` that precedes Danger Zone:

```tsx
{/* Find the last <Separator /> before DangerZone and add this section before it */}
<Separator />

<section>
  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
    Telegram Sync
  </h2>
  <SyncSettings />
</section>
```

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/sync/hooks/useSync.ts \
        src/features/sync/components/SyncStatus.tsx \
        src/features/sync/components/SyncSettings.tsx \
        src/features/readings/hooks/useReadings.ts \
        src/app/settings/page.tsx
git commit -m "Add sync hooks and UI; trigger cloud sync after reading add/delete"
```

---

### Task 13: DangerZone + KeyMissingError + Haptics Integration

**Files:**
- Modify: `src/features/settings/components/DangerZone.tsx`
- Modify: `src/components/KeyMissingError.tsx`
- Modify: `src/features/readings/components/ReadingForm.tsx`
- Modify: `src/features/readings/components/ReadingCard.tsx`

- [ ] **Step 1: Update `src/features/settings/components/DangerZone.tsx`**

Replace the file:

```tsx
// src/features/settings/components/DangerZone.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function DangerZone() {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete ALL readings and settings permanently? This cannot be undone.')) return
    setBusy(true)
    await dbClearAllData()
    if (isTelegram()) {
      await getSyncManager().clearCloudData()
    } else {
      localStorage.removeItem('bp_enc_key')
    }
    window.location.reload()
  }

  return (
    <div className="rounded-xl border border-destructive/30 p-4">
      <h3 className="mb-1 font-medium text-destructive">Danger Zone</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Permanently delete all readings and settings. This cannot be undone.
      </p>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete all data'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/components/KeyMissingError.tsx`**

Replace the file:

```tsx
// src/components/KeyMissingError.tsx
'use client'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'
import { isTelegram } from '@/lib/telegram/context'
import { getSyncManager } from '@/lib/telegram/sync'

export function KeyMissingError() {
  async function handleReset() {
    if (!confirm('This will delete all local data. Are you sure?')) return
    await dbClearAllData()
    if (isTelegram()) {
      await getSyncManager().clearCloudData()
    } else {
      localStorage.clear()
    }
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Encryption key missing</h1>
      <p className="max-w-sm text-muted-foreground">
        Your encryption key was cleared. Existing data cannot be decrypted. You can reset to
        start fresh.
      </p>
      <Button variant="destructive" onClick={handleReset}>
        Reset all data
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Add haptic to save in `src/features/readings/components/ReadingForm.tsx`**

Add the import at the top:

```typescript
import { haptic } from '@/lib/telegram/haptics'
```

In `handleSave`, add `haptic('success')` immediately after the `await onSave(...)` call:

```typescript
await onSave({ ... })
haptic('success')
// reset
setSystolic('')
```

- [ ] **Step 4: Add haptic to delete in `src/features/readings/components/ReadingCard.tsx`**

Add the import at the top:

```typescript
import { haptic } from '@/lib/telegram/haptics'
```

In `handleDelete`, add `haptic('warning')` before calling `onDelete`:

```typescript
async function handleDelete() {
  if (!confirm('Delete this reading?')) return
  haptic('warning')
  setDeleting(true)
  await onDelete(reading.id)
}
```

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/components/DangerZone.tsx \
        src/components/KeyMissingError.tsx \
        src/features/readings/components/ReadingForm.tsx \
        src/features/readings/components/ReadingCard.tsx
git commit -m "Clear CloudStorage on data wipe; add haptic feedback on save and delete"
```

---

### Task 14: Standalone "Connect to Telegram" UI

**Files:**
- Create: `src/features/settings/components/TelegramConnect.tsx`
- Modify: `src/app/settings/page.tsx`

Shown only when running outside Telegram. Displays the Mini App deep link and prompts the user to export data before migrating.

- [ ] **Step 1: Create `src/features/settings/components/TelegramConnect.tsx`**

```tsx
// src/features/settings/components/TelegramConnect.tsx
'use client'
import { Button } from '@/components/ui/button'
import { isTelegram } from '@/lib/telegram/context'
import { exportToBpdata } from '@/features/backup/export'
import { useReadings } from '@/features/readings/hooks/useReadings'

const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME

export function TelegramConnect() {
  const { readings } = useReadings()

  // Hidden inside Telegram and when env vars are not configured
  if (isTelegram() || !botName || !appName) return null

  const miniAppUrl = `https://t.me/${botName}/${appName}`

  async function handleExport() {
    if (readings.length === 0) {
      alert('No readings to export.')
      return
    }
    await exportToBpdata(readings)
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">
        Open this app inside Telegram to get automatic cross-device sync. Your data syncs
        to Telegram Cloud Storage so every device stays up to date.
      </p>
      <a
        href={miniAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        Open in Telegram ↗
      </a>
      {readings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Already have data here? Export it first, then import it after opening in
            Telegram.
          </p>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            Export your data
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `TelegramConnect` to `src/app/settings/page.tsx`**

Add the import:

```typescript
import { TelegramConnect } from '@/features/settings/components/TelegramConnect'
```

Add a new section at the bottom of `<main>`, just before the final `<Separator />` and `DangerZone`:

```tsx
<Separator />

<section>
  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
    Use in Telegram
  </h2>
  <TelegramConnect />
</section>
```

- [ ] **Step 3: Run full test suite and type check**

```bash
npm test -- --run && npx tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/components/TelegramConnect.tsx src/app/settings/page.tsx
git commit -m "Add standalone Telegram connect section with deep link and data export"
```

---

### Task 15: Environment Variables + CI/CD

**Files:**
- Modify: `.env.local.example`
- Modify: `.github/workflows/ci-deploy.yml`

- [ ] **Step 1: Update `.env.local.example`**

Replace the entire file:

```bash
# Google Drive OAuth — get from Google Cloud Console → APIs & Services → Credentials
# Authorized JavaScript origins must include your deployment URL
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Telegram Mini App — get from @BotFather
# Bot username without the @ sign (e.g. "mybpbot")
NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_bot_username
# Mini App short name registered with /newapp in BotFather (e.g. "bptracker")
NEXT_PUBLIC_TELEGRAM_APP_NAME=your_app_name
```

- [ ] **Step 2: Update the deploy step in `.github/workflows/ci-deploy.yml`**

Find the `Build static export` step:

```yaml
      - name: Build static export
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
```

Replace with:

```yaml
      - name: Build static export
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.NEXT_PUBLIC_GOOGLE_CLIENT_ID }}
          NEXT_PUBLIC_TELEGRAM_BOT_NAME: ${{ secrets.NEXT_PUBLIC_TELEGRAM_BOT_NAME }}
          NEXT_PUBLIC_TELEGRAM_APP_NAME: ${{ secrets.NEXT_PUBLIC_TELEGRAM_APP_NAME }}
```

- [ ] **Step 3: Run full test suite and type check**

```bash
npm test -- --run && npx tsc --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add .env.local.example .github/workflows/ci-deploy.yml
git commit -m "Add Telegram bot name and app name env vars to example and CI pipeline"
```

---

## Post-Implementation Manual Setup

After all 15 tasks are complete, the developer must perform these one-time manual steps (no code involved):

```
1. Message @BotFather in Telegram → /newbot
   → Choose a display name (e.g. "Blood Pressure Tracker")
   → Choose a username ending in "bot" (e.g. "mybpbot")
   → Save the token (not needed in app, can discard)

2. @BotFather → /mybots → select bot → Bot Settings → Menu Button
   → Set URL to your GitHub Pages URL
     e.g. https://username.github.io/blood-pressure/

3. @BotFather → /mybots → select bot → Bot Settings → Configure Mini App → /newapp
   → Set short name (this is NEXT_PUBLIC_TELEGRAM_APP_NAME, e.g. "bptracker")
   → Set URL to same GitHub Pages URL
   → Upload an icon (optional)

4. In GitHub repository: Settings → Secrets and variables → Actions
   → Add NEXT_PUBLIC_TELEGRAM_BOT_NAME = your_bot_username (without @)
   → Add NEXT_PUBLIC_TELEGRAM_APP_NAME = your_app_name
   → (NEXT_PUBLIC_GOOGLE_CLIENT_ID already exists if Google Drive was configured)

5. In GitHub repository: Settings → Pages → Source → GitHub Actions
   (if not already enabled from the original deployment setup)
```
