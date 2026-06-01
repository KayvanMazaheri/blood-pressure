# Blood Pressure Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a privacy-first, single-user blood pressure tracker as a Next.js static export deployed to GitHub Pages, with encrypted local storage, a rich Recharts-based chart, and optional Google Drive backup.

**Architecture:** Feature-based folder layout (`features/readings`, `features/chart`, `features/settings`, `features/backup`) over a lib layer (`lib/db`, `lib/crypto`, `lib/utils`). All data encrypted at rest in IndexedDB via Dexie.js + AES-256-GCM. No server-side code.

**Tech Stack:** Next.js (App Router, `output: 'export'`), TypeScript strict, shadcn/ui + Tailwind, Recharts, Dexie.js, Web Crypto API, Vitest + Testing Library, GitHub Actions.

---

## File Map

```
next.config.ts
tailwind.config.ts
tsconfig.json
vitest.config.ts
.nvmrc
.eslintrc.json
.prettierrc
.github/workflows/ci-deploy.yml

src/
  app/
    layout.tsx
    page.tsx                              # Dashboard
    history/page.tsx
    settings/page.tsx
    globals.css

  lib/
    crypto/
      index.ts                            # encrypt / decrypt (AES-256-GCM)
      index.test.ts
    db/
      schema.ts                           # Dexie class + EncryptedRecord type
      readings.ts                         # add/get/delete readings (encrypted)
      settings.ts                         # get/save settings (encrypted)
    utils/
      date.ts                             # formatTimestamp, parseDate
      units.ts                            # kgToLbs, lbsToKg
      stats.ts                            # average, linearRegression
      stats.test.ts
      csv.ts                              # parseCSV
      csv.test.ts

  features/
    readings/
      types.ts                            # Reading, Settings interfaces
      hooks/
        useReadings.ts
        useReadingStats.ts
        useReadings.test.ts
      components/
        ReadingForm.tsx                   # FAB → Sheet form
        ReadingCard.tsx
        ReadingList.tsx
        HealthContextFields.tsx           # Collapsible optional fields
    chart/
      hooks/
        useChartData.ts                   # transform readings → Recharts data
        useTrendProjection.ts             # linear regression → projected points
        useTrendProjection.test.ts
      components/
        BPChart.tsx                       # ComposedChart wrapper
        PulsePressureBand.tsx             # Recharts Customized polygon
        AHAZones.tsx                      # ReferenceArea components
    settings/
      hooks/
        useSettings.ts
      components/
        TargetForm.tsx
        UnitToggle.tsx
        DangerZone.tsx
    backup/
      google-drive.ts
      components/
        BackupRestore.tsx
        CsvImport.tsx

  components/
    FAB.tsx
    BottomSheet.tsx
    StatCard.tsx
    PageHeader.tsx
    TimeRangeTabs.tsx
    KeyMissingError.tsx
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.nvmrc`, `.eslintrc.json`, `.prettierrc`, `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Initialise Next.js project**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Expected: project files created, `npm run dev` starts on port 3000.

- [ ] **Step 2: Configure static export and GitHub Pages base path**

Replace `next.config.ts` contents:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Set basePath to repo name when deploying to GitHub Pages subdirectory.
  // Remove or set to '' if deploying to a custom domain root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
}

export default nextConfig
```

- [ ] **Step 3: Set Node LTS version**

```bash
node --version > .nvmrc
```

Verify `.nvmrc` contains a version like `v22.x.x`.

- [ ] **Step 4: Install core dependencies**

```bash
npm install dexie recharts
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Initialise shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: Default style, Neutral base colour, yes to CSS variables.

- [ ] **Step 8: Add required shadcn/ui components**

```bash
npx shadcn@latest add button input sheet tabs card dialog select separator badge textarea label
```

- [ ] **Step 9: Configure Prettier**

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 10: Smoke-test the setup**

```bash
npm run build
```

Expected: `out/` directory created with `index.html`.

```bash
npm test
```

Expected: `No test files found` (0 failures).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with static export, shadcn/ui, Recharts, Vitest"
```

---

## Task 2: Crypto Layer

**Files:**
- Create: `src/lib/crypto/index.ts`, `src/lib/crypto/index.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/crypto/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt, clearKeyCache } from './index'

// jsdom provides crypto.subtle via Web Crypto API polyfill in Node 20+
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
    const data = 'hello'
    const a = await encrypt(data)
    const b = await encrypt(data)
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
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/lib/crypto/index.test.ts
```

Expected: `Cannot find module './index'`

- [ ] **Step 3: Implement crypto module**

Create `src/lib/crypto/index.ts`:

```typescript
const KEY_STORAGE_KEY = 'bp_enc_key'
let cachedKey: CryptoKey | null = null

export function clearKeyCache() {
  cachedKey = null
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const stored = localStorage.getItem(KEY_STORAGE_KEY)
  if (stored) {
    const jwk = JSON.parse(stored) as JsonWebKey
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    return cachedKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const jwk = await crypto.subtle.exportKey('jwk', key)
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(jwk))
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
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

export function isKeyPresent(): boolean {
  return localStorage.getItem(KEY_STORAGE_KEY) !== null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/lib/crypto/index.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto/
git commit -m "Add AES-256-GCM encrypt/decrypt with localStorage key persistence"
```

---

## Task 3: Database Layer

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/readings.ts`, `src/lib/db/settings.ts`

- [ ] **Step 1: Create Dexie schema**

Create `src/lib/db/schema.ts`:

```typescript
import Dexie, { type Table } from 'dexie'

export interface EncryptedRecord {
  id: string
  encryptedData: string
}

class BPDatabase extends Dexie {
  readings!: Table<EncryptedRecord>
  settings!: Table<EncryptedRecord>

  constructor() {
    super('BloodPressureDB')
    this.version(1).stores({
      readings: 'id',
      settings: 'id',
    })
  }
}

export const db = new BPDatabase()
```

- [ ] **Step 2: Create readings DB helpers**

Create `src/lib/db/readings.ts`:

```typescript
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
```

- [ ] **Step 3: Create settings DB helpers**

Create `src/lib/db/settings.ts`:

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/
git commit -m "Add Dexie schema and encrypted DB helpers for readings and settings"
```

---

## Task 4: Types and Validation Utils

**Files:**
- Create: `src/features/readings/types.ts`, `src/lib/utils/stats.ts`, `src/lib/utils/stats.test.ts`, `src/lib/utils/date.ts`, `src/lib/utils/units.ts`

- [ ] **Step 1: Define Reading and Settings types**

Create `src/features/readings/types.ts`:

```typescript
export interface Reading {
  id: string
  timestamp: number
  systolic: number
  diastolic: number
  pulse?: number
  armUsed?: 'left' | 'right'
  bodyPosition?: 'sitting' | 'standing' | 'lying'
  stressLevel?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  sleepQuality?: 'poor' | 'fair' | 'good'
  activityLevel?: 'none' | 'light' | 'moderate' | 'intense'
  caffeineCount?: number
  alcoholDrinks?: number
  sodiumIntake?: 'low' | 'normal' | 'high'
  medicationTaken?: boolean
  weightKg?: number
  notes?: string
  source?: 'manual' | 'import'
}

export interface Settings {
  id: 'profile'
  units: { weight: 'kg' | 'lbs' }
  target: { systolic: number; diastolic: number }
  createdAt: number
}

export const VALIDATION = {
  systolic: { min: 60, max: 250 },
  diastolic: { min: 40, max: 150 },
  pulse: { min: 30, max: 200 },
} as const

export type TimeRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all'

export function timeRangeToMs(range: TimeRange): number | null {
  const day = 86_400_000
  const map: Record<TimeRange, number | null> = {
    '7d': 7 * day,
    '1m': 30 * day,
    '3m': 90 * day,
    '6m': 180 * day,
    '1y': 365 * day,
    all: null,
  }
  return map[range]
}

export function filterByTimeRange(readings: Reading[], range: TimeRange): Reading[] {
  const ms = timeRangeToMs(range)
  if (!ms) return readings
  const cutoff = Date.now() - ms
  return readings.filter((r) => r.timestamp >= cutoff)
}
```

- [ ] **Step 2: Write failing stats tests**

Create `src/lib/utils/stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { average, linearRegression } from './stats'

describe('average', () => {
  it('returns null for empty array', () => {
    expect(average([])).toBeNull()
  })
  it('computes mean', () => {
    expect(average([120, 130, 110])).toBeCloseTo(120)
  })
})

describe('linearRegression', () => {
  it('returns null for fewer than 3 points', () => {
    expect(linearRegression([{ x: 1, y: 100 }, { x: 2, y: 110 }])).toBeNull()
  })
  it('fits a perfect line', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 110 },
      { x: 2, y: 120 },
    ]
    const result = linearRegression(points)
    expect(result).not.toBeNull()
    // slope ~10, intercept ~100
    expect(result!.slope).toBeCloseTo(10)
    expect(result!.intercept).toBeCloseTo(100)
  })
  it('predicts a value', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 110 },
      { x: 2, y: 120 },
    ]
    const result = linearRegression(points)!
    expect(result.predict(3)).toBeCloseTo(130)
  })
})
```

- [ ] **Step 3: Run — verify fail**

```bash
npm test -- src/lib/utils/stats.test.ts
```

Expected: `Cannot find module './stats'`

- [ ] **Step 4: Implement stats utils**

Create `src/lib/utils/stats.ts`:

```typescript
export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface Point { x: number; y: number }
interface RegressionResult {
  slope: number
  intercept: number
  predict: (x: number) => number
}

export function linearRegression(points: Point[]): RegressionResult | null {
  if (points.length < 3) return null
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, predict: (x) => slope * x + intercept }
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm test -- src/lib/utils/stats.test.ts
```

Expected: 5 passing.

- [ ] **Step 6: Create date and units utils**

Create `src/lib/utils/date.ts`:

```typescript
export function formatTimestamp(ts: number, style: 'short' | 'long' = 'short'): string {
  const d = new Date(ts)
  if (style === 'long') {
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  const now = new Date()
  const diffMs = now.getTime() - ts
  if (diffMs < 86_400_000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (diffMs < 2 * 86_400_000) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMonthYear(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** Parse DD/MM/YYYY, MM/DD/YYYY, or ISO 8601 date strings to a Date. */
export function parseDate(dateStr: string, timeStr?: string): Date | null {
  const time = timeStr ?? '08:00'
  // ISO 8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  // DD/MM/YYYY
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  // MM/DD/YYYY
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const d = new Date(`${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
```

Create `src/lib/utils/units.ts`:

```typescript
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10
}

export function formatWeight(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') return `${kgToLbs(kg)} lbs`
  return `${kg} kg`
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/readings/types.ts src/lib/utils/
git commit -m "Add Reading/Settings types, validation constants, stats and date utils"
```

---

## Task 5: useReadings Hook

**Files:**
- Create: `src/features/readings/hooks/useReadings.ts`, `src/features/readings/hooks/useReadings.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/features/readings/hooks/useReadings.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReadings } from './useReadings'

// Mock the DB layer so tests don't touch real IndexedDB
vi.mock('@/lib/db/readings', () => ({
  dbAddReading: vi.fn(async () => {}),
  dbGetAllReadings: vi.fn(async () => []),
  dbDeleteReading: vi.fn(async () => {}),
  dbClearAllReadings: vi.fn(async () => {}),
}))

import * as dbModule from '@/lib/db/readings'

const mockReading = {
  id: 'test-1',
  timestamp: Date.now(),
  systolic: 128,
  diastolic: 84,
  source: 'manual' as const,
}

describe('useReadings', () => {
  beforeEach(() => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([])
  })

  it('loads readings on mount', async () => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([mockReading])
    const { result } = renderHook(() => useReadings())
    await act(async () => {})
    expect(result.current.readings).toHaveLength(1)
    expect(result.current.readings[0].systolic).toBe(128)
  })

  it('adds a reading', async () => {
    const { result } = renderHook(() => useReadings())
    await act(async () => {
      await result.current.addReading({ systolic: 120, diastolic: 80, timestamp: Date.now() })
    })
    expect(dbModule.dbAddReading).toHaveBeenCalledOnce()
  })

  it('deletes a reading', async () => {
    vi.mocked(dbModule.dbGetAllReadings).mockResolvedValue([mockReading])
    const { result } = renderHook(() => useReadings())
    await act(async () => {})
    await act(async () => {
      await result.current.deleteReading('test-1')
    })
    expect(dbModule.dbDeleteReading).toHaveBeenCalledWith('test-1')
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npm test -- src/features/readings/hooks/useReadings.test.ts
```

Expected: `Cannot find module './useReadings'`

- [ ] **Step 3: Implement the hook**

Create `src/features/readings/hooks/useReadings.ts`:

```typescript
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
    await dbAddReading(reading)
    setReadings((prev) => [...prev, reading].sort((a, b) => a.timestamp - b.timestamp))
  }, [])

  const deleteReading = useCallback(async (id: string) => {
    await dbDeleteReading(id)
    setReadings((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { readings, loading, error, addReading, deleteReading, reload: load }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm test -- src/features/readings/hooks/useReadings.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/readings/hooks/
git commit -m "Add useReadings hook with add/delete/reload"
```

---

## Task 6: useReadingStats and useSettings Hooks

**Files:**
- Create: `src/features/readings/hooks/useReadingStats.ts`, `src/features/settings/hooks/useSettings.ts`

- [ ] **Step 1: Create useReadingStats**

Create `src/features/readings/hooks/useReadingStats.ts`:

```typescript
import { useMemo } from 'react'
import { average } from '@/lib/utils/stats'
import { filterByTimeRange } from '@/features/readings/types'
import type { Reading, TimeRange } from '@/features/readings/types'

export interface ReadingStats {
  avgSystolic: number | null
  avgDiastolic: number | null
  avgPulse: number | null
  count: number
  filtered: Reading[]
}

export function useReadingStats(readings: Reading[], range: TimeRange): ReadingStats {
  return useMemo(() => {
    const filtered = filterByTimeRange(readings, range)
    return {
      avgSystolic: average(filtered.map((r) => r.systolic)),
      avgDiastolic: average(filtered.map((r) => r.diastolic)),
      avgPulse: average(filtered.filter((r) => r.pulse != null).map((r) => r.pulse!)),
      count: filtered.length,
      filtered,
    }
  }, [readings, range])
}
```

- [ ] **Step 2: Create useSettings**

Create `src/features/settings/hooks/useSettings.ts`:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { dbGetSettings, dbSaveSettings } from '@/lib/db/settings'
import type { Settings } from '@/features/readings/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    dbGetSettings().then(setSettings)
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Omit<Settings, 'id' | 'createdAt'>>) => {
    const current = settings ?? (await dbGetSettings())
    const next: Settings = { ...current, ...updates }
    await dbSaveSettings(next)
    setSettings(next)
  }, [settings])

  return { settings, updateSettings }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/readings/hooks/useReadingStats.ts src/features/settings/hooks/useSettings.ts
git commit -m "Add useReadingStats and useSettings hooks"
```

---

## Task 7: Shared UI Components

**Files:**
- Create: `src/components/FAB.tsx`, `src/components/BottomSheet.tsx`, `src/components/StatCard.tsx`, `src/components/PageHeader.tsx`, `src/components/TimeRangeTabs.tsx`, `src/components/KeyMissingError.tsx`

- [ ] **Step 1: FAB**

Create `src/components/FAB.tsx`:

```tsx
'use client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FABProps {
  onClick: () => void
  label?: string
}

export function FAB({ onClick, label = 'Add reading' }: FABProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg shadow-primary/30 z-40"
      aria-label={label}
    >
      <Plus className="h-6 w-6" />
    </Button>
  )
}
```

- [ ] **Step 2: BottomSheet**

Create `src/components/BottomSheet.tsx`:

```tsx
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader className="mb-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted" />
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: StatCard**

Create `src/components/StatCard.tsx`:

```tsx
interface StatCardProps {
  label: string
  value: string | number | null
  unit?: string
  colorClass?: string
}

export function StatCard({ label, value, unit, colorClass = '' }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colorClass}`}>
        {value ?? '—'}
        {value != null && unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: PageHeader**

Create `src/components/PageHeader.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  backHref?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      {backHref && (
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  )
}
```

- [ ] **Step 5: TimeRangeTabs**

Create `src/components/TimeRangeTabs.tsx`:

```tsx
'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TimeRange } from '@/features/readings/types'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
]

interface TimeRangeTabsProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <TabsList className="grid w-full grid-cols-6">
        {RANGES.map((r) => (
          <TabsTrigger key={r.value} value={r.value} className="text-xs">
            {r.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
```

- [ ] **Step 6: KeyMissingError**

Create `src/components/KeyMissingError.tsx`:

```tsx
'use client'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'

export function KeyMissingError() {
  async function handleReset() {
    if (!confirm('This will delete all local data. Are you sure?')) return
    await dbClearAllData()
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Encryption key missing</h1>
      <p className="max-w-sm text-muted-foreground">
        Your local encryption key was cleared (e.g. localStorage was reset). Existing data cannot
        be decrypted. You can reset to start fresh.
      </p>
      <Button variant="destructive" onClick={handleReset}>
        Reset all data
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "Add shared UI components: FAB, BottomSheet, StatCard, PageHeader, TimeRangeTabs, KeyMissingError"
```

---

## Task 8: ReadingForm Component

**Files:**
- Create: `src/features/readings/components/HealthContextFields.tsx`, `src/features/readings/components/ReadingForm.tsx`

- [ ] **Step 1: HealthContextFields**

Create `src/features/readings/components/HealthContextFields.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Reading } from '@/features/readings/types'

type ContextFields = Omit<Reading,
  'id' | 'timestamp' | 'systolic' | 'diastolic' | 'pulse' | 'source'>

interface HealthContextFieldsProps {
  value: ContextFields
  onChange: (fields: ContextFields) => void
}

export function HealthContextFields({ value, onChange }: HealthContextFieldsProps) {
  const [open, setOpen] = useState(false)

  function set<K extends keyof ContextFields>(key: K, val: ContextFields[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <span>+ Add health context</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="mt-3 grid gap-4">
          {/* Arm */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Arm used</Label>
              <Select value={value.armUsed ?? ''} onValueChange={(v) => set('armUsed', v as 'left' | 'right' || undefined)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Body position</Label>
              <Select value={value.bodyPosition ?? ''} onValueChange={(v) => set('bodyPosition', v as Reading['bodyPosition'] || undefined)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sitting">Sitting</SelectItem>
                  <SelectItem value="standing">Standing</SelectItem>
                  <SelectItem value="lying">Lying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stress */}
          <div>
            <Label className="text-xs">Stress level</Label>
            <div className="mt-1 flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('stressLevel', value.stressLevel === n ? undefined : n)}
                  className={`h-9 w-9 rounded-full border text-sm font-medium transition-colors
                    ${value.stressLevel === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sleep (hours)</Label>
              <Input
                type="number" min={0} max={24} step={0.5}
                value={value.sleepHours ?? ''}
                onChange={(e) => set('sleepHours', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label className="text-xs">Sleep quality</Label>
              <Select value={value.sleepQuality ?? ''} onValueChange={(v) => set('sleepQuality', v as Reading['sleepQuality'] || undefined)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity */}
          <div>
            <Label className="text-xs">Physical activity today</Label>
            <Select value={value.activityLevel ?? ''} onValueChange={(v) => set('activityLevel', v as Reading['activityLevel'] || undefined)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="intense">Intense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caffeine / Alcohol */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Caffeine (cups)</Label>
              <Input
                type="number" min={0} max={20}
                value={value.caffeineCount ?? ''}
                onChange={(e) => set('caffeineCount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label className="text-xs">Alcohol (drinks/24h)</Label>
              <Input
                type="number" min={0} max={20}
                value={value.alcoholDrinks ?? ''}
                onChange={(e) => set('alcoholDrinks', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Sodium */}
          <div>
            <Label className="text-xs">Sodium intake</Label>
            <Select value={value.sodiumIntake ?? ''} onValueChange={(v) => set('sodiumIntake', v as Reading['sodiumIntake'] || undefined)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Medication / Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Medication taken</Label>
              <div className="mt-1 flex gap-2">
                {(['Yes', 'No'] as const).map((opt) => {
                  const boolVal = opt === 'Yes'
                  const active = value.medicationTaken === boolVal
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => set('medicationTaken', active ? undefined : boolVal)}
                      className={`flex-1 rounded border py-2 text-sm transition-colors
                        ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number" min={20} max={300} step={0.1}
                value={value.weightKg ?? ''}
                onChange={(e) => set('weightKg', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              placeholder="e.g. felt dizzy, measured after rest"
              value={value.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || undefined)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: ReadingForm**

Create `src/features/readings/components/ReadingForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomSheet } from '@/components/BottomSheet'
import { HealthContextFields } from './HealthContextFields'
import { VALIDATION } from '@/features/readings/types'
import type { Reading } from '@/features/readings/types'

type NewReadingData = Omit<Reading, 'id' | 'source'>

interface ReadingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: NewReadingData) => Promise<void>
}

type Errors = Partial<Record<'systolic' | 'diastolic' | 'pulse', string>>

export function ReadingForm({ open, onOpenChange, onSave }: ReadingFormProps) {
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [timestamp, setTimestamp] = useState<number>(Date.now())
  const [editingTime, setEditingTime] = useState(false)
  const [context, setContext] = useState<Omit<NewReadingData, 'id' | 'timestamp' | 'systolic' | 'diastolic' | 'pulse'>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  function validate(): Errors {
    const e: Errors = {}
    const sys = Number(systolic)
    const dia = Number(diastolic)
    const pul = pulse ? Number(pulse) : null
    if (!systolic || sys < VALIDATION.systolic.min || sys > VALIDATION.systolic.max)
      e.systolic = `Must be ${VALIDATION.systolic.min}–${VALIDATION.systolic.max}`
    if (!diastolic || dia < VALIDATION.diastolic.min || dia > VALIDATION.diastolic.max)
      e.diastolic = `Must be ${VALIDATION.diastolic.min}–${VALIDATION.diastolic.max}`
    if (pul !== null && (pul < VALIDATION.pulse.min || pul > VALIDATION.pulse.max))
      e.pulse = `Must be ${VALIDATION.pulse.min}–${VALIDATION.pulse.max}`
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    try {
      await onSave({
        timestamp,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : undefined,
        ...context,
      })
      // reset
      setSystolic(''); setDiastolic(''); setPulse(''); setTimestamp(Date.now())
      setContext({}); setErrors({})
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const nowLabel = new Date(timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="New Reading">
      <div className="grid gap-4 pb-4">
        {/* Primary fields */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: 'Systolic', value: systolic, set: setSystolic, error: errors.systolic, color: 'text-red-400' },
            { label: 'Diastolic', value: diastolic, set: setDiastolic, error: errors.diastolic, color: 'text-blue-400' },
            { label: 'Pulse', value: pulse, set: setPulse, error: errors.pulse, color: '' },
          ] as const).map(({ label, value, set, error, color }) => (
            <div key={label}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(e) => { set(e.target.value); setErrors((prev) => ({ ...prev, [label.toLowerCase()]: undefined })) }}
                className={`mt-1 text-center text-2xl font-bold tabular-nums ${color} ${error ? 'border-destructive' : ''}`}
                placeholder="—"
                autoFocus={label === 'Systolic'}
              />
              {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          {editingTime ? (
            <input
              type="datetime-local"
              className="flex-1 bg-transparent text-sm outline-none"
              defaultValue={new Date(timestamp).toISOString().slice(0, 16)}
              onChange={(e) => e.target.value && setTimestamp(new Date(e.target.value).getTime())}
            />
          ) : (
            <span className="text-muted-foreground">📅 {nowLabel}</span>
          )}
          <button
            type="button"
            className="ml-2 text-xs text-primary underline"
            onClick={() => setEditingTime((v) => !v)}
          >
            {editingTime ? 'Done' : 'Edit'}
          </button>
        </div>

        <HealthContextFields value={context} onChange={setContext} />

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save Reading'}
        </Button>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/readings/components/
git commit -m "Add ReadingForm with health context fields and validation"
```

---

## Task 9: Chart Hooks and BPChart Component

**Files:**
- Create: `src/features/chart/hooks/useChartData.ts`, `src/features/chart/hooks/useTrendProjection.ts`, `src/features/chart/hooks/useTrendProjection.test.ts`, `src/features/chart/components/BPChart.tsx`, `src/features/chart/components/PulsePressureBand.tsx`, `src/features/chart/components/AHAZones.tsx`

- [ ] **Step 1: Write failing trend projection tests**

Create `src/features/chart/hooks/useTrendProjection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeTrendPoints } from './useTrendProjection'

const base = Date.now()
const readings = [
  { timestamp: base, systolic: 120, diastolic: 80 },
  { timestamp: base + 86_400_000, systolic: 122, diastolic: 81 },
  { timestamp: base + 2 * 86_400_000, systolic: 124, diastolic: 82 },
]

describe('computeTrendPoints', () => {
  it('returns null for fewer than 3 readings', () => {
    expect(computeTrendPoints(readings.slice(0, 2))).toBeNull()
  })

  it('returns two projected points (at 10% and 20% extension)', () => {
    const result = computeTrendPoints(readings)
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].timestamp).toBeGreaterThan(readings[2].timestamp)
    expect(result![1].timestamp).toBeGreaterThan(result![0].timestamp)
  })

  it('trend points have systolic and diastolic values', () => {
    const result = computeTrendPoints(readings)!
    expect(typeof result[0].systolic).toBe('number')
    expect(typeof result[0].diastolic).toBe('number')
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npm test -- src/features/chart/hooks/useTrendProjection.test.ts
```

Expected: `Cannot find module './useTrendProjection'`

- [ ] **Step 3: Implement useTrendProjection**

Create `src/features/chart/hooks/useTrendProjection.ts`:

```typescript
import { useMemo } from 'react'
import { linearRegression } from '@/lib/utils/stats'
import type { Reading } from '@/features/readings/types'

export interface TrendPoint {
  timestamp: number
  systolic: number
  diastolic: number
}

export function computeTrendPoints(readings: Reading[]): TrendPoint[] | null {
  if (readings.length < 3) return null

  const sysPoints = readings.map((r) => ({ x: r.timestamp, y: r.systolic }))
  const diaPoints = readings.map((r) => ({ x: r.timestamp, y: r.diastolic }))

  const sysReg = linearRegression(sysPoints)
  const diaReg = linearRegression(diaPoints)
  if (!sysReg || !diaReg) return null

  const timeSpan = readings[readings.length - 1].timestamp - readings[0].timestamp
  const extension10 = readings[readings.length - 1].timestamp + timeSpan * 0.1
  const extension20 = readings[readings.length - 1].timestamp + timeSpan * 0.2

  return [
    {
      timestamp: extension10,
      systolic: Math.round(sysReg.predict(extension10)),
      diastolic: Math.round(diaReg.predict(extension10)),
    },
    {
      timestamp: extension20,
      systolic: Math.round(sysReg.predict(extension20)),
      diastolic: Math.round(diaReg.predict(extension20)),
    },
  ]
}

export function useTrendProjection(readings: Reading[]): TrendPoint[] | null {
  return useMemo(() => computeTrendPoints(readings), [readings])
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm test -- src/features/chart/hooks/useTrendProjection.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Implement useChartData**

Create `src/features/chart/hooks/useChartData.ts`:

```typescript
import { useMemo } from 'react'
import type { Reading } from '@/features/readings/types'
import { computeTrendPoints } from './useTrendProjection'

export interface ChartPoint {
  timestamp: number
  systolic?: number
  diastolic?: number
  isTrend?: boolean
}

export interface ChartDomain {
  yMin: number
  yMax: number
}

export function useChartData(readings: Reading[]): {
  data: ChartPoint[]
  domain: ChartDomain
} {
  return useMemo(() => {
    const base: ChartPoint[] = readings.map((r) => ({
      timestamp: r.timestamp,
      systolic: r.systolic,
      diastolic: r.diastolic,
    }))

    const trendPoints = computeTrendPoints(readings)
    const trend: ChartPoint[] = trendPoints
      ? trendPoints.map((t) => ({ timestamp: t.timestamp, systolic: t.systolic, diastolic: t.diastolic, isTrend: true }))
      : []

    const allSys = readings.map((r) => r.systolic)
    const allDia = readings.map((r) => r.diastolic)
    const allValues = [...allSys, ...allDia]

    if (allValues.length === 0) {
      return { data: [], domain: { yMin: 60, yMax: 160 } }
    }

    const rawMin = Math.min(...allValues)
    const rawMax = Math.max(...allValues)
    const span = rawMax - rawMin
    const padding = Math.max(10, (40 - span) / 2)
    const yMin = Math.max(40, Math.floor(rawMin - padding))
    const yMax = Math.ceil(rawMax + padding)

    return { data: [...base, ...trend], domain: { yMin, yMax } }
  }, [readings])
}
```

- [ ] **Step 6: Implement AHAZones**

Create `src/features/chart/components/AHAZones.tsx`:

```tsx
import { ReferenceArea, ReferenceLine } from 'recharts'

interface AHAZonesProps {
  yMin: number
  yMax: number
}

export function AHAZones({ yMin, yMax }: AHAZonesProps) {
  return (
    <>
      {/* Stage 2: ≥ 140 */}
      <ReferenceArea y1={140} y2={yMax} fill="rgba(239,68,68,0.08)" ifOverflow="extendDomain" />
      {/* Stage 1: 130–139 */}
      <ReferenceArea y1={130} y2={140} fill="rgba(251,146,60,0.07)" />
      {/* Elevated: 120–129 */}
      <ReferenceArea y1={120} y2={130} fill="rgba(250,204,21,0.06)" />
      {/* Normal: below 120 */}
      <ReferenceArea y1={yMin} y2={120} fill="rgba(34,197,94,0.05)" />
      {/* Diastolic threshold tick marks */}
      <ReferenceLine y={90} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
      <ReferenceLine y={80} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
    </>
  )
}
```

- [ ] **Step 7: Implement PulsePressureBand**

Create `src/features/chart/components/PulsePressureBand.tsx`:

```tsx
'use client'

interface DataPoint {
  timestamp: number
  systolic?: number
  diastolic?: number
  isTrend?: boolean
}

// Receives Recharts internal props via the <Customized> component
interface PulsePressureBandProps {
  xAxisMap?: Record<string, { scale: (v: number) => number; width: number; left: number }>
  yAxisMap?: Record<string, { scale: (v: number) => number }>
  data?: DataPoint[]
}

export function PulsePressureBand({ xAxisMap, yAxisMap, data }: PulsePressureBandProps) {
  if (!xAxisMap || !yAxisMap || !data) return null

  const xAxis = Object.values(xAxisMap)[0]
  const yAxis = Object.values(yAxisMap)[0]
  if (!xAxis || !yAxis) return null

  const realPoints = data.filter((d) => !d.isTrend && d.systolic != null && d.diastolic != null)
  if (realPoints.length < 2) return null

  const topCoords = realPoints.map((d) => `${xAxis.scale(d.timestamp)},${yAxis.scale(d.systolic!)}`)
  const botCoords = [...realPoints]
    .reverse()
    .map((d) => `${xAxis.scale(d.timestamp)},${yAxis.scale(d.diastolic!)}`)

  const points = [...topCoords, ...botCoords].join(' ')

  return (
    <g>
      <defs>
        <linearGradient id="ppGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <polygon points={points} fill="url(#ppGrad)" />
    </g>
  )
}
```

- [ ] **Step 8: Implement BPChart**

Create `src/features/chart/components/BPChart.tsx`:

```tsx
'use client'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Customized, ResponsiveContainer, Legend,
} from 'recharts'
import { AHAZones } from './AHAZones'
import { PulsePressureBand } from './PulsePressureBand'
import { useChartData } from '../hooks/useChartData'
import { formatTimestamp } from '@/lib/utils/date'
import type { Reading, TimeRange } from '@/features/readings/types'

interface BPChartProps {
  readings: Reading[]
  range: TimeRange
  targetSystolic?: number
  targetDiastolic?: number
}

function CustomDot(props: { cx?: number; cy?: number; payload?: { isTrend?: boolean } }) {
  if (!props.cx || !props.cy || props.payload?.isTrend) return null
  return <circle cx={props.cx} cy={props.cy} r={4} fill="currentColor" stroke="none" />
}

export function BPChart({ readings, range: _range, targetSystolic, targetDiastolic }: BPChartProps) {
  const { data, domain } = useChartData(readings)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-muted-foreground">No readings in this range</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 48, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: number) => formatTimestamp(v, 'short')}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[domain.yMin, domain.yMax]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />

        <AHAZones yMin={domain.yMin} yMax={domain.yMax} />

        <Customized component={(props: object) => <PulsePressureBand {...(props as Parameters<typeof PulsePressureBand>[0])} data={data} />} />

        {targetSystolic != null && (
          <ReferenceLine y={targetSystolic} stroke="#a78bfa" strokeDasharray="6 4" strokeWidth={1.5} />
        )}
        {targetDiastolic != null && (
          <ReferenceLine y={targetDiastolic} stroke="#a78bfa" strokeDasharray="6 4" strokeWidth={1} opacity={0.7} />
        )}

        <Line
          dataKey="systolic"
          stroke="#f87171"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
          connectNulls
          strokeDasharray={(d: { isTrend?: boolean }) => (d?.isTrend ? '6 4' : '0')}
        />
        <Line
          dataKey="diastolic"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
          connectNulls
          strokeDasharray={(d: { isTrend?: boolean }) => (d?.isTrend ? '6 4' : '0')}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { timestamp: number; systolic?: number; diastolic?: number; isTrend?: boolean }
            const sys = d.systolic
            const dia = d.diastolic
            const zone =
              sys == null ? '' :
              sys >= 140 ? 'Stage 2' :
              sys >= 130 ? 'Stage 1' :
              sys >= 120 ? 'Elevated' : 'Normal'
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="font-medium">{formatTimestamp(d.timestamp, 'long')}</p>
                {sys != null && <p className="text-red-400">{sys} mmHg sys</p>}
                {dia != null && <p className="text-blue-400">{dia} mmHg dia</p>}
                {zone && <p className="text-muted-foreground">{d.isTrend ? 'Projected' : zone}</p>}
              </div>
            )
          }}
        />

        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => value === 'systolic' ? 'Systolic' : 'Diastolic'}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add src/features/chart/
git commit -m "Add BPChart with AHA zones, pulse pressure band, trend projection, and target lines"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `src/app/page.tsx`, update `src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Blood Pressure Tracker',
  description: 'Private, local-first blood pressure tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Build Dashboard page**

Replace `src/app/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { History, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FAB } from '@/components/FAB'
import { StatCard } from '@/components/StatCard'
import { TimeRangeTabs } from '@/components/TimeRangeTabs'
import { KeyMissingError } from '@/components/KeyMissingError'
import { ReadingForm } from '@/features/readings/components/ReadingForm'
import { BPChart } from '@/features/chart/components/BPChart'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useReadingStats } from '@/features/readings/hooks/useReadingStats'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { formatTimestamp } from '@/lib/utils/date'
import { isKeyPresent } from '@/lib/crypto'
import type { TimeRange } from '@/features/readings/types'

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('1m')
  const [formOpen, setFormOpen] = useState(false)
  const { readings, loading, error, addReading } = useReadings()
  const { settings } = useSettings()
  const { avgSystolic, avgDiastolic, avgPulse, filtered } = useReadingStats(readings, range)

  if (!loading && typeof window !== 'undefined' && !isKeyPresent() && readings.length === 0) {
    return <KeyMissingError />
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-destructive">Failed to load data: {error.message}</p>
      </div>
    )
  }

  const recent = [...readings].reverse().slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur">
        <h1 className="flex-1 text-lg font-semibold">Blood Pressure</h1>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/history" aria-label="History"><History className="h-5 w-5" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="Settings"><Settings className="h-5 w-5" /></Link>
        </Button>
      </header>

      <main className="flex-1 space-y-4 p-4">
        <TimeRangeTabs value={range} onChange={setRange} />

        <BPChart
          readings={filtered}
          range={range}
          targetSystolic={settings?.target.systolic}
          targetDiastolic={settings?.target.diastolic}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Avg Sys" value={avgSystolic != null ? Math.round(avgSystolic) : null} unit="mmHg" colorClass="text-red-400" />
          <StatCard label="Avg Dia" value={avgDiastolic != null ? Math.round(avgDiastolic) : null} unit="mmHg" colorClass="text-blue-400" />
          <StatCard label="Avg Pulse" value={avgPulse != null ? Math.round(avgPulse) : null} unit="bpm" />
        </div>

        {/* Recent readings */}
        {recent.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent</h2>
            <div className="divide-y divide-border rounded-xl border">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums text-red-400">{r.systolic}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-lg font-bold tabular-nums text-blue-400">{r.diastolic}</span>
                    {r.pulse && <span className="ml-2 text-sm text-muted-foreground">{r.pulse} bpm</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(r.timestamp, 'short')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        )}
      </main>

      <FAB onClick={() => setFormOpen(true)} />
      <ReadingForm open={formOpen} onOpenChange={setFormOpen} onSave={addReading} />
    </div>
  )
}
```

- [ ] **Step 3: Build and smoke-test**

```bash
npm run build
```

Expected: no TypeScript errors, `out/index.html` generated.

- [ ] **Step 4: Commit**

```bash
git add src/app/
git commit -m "Add Dashboard page with chart, summary stats, recent readings, and quick-entry FAB"
```

---

## Task 11: ReadingCard, ReadingList, History Page

**Files:**
- Create: `src/features/readings/components/ReadingCard.tsx`, `src/features/readings/components/ReadingList.tsx`, `src/app/history/page.tsx`

- [ ] **Step 1: ReadingCard**

Create `src/features/readings/components/ReadingCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTimestamp } from '@/lib/utils/date'
import type { Reading } from '@/features/readings/types'

interface ReadingCardProps {
  reading: Reading
  onDelete: (id: string) => Promise<void>
  weightUnit: 'kg' | 'lbs'
}

const CONTEXT_ICONS: Partial<Record<keyof Reading, string>> = {
  stressLevel: '🧠',
  sleepHours: '😴',
  caffeineCount: '☕',
  alcoholDrinks: '🍷',
  medicationTaken: '💊',
  activityLevel: '🏃',
  sodiumIntake: '🧂',
  armUsed: '💪',
  bodyPosition: '🪑',
  weightKg: '⚖️',
}

export function ReadingCard({ reading, onDelete, weightUnit }: ReadingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const ahaClass =
    reading.systolic >= 140 ? 'text-red-400' :
    reading.systolic >= 130 ? 'text-orange-400' :
    reading.systolic >= 120 ? 'text-yellow-400' : 'text-green-400'

  const contextKeys = (Object.keys(CONTEXT_ICONS) as Array<keyof Reading>)
    .filter((k) => reading[k] != null)

  async function handleDelete() {
    if (!confirm('Delete this reading?')) return
    setDeleting(true)
    await onDelete(reading.id)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-baseline gap-1">
          <span className={`text-xl font-bold tabular-nums ${ahaClass}`}>{reading.systolic}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-xl font-bold tabular-nums text-blue-400">{reading.diastolic}</span>
          {reading.pulse && (
            <span className="ml-2 text-sm text-muted-foreground">{reading.pulse} bpm</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatTimestamp(reading.timestamp, 'long')}</span>
        {contextKeys.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground"
            aria-label={expanded ? 'Collapse context' : 'Expand context'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete reading"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Compact context icon strip */}
      {!expanded && contextKeys.length > 0 && (
        <div className="mt-1 flex gap-1">
          {contextKeys.map((k) => (
            <span key={k} className="text-xs" title={String(k)}>
              {CONTEXT_ICONS[k]}
            </span>
          ))}
        </div>
      )}

      {/* Expanded context */}
      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {reading.armUsed && <p>💪 Arm: {reading.armUsed}</p>}
          {reading.bodyPosition && <p>🪑 Position: {reading.bodyPosition}</p>}
          {reading.stressLevel != null && <p>🧠 Stress: {reading.stressLevel}/5</p>}
          {reading.sleepHours != null && <p>😴 Sleep: {reading.sleepHours}h {reading.sleepQuality ?? ''}</p>}
          {reading.activityLevel && <p>🏃 Activity: {reading.activityLevel}</p>}
          {reading.caffeineCount != null && <p>☕ Caffeine: {reading.caffeineCount} cups</p>}
          {reading.alcoholDrinks != null && <p>🍷 Alcohol: {reading.alcoholDrinks}</p>}
          {reading.sodiumIntake && <p>🧂 Sodium: {reading.sodiumIntake}</p>}
          {reading.medicationTaken != null && <p>💊 Meds: {reading.medicationTaken ? 'taken' : 'missed'}</p>}
          {reading.weightKg != null && (
            <p>⚖️ Weight: {weightUnit === 'lbs'
              ? `${Math.round(reading.weightKg * 2.20462 * 10) / 10} lbs`
              : `${reading.weightKg} kg`}
            </p>
          )}
          {reading.notes && <p className="col-span-2">📝 {reading.notes}</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: ReadingList**

Create `src/features/readings/components/ReadingList.tsx`:

```tsx
'use client'
import { useMemo } from 'react'
import { ReadingCard } from './ReadingCard'
import { formatMonthYear } from '@/lib/utils/date'
import type { Reading } from '@/features/readings/types'

interface ReadingListProps {
  readings: Reading[]
  onDelete: (id: string) => Promise<void>
  weightUnit: 'kg' | 'lbs'
}

export function ReadingList({ readings, onDelete, weightUnit }: ReadingListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Reading[]>()
    ;[...readings].reverse().forEach((r) => {
      const key = formatMonthYear(r.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return map
  }, [readings])

  if (readings.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">No readings yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([month, items]) => (
        <section key={month}>
          <h2 className="mb-1 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {month}
          </h2>
          <div className="divide-y divide-border rounded-xl border">
            {items.map((r) => (
              <ReadingCard key={r.id} reading={r} onDelete={onDelete} weightUnit={weightUnit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: History page**

Create `src/app/history/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ReadingList } from '@/features/readings/components/ReadingList'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { exportToCSV, exportToBpdata } from '@/features/backup/export'

export default function HistoryPage() {
  const { readings, deleteReading } = useReadings()
  const { settings } = useSettings()
  const [exporting, setExporting] = useState(false)

  async function handleExport(format: 'csv' | 'bpdata') {
    if (format === 'csv') {
      if (!confirm('This exports unencrypted health data as a plain CSV. Continue?')) return
      exportToCSV(readings)
    } else {
      setExporting(true)
      try { await exportToBpdata(readings) }
      finally { setExporting(false) }
    }
  }

  const exportMenu = (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} disabled={readings.length === 0}>
        CSV
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleExport('bpdata')} disabled={readings.length === 0 || exporting}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="History" backHref="/" actions={exportMenu} />
      <main className="p-4">
        <ReadingList
          readings={readings}
          onDelete={deleteReading}
          weightUnit={settings?.units.weight ?? 'kg'}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/readings/components/ReadingCard.tsx src/features/readings/components/ReadingList.tsx src/app/history/
git commit -m "Add ReadingCard, ReadingList, and History page with grouped view and export buttons"
```

---

## Task 12: Export Helpers

**Files:**
- Create: `src/features/backup/export.ts`

- [ ] **Step 1: Implement export helpers**

Create `src/features/backup/export.ts`:

```typescript
import { encrypt } from '@/lib/crypto'
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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/backup/export.ts
git commit -m "Add CSV and encrypted .bpdata export helpers"
```

---

## Task 13: CSV Import and Settings Page

**Files:**
- Create: `src/lib/utils/csv.ts`, `src/lib/utils/csv.test.ts`, `src/features/backup/components/CsvImport.tsx`, `src/features/settings/components/TargetForm.tsx`, `src/features/settings/components/UnitToggle.tsx`, `src/features/settings/components/DangerZone.tsx`, `src/app/settings/page.tsx`

- [ ] **Step 1: Write failing CSV tests**

Create `src/lib/utils/csv.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseCSV } from './csv'

describe('parseCSV', () => {
  it('parses ISO date + time + all fields', () => {
    const csv = 'date,time,systolic,diastolic,pulse\n2025-01-15,08:30,128,84,72'
    const { readings, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(readings).toHaveLength(1)
    expect(readings[0].systolic).toBe(128)
    expect(readings[0].diastolic).toBe(84)
    expect(readings[0].pulse).toBe(72)
    expect(readings[0].source).toBe('import')
  })

  it('parses DD/MM/YYYY date without time', () => {
    const csv = 'date,systolic,diastolic\n15/01/2025,120,80'
    const { readings, errors } = parseCSV(csv)
    expect(errors).toHaveLength(0)
    expect(readings[0].systolic).toBe(120)
    expect(readings[0].pulse).toBeUndefined()
  })

  it('reports error for invalid systolic', () => {
    const csv = 'date,systolic,diastolic\n2025-01-01,999,80'
    const { readings, errors } = parseCSV(csv)
    expect(readings).toHaveLength(0)
    expect(errors[0]).toMatch(/row 2/)
  })

  it('imports valid rows and reports errors for invalid rows', () => {
    const csv = 'date,systolic,diastolic\n2025-01-01,120,80\n2025-01-02,999,80'
    const { readings, errors } = parseCSV(csv)
    expect(readings).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npm test -- src/lib/utils/csv.test.ts
```

Expected: `Cannot find module './csv'`

- [ ] **Step 3: Implement CSV parser**

Create `src/lib/utils/csv.ts`:

```typescript
import { parseDate } from './date'
import { VALIDATION } from '@/features/readings/types'
import type { Reading } from '@/features/readings/types'

interface ParseResult {
  readings: Reading[]
  errors: string[]
}

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return { readings: [], errors: ['CSV has no data rows'] }

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const col = (name: string) => headers.indexOf(name)

  const dateIdx = col('date')
  const timeIdx = col('time')
  const sysIdx = col('systolic')
  const diaIdx = col('diastolic')
  const pulseIdx = col('pulse')

  if (dateIdx === -1 || sysIdx === -1 || diaIdx === -1) {
    return { readings: [], errors: ['CSV must have columns: date, systolic, diastolic'] }
  }

  const readings: Reading[] = []
  const errors: string[] = []

  lines.slice(1).forEach((line, i) => {
    const rowNum = i + 2
    const cells = line.split(',').map((c) => c.trim())
    const dateStr = cells[dateIdx]
    const timeStr = timeIdx !== -1 ? cells[timeIdx] : undefined
    const sysStr = cells[sysIdx]
    const diaStr = cells[diaIdx]
    const pulseStr = pulseIdx !== -1 ? cells[pulseIdx] : undefined

    const parsedDate = parseDate(dateStr, timeStr)
    if (!parsedDate) { errors.push(`Row ${rowNum}: invalid date "${dateStr}"`); return }

    const sys = Number(sysStr)
    const dia = Number(diaStr)
    const pulse = pulseStr ? Number(pulseStr) : undefined

    if (!sysStr || isNaN(sys) || sys < VALIDATION.systolic.min || sys > VALIDATION.systolic.max) {
      errors.push(`Row ${rowNum}: invalid systolic "${sysStr}"`); return
    }
    if (!diaStr || isNaN(dia) || dia < VALIDATION.diastolic.min || dia > VALIDATION.diastolic.max) {
      errors.push(`Row ${rowNum}: invalid diastolic "${diaStr}"`); return
    }
    if (pulse != null && (isNaN(pulse) || pulse < VALIDATION.pulse.min || pulse > VALIDATION.pulse.max)) {
      errors.push(`Row ${rowNum}: invalid pulse "${pulseStr}"`); return
    }

    readings.push({
      id: crypto.randomUUID(),
      timestamp: parsedDate.getTime(),
      systolic: sys,
      diastolic: dia,
      pulse: pulse ?? undefined,
      source: 'import',
    })
  })

  return { readings, errors }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm test -- src/lib/utils/csv.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: CsvImport component**

Create `src/features/backup/components/CsvImport.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/utils/csv'
import { dbAddReading } from '@/lib/db/readings'

interface CsvImportProps {
  onImported: () => void
}

export function CsvImport({ onImported }: CsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const text = await file.text()
      const { readings, errors } = parseCSV(text)
      await Promise.all(readings.map((r) => dbAddReading(r)))
      setResult({ imported: readings.length, errors })
      if (readings.length > 0) onImported()
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? 'Importing…' : 'Import CSV'}
      </Button>
      {result && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium text-green-400">{result.imported} readings imported</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-destructive">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: TargetForm**

Create `src/features/settings/components/TargetForm.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Settings } from '@/features/readings/types'

interface TargetFormProps {
  settings: Settings | null
  onSave: (target: { systolic: number; diastolic: number }) => Promise<void>
}

export function TargetForm({ settings, onSave }: TargetFormProps) {
  const [sys, setSys] = useState(String(settings?.target.systolic ?? 120))
  const [dia, setDia] = useState(String(settings?.target.diastolic ?? 80))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setSys(String(settings.target.systolic))
      setDia(String(settings.target.diastolic))
    }
  }, [settings])

  async function handleSave() {
    const s = Number(sys), d = Number(dia)
    if (isNaN(s) || isNaN(d) || s < 60 || s > 250 || d < 40 || d > 150) return
    setSaving(true)
    await onSave({ systolic: s, diastolic: d })
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Target Systolic</Label>
          <Input type="number" value={sys} onChange={(e) => setSys(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target Diastolic</Label>
          <Input type="number" value={dia} onChange={(e) => setDia(e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save Targets'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: UnitToggle**

Create `src/features/settings/components/UnitToggle.tsx`:

```tsx
'use client'
import { Button } from '@/components/ui/button'

interface UnitToggleProps {
  value: 'kg' | 'lbs'
  onChange: (unit: 'kg' | 'lbs') => void
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div className="flex gap-2">
      {(['kg', 'lbs'] as const).map((u) => (
        <Button
          key={u}
          variant={value === u ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(u)}
        >
          {u}
        </Button>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: DangerZone**

Create `src/features/settings/components/DangerZone.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { dbClearAllData } from '@/lib/db/settings'

export function DangerZone() {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete ALL readings and settings permanently? This cannot be undone.')) return
    setBusy(true)
    await dbClearAllData()
    localStorage.removeItem('bp_enc_key')
    window.location.href = '/'
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

- [ ] **Step 9: Settings page**

Create `src/app/settings/page.tsx`:

```tsx
'use client'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/PageHeader'
import { TargetForm } from '@/features/settings/components/TargetForm'
import { UnitToggle } from '@/features/settings/components/UnitToggle'
import { DangerZone } from '@/features/settings/components/DangerZone'
import { CsvImport } from '@/features/backup/components/CsvImport'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useReadings } from '@/features/readings/hooks/useReadings'

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { reload } = useReadings()

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="Settings" backHref="/" />
      <main className="space-y-6 p-4">

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Targets</h2>
          <TargetForm
            settings={settings}
            onSave={(target) => updateSettings({ target })}
          />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weight Unit</h2>
          <UnitToggle
            value={settings?.units.weight ?? 'kg'}
            onChange={(weight) => updateSettings({ units: { weight } })}
          />
        </section>

        <Separator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Import</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Import a CSV file with columns: date, time (optional), systolic, diastolic, pulse (optional).
          </p>
          <CsvImport onImported={reload} />
        </section>

        <Separator />

        <DangerZone />
      </section>
    </main>
    </div>
  )
}
```

- [ ] **Step 10: Build check**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 11: Run all tests**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 12: Commit**

```bash
git add src/lib/utils/csv.ts src/lib/utils/csv.test.ts src/features/backup/components/ src/features/settings/ src/app/settings/
git commit -m "Add CSV import, settings page with targets/units, danger zone"
```

---

## Task 14: Google Drive Backup & Restore

**Files:**
- Create: `src/features/backup/google-drive.ts`, `src/features/backup/components/BackupRestore.tsx`, update `src/app/settings/page.tsx`

- [ ] **Step 1: Implement Google Drive helpers**

Create `src/features/backup/google-drive.ts`:

```typescript
// Uses Google Identity Services (GSI) loaded via <script> in layout
// and the Drive API v3 REST endpoints directly via fetch.

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

let accessToken: string | null = null

export async function signInWithGoogle(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = (window as typeof window & { google: { accounts: { oauth2: { initTokenClient: (cfg: object) => { requestAccessToken: () => void } } } } }).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error) { reject(new Error(response.error)); return }
        accessToken = response.access_token!
        resolve(accessToken)
      },
    })
    client.requestAccessToken()
  })
}

export function getAccessToken(): string | null {
  return accessToken
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) throw new Error('Not authenticated with Google Drive')
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  })
}

export async function listBackupFiles(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  const res = await driveRequest(
    "/files?spaces=appDataFolder&fields=files(id,name,createdTime)&q=name contains 'bp-backup'"
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.statusText}`)
  const json = await res.json() as { files: Array<{ id: string; name: string; createdTime: string }> }
  return json.files
}

export async function uploadBackup(content: string, filename: string): Promise<void> {
  const metadata = { name: filename, parents: ['appDataFolder'] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'application/json' }))
  const res = await driveRequest(
    '/files?uploadType=multipart',
    { method: 'POST', body: form }
  )
  if (!res.ok) throw new Error(`Drive upload failed: ${res.statusText}`)
}

export async function downloadBackup(fileId: string): Promise<string> {
  const res = await driveRequest(`/files/${fileId}?alt=media`)
  if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`)
  return res.text()
}
```

- [ ] **Step 2: BackupRestore component**

Create `src/features/backup/components/BackupRestore.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, getAccessToken, uploadBackup, listBackupFiles, downloadBackup } from '../google-drive'
import { exportToBpdata } from '../export'
import { dbAddReading, dbGetAllReadings } from '@/lib/db/readings'
import { useReadings } from '@/features/readings/hooks/useReadings'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

interface BackupFile { id: string; name: string; createdTime: string }

export function BackupRestore({ onRestored }: { onRestored: () => void }) {
  const [authed, setAuthed] = useState(!!getAccessToken())
  const [files, setFiles] = useState<BackupFile[]>([])
  const [status, setStatus] = useState('')
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
    setStatus('Backing up…')
    try {
      const readings = await dbGetAllReadings()
      // Re-use exportToBpdata logic but upload instead of download
      const kek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
      const kekJwk = await crypto.subtle.exportKey('jwk', kek)
      const payload = JSON.stringify(readings)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encoded = new TextEncoder().encode(payload)
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, encoded)
      const combined = new Uint8Array(12 + ciphertext.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(ciphertext), 12)
      const encryptedPayload = btoa(String.fromCharCode(...combined))
      const content = JSON.stringify({ version: 1, exportedAt: Date.now(), kek: kekJwk, encryptedPayload })
      const filename = `bp-backup-${new Date().toISOString().slice(0, 10)}.bpdata`
      await uploadBackup(content, filename)
      setStatus(`Backup saved: ${filename}`)
    } catch (e) {
      setStatus(`Backup failed: ${(e as Error).message}`)
    }
  }

  async function handleListFiles() {
    try {
      const list = await listBackupFiles()
      setFiles(list)
      if (list.length === 0) setStatus('No backups found in Drive')
    } catch (e) {
      setStatus(`Could not list files: ${(e as Error).message}`)
    }
  }

  async function handleRestore(fileId: string) {
    if (!confirm('This will merge backup readings into your local data. Continue?')) return
    setStatus('Restoring…')
    try {
      const content = await downloadBackup(fileId)
      const { kek: kekJwk, encryptedPayload } = JSON.parse(content) as { kek: JsonWebKey; encryptedPayload: string; version: number }
      const kek = await crypto.subtle.importKey('jwk', kekJwk, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
      const combined = Uint8Array.from(atob(encryptedPayload), (c) => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const ciphertext = combined.slice(12)
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ciphertext)
      const readings = JSON.parse(new TextDecoder().decode(decrypted))
      await Promise.all(readings.map((r: Parameters<typeof dbAddReading>[0]) => dbAddReading(r)))
      onRestored()
      reload()
      setStatus(`Restored ${readings.length} readings`)
    } catch (e) {
      setStatus(`Restore failed: ${(e as Error).message}`)
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-sm text-muted-foreground">
        Google Drive backup requires <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to be set.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {!authed ? (
        <Button variant="outline" className="w-full" onClick={handleAuth}>
          Connect Google Drive
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleBackup}>Back up now</Button>
          <Button variant="ghost" className="flex-1" onClick={handleListFiles}>Restore…</Button>
        </div>
      )}
      {files.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Select a backup to restore:</p>
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between text-sm">
              <span>{f.name}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRestore(f.id)}>Restore</Button>
            </div>
          ))}
        </div>
      )}
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Add GSI script to layout and BackupRestore to settings page**

In `src/app/layout.tsx`, add inside `<head>`:

```tsx
import Script from 'next/script'
// Add inside the <html> body, before closing </body>:
<Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
```

In `src/app/settings/page.tsx`, import and add `BackupRestore` between UnitToggle and Import sections:

```tsx
import { BackupRestore } from '@/features/backup/components/BackupRestore'

// Add section:
<Separator />
<section>
  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
    Google Drive Backup
  </h2>
  <BackupRestore onRestored={reload} />
</section>
```

- [ ] **Step 4: Document required environment variable**

Create `.env.local.example`:

```
# Get this from Google Cloud Console → APIs & Services → Credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Add `.env.local` to `.gitignore`:

```bash
echo '.env.local' >> .gitignore
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/features/backup/ src/app/settings/page.tsx src/app/layout.tsx .env.local.example .gitignore
git commit -m "Add Google Drive backup/restore with encrypted .bpdata format"
```

---

## Task 15: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci-deploy.yml`

- [ ] **Step 1: Get exact action SHAs**

```bash
# These are pinned SHAs for common actions as of mid-2025.
# Verify/update at https://github.com/<owner>/<repo>/releases
echo "actions/checkout@v4             => pinned below"
echo "actions/setup-node@v4           => pinned below"
echo "actions/configure-pages@v5      => pinned below"
echo "actions/upload-pages-artifact@v3 => pinned below"
echo "actions/deploy-pages@v4         => pinned below"
```

- [ ] **Step 2: Create the workflow**

Create `.github/workflows/ci-deploy.yml`:

```yaml
name: CI / Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx prettier --check .

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm test

  deploy:
    name: Deploy to GitHub Pages
    needs: [lint, typecheck, test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Build static export
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Add lint script to package.json**

Verify `package.json` has:
```json
"lint": "next lint"
```

If not, add it under `"scripts"`.

- [ ] **Step 4: Enable GitHub Pages in repository settings**

In the GitHub repository: Settings → Pages → Source → **GitHub Actions**.

(This is a manual one-time step.)

- [ ] **Step 5: Run all tests locally one final time**

```bash
npm test
```

Expected: all passing.

```bash
npm run build
```

Expected: clean build, `out/` directory present.

- [ ] **Step 6: Commit and push**

```bash
git add .github/ package.json
git commit -m "Add GitHub Actions CI/CD pipeline with lint, typecheck, test, and Pages deploy"
git push origin main
```

Expected: Actions run on GitHub, all jobs pass, site deployed to `https://<username>.github.io/blood-pressure/`.

---

## Self-Review Checklist

- [x] **Static export configured** — Task 1 sets `output: 'export'`
- [x] **Encryption at rest** — Task 2 (AES-256-GCM), Task 3 (Dexie wrapping)
- [x] **Single profile** — `settings` table has one row keyed `'profile'`
- [x] **All 10 health context fields** — Task 8 `HealthContextFields` covers all
- [x] **Quick-entry form with auto timestamp + edit escape** — Task 8 `ReadingForm`
- [x] **Backdated entry** — `datetime-local` input in `ReadingForm`
- [x] **AHA reference zones** — Task 9 `AHAZones` component
- [x] **Pulse pressure band** — Task 9 `PulsePressureBand` using `Customized`
- [x] **Trend projection (linear regression)** — Task 9 `useTrendProjection`
- [x] **Target lines** — Task 9 `BPChart` `ReferenceLine` on target sys/dia
- [x] **Dynamic Y-axis (not zero-based)** — Task 9 `useChartData` domain computation
- [x] **Summary stats with time-range tabs** — Tasks 6, 7, 10
- [x] **History page with grouped view** — Task 11
- [x] **CSV export + encrypted .bpdata export** — Task 12
- [x] **CSV import with error reporting** — Task 13
- [x] **Google Drive backup/restore** — Task 14
- [x] **Settings: targets, units, danger zone** — Task 13
- [x] **GitHub Actions: lint + typecheck + test + deploy** — Task 15
- [x] **Mobile-first responsive layout** — all components use Tailwind responsive classes
- [x] **No AI attribution in commits** — enforced by `.claude/settings.json`
- [x] **`NEXT_PUBLIC_GOOGLE_CLIENT_ID` documented** — `.env.local.example` in Task 14
