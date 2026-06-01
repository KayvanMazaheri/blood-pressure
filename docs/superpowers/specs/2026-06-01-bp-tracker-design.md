# Blood Pressure Tracker — Design Spec

**Date:** 2026-06-01  
**Status:** Approved

---

## Overview

A privacy-first, single-user blood pressure tracking web app. Users record readings, view a richly annotated chart, and track trends over time. All health data is stored locally on the user's device — nothing is ever sent to a server. Optional Google Drive backup enables cross-device restore.

The app is a Next.js static export deployed to GitHub Pages.

---

## Core Requirements

- Record blood pressure readings (systolic, diastolic, pulse) with automatic timestamp
- Support backdated entry for importing historical measurements
- Visualise readings on a chart with AHA reference zones, trend projection, and a personal target line
- Show summary statistics (average systolic, diastolic, pulse) for selectable time periods
- All 10 optional health context fields available per reading (always skippable)
- Single user profile — no multi-account support
- Data encrypted at rest in IndexedDB
- Google Drive backup/restore (opt-in, user-initiated)
- CSV import for historical data
- Fully responsive, mobile-first
- Deployed via GitHub Actions to GitHub Pages

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (latest stable LTS), `output: 'export'` | Static export → GitHub Pages, no server needed |
| Language | TypeScript strict | Type safety; no `any` |
| UI | shadcn/ui + Tailwind CSS | Accessible components, consistent design tokens |
| Charts | Recharts | Declarative, React-native, good TypeScript support, sufficient SVG control for this use case |
| Local DB | Dexie.js (IndexedDB wrapper) | Clean async API, good TypeScript support |
| Encryption | Web Crypto API (AES-256-GCM) | Native browser, no dependency |
| Google Drive | Google Identity Services + Drive API v3 | `drive.appdata` scope for private app folder |
| Testing | Vitest + React Testing Library | Fast, ESM-native |
| CI/CD | GitHub Actions | Lint + typecheck + test + deploy pipeline |

---

## Project Structure

Feature-based folder layout. No feature imports another feature directly — cross-cutting state goes through page-level composition.

```
src/
  app/
    page.tsx                 # Dashboard (/)
    history/page.tsx         # Full reading history
    settings/page.tsx        # Settings, targets, backup
    layout.tsx               # Root layout (theme, portal anchor)

  features/
    readings/
      components/            # ReadingCard, ReadingForm, ReadingList
      hooks/                 # useReadings, useReadingStats
      types.ts               # Reading, HealthContext
    chart/
      components/            # BPChart, TrendLine, ReferenceZones, TargetLine
      hooks/                 # useChartData, useTrendProjection
    settings/
      components/            # TargetForm, BackupRestore, UnitToggle
      hooks/                 # useSettings
    backup/
      google-drive.ts        # OAuth flow + Drive API helpers

  lib/
    db/                      # Dexie schema and migrations
    crypto/                  # encrypt / decrypt helpers (AES-256-GCM)
    utils/                   # date formatting, unit conversion, CSV parser

  components/                # Shared UI: FAB, BottomSheet, StatCard, PageHeader
```

**Dependency direction:** `app/*` → `features/*` → `lib/*` → browser APIs. No reverse imports.

---

## Data Model

### `readings` table

```typescript
interface Reading {
  id: string               // crypto.randomUUID()
  timestamp: number        // Unix ms — auto-filled; editable for past entries
  systolic: number         // mmHg, 60–250
  diastolic: number        // mmHg, 40–150
  pulse?: number           // bpm, 30–200 — optional (not all monitors measure pulse)

  // Optional health context — all undefined if not provided
  armUsed?: 'left' | 'right'
  bodyPosition?: 'sitting' | 'standing' | 'lying'
  stressLevel?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  sleepQuality?: 'poor' | 'fair' | 'good'
  activityLevel?: 'none' | 'light' | 'moderate' | 'intense'
  caffeineCount?: number   // cups before reading
  alcoholDrinks?: number   // drinks in past 24 h
  sodiumIntake?: 'low' | 'normal' | 'high'
  medicationTaken?: boolean
  weightKg?: number        // stored in kg; displayed per user unit preference
  notes?: string

  source?: 'manual' | 'import'  // default 'manual'
}
```

### `settings` table (single row, key `"profile"`)

```typescript
interface Settings {
  id: 'profile'
  units: { weight: 'kg' | 'lbs' }
  target: {
    systolic: number       // personal goal, shown as dashed line on chart
    diastolic: number
  }
  createdAt: number
}
```

### Validation ranges (input guards only)

| Field | Min | Max | Required |
|---|---|---|---|
| systolic | 60 | 250 | yes |
| diastolic | 40 | 150 | yes |
| pulse | 30 | 200 | no |

Values outside these ranges are rejected at the form level with a clear error message.

---

## Pages & Navigation

### Dashboard `/`

- **Header:** app name left, History icon (📋) and Settings icon (⚙️) right
- **Time-range tabs:** 7d · 1m · 3m · 6m · 1y · All — switching re-renders chart and summary cards
- **BP Chart** (see Chart Design below)
- **Summary cards (3):** Avg Systolic · Avg Diastolic · Avg Pulse for the selected period
- **Recent readings list:** last 5 entries, showing `SYS/DIA · pulse · timestamp · health context icons`
- **FAB (floating action button):** fixed bottom-right, opens the quick-entry bottom sheet

### History `/history`

- Back button, Export button (top-right)
- Filter bar: date range picker + optional field filters (e.g. "only readings with stress ≥ 3")
- Readings grouped by month, each row showing: `SYS/DIA · pulse · timestamp · compact health context icons`
- Tap a row to expand full health context detail
- Export triggers a choice: encrypted `.bpdata` file or plain CSV (with privacy warning for CSV)

### Settings `/settings`

- **Targets:** set goal systolic and diastolic (appear as dashed lines on chart)
- **Units:** kg / lbs toggle for weight
- **Backup & Restore:** connect Google Drive, trigger backup, trigger restore from file
- **Import CSV:** upload a CSV file of historical readings
- **Data:** "Delete all data" (with confirmation)

---

## Chart Design

**Library:** Recharts (or Visx if finer SVG control is needed — decision deferred to implementation).

**Visual elements:**

| Element | Description |
|---|---|
| AHA reference zones | Four background bands keyed to the **systolic** Y-axis value: Normal (green, <120), Elevated (yellow, 120–129), Stage 1 (orange, 130–139), Stage 2 (red, ≥140). Diastolic thresholds (80, 90) are shown as faint horizontal tick marks on the same axis but do not define separate bands. Subtle opacity, labels on right edge. |
| Systolic line | Solid red (#f87171), with circular data point markers |
| Diastolic line | Solid blue (#60a5fa), with circular data point markers |
| Pulse pressure band | Semi-transparent gradient fill between systolic and diastolic lines (red→blue, ~25% opacity), communicating the spread at a glance |
| Trend projection | Dashed extension of systolic and diastolic lines beyond the last data point, calculated via linear regression on the visible window. Extends ~20% of the current time range forward. |
| Target lines | Dashed purple (#a78bfa) horizontal lines at the user's target systolic and diastolic. Only shown if targets are set. |

**Y-axis scale:**
- Does not start at zero
- Dynamic range: `[min(data) − 10, max(data) + 10]` with a minimum visible span of 40 mmHg
- Always includes enough range to show the relevant AHA zone boundaries

**X-axis:** Time axis, tick density adapts to the selected period (hours for 7d, days for 1m, weeks for 3m+).

**Tooltip on hover/tap:** Shows exact `SYS / DIA · pulse · timestamp` and the AHA classification for that reading.

**Trend projection algorithm:** Linear regression (least squares) on the readings within the current time window, projected forward. Computed separately for systolic and diastolic. Only shown if there are ≥ 3 data points in the window.

---

## Quick-Entry Form (FAB → Bottom Sheet)

Opened by tapping the FAB. Rendered as a `shadcn/ui` Sheet anchored to the bottom.

**Primary fields (always visible, large tap targets):**
- Systolic — numeric input, auto-focused on open
- Diastolic — numeric input
- Pulse — numeric input
- Date/time — auto-filled to "now"; an "Edit" link opens a datetime picker for backdated entry

**Health context (collapsed by default):**
- Tapping "+ Add health context" expands a scrollable section with all 10 optional fields
- Each field uses the appropriate control: toggle (arm, position, medication), 1–5 star tap (stress), stepper (sleep hours, caffeine, alcohol), segmented (sleep quality, activity, sodium), number input (weight), textarea (notes)

**Save:** Validates ranges, encrypts, writes to Dexie, closes sheet, dashboard refreshes.

---

## Storage & Encryption

### Encryption at rest

On first launch:
1. `crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])`
2. Export as JWK, store in `localStorage` under key `bp_enc_key`
3. All subsequent Dexie writes encrypt the record payload with a random 96-bit IV prepended to the ciphertext

On read: decrypt using the stored key. If the key is missing (e.g. localStorage cleared), data is inaccessible — the app shows a clear error and offers to wipe and start fresh.

### Google Drive backup

- Scope: `https://www.googleapis.com/auth/drive.appdata` (private app folder, not visible to user in Drive UI)
- Backup file: `bp-backup-{ISO date}.bpdata` — JSON containing:
  - `version` — schema version
  - `exportedAt` — timestamp
  - `kek` — a random 256-bit key-encryption key (stored in the file)
  - `encryptedPayload` — the local encryption key + all readings, encrypted with the KEK
- Restore: user picks a `.bpdata` file, app decrypts with embedded KEK, writes records to local IndexedDB
- The file is self-contained: no password needed to restore, but possession of the file is sufficient to decrypt the data

### CSV import

Accepted columns (case-insensitive, order flexible): `date`, `time`, `systolic`, `diastolic`, `pulse`.  
Accepted date formats: ISO 8601, DD/MM/YYYY, MM/DD/YYYY.  
`time` and `pulse` are optional — missing time defaults to 08:00, missing pulse is stored as `undefined`.  
Imported readings get `source: 'import'` and no health context fields.  
Parser surfaces per-row errors with row numbers; valid rows are imported even if some rows fail.

---

## CI/CD — GitHub Actions

```
on: push to main

jobs (parallel):
  lint       → eslint + prettier --check
  typecheck  → tsc --noEmit
  test       → vitest run

  deploy (needs: lint, typecheck, test):
    → next build  (static export → out/)
    → actions/deploy-pages  (deploy out/ to GitHub Pages)
```

- All action versions pinned to specific release tags
- Node version matrix: single LTS version (specified in `.nvmrc`)
- `npm ci` with `cache: 'npm'` on setup-node
- Deploy job has `permissions: { pages: write, id-token: write }` only
- No manual deploys — all production releases go through this pipeline

---

## Error Handling

- **Validation errors:** inline form field errors, blocking save
- **Encryption key missing:** full-screen error state with "Reset data" option
- **Google Drive auth failure:** toast notification, retry button
- **Google Drive API error:** toast notification with error detail
- **CSV parse errors:** shown in an import results modal (rows imported, rows failed, failure reasons)
- **IndexedDB unavailable:** full-screen error (rare; occurs in some private browsing modes) with explanation

---

## Out of Scope

The following are explicitly excluded from this version:

- Multiple user profiles
- Push notifications or reminders to measure
- Integration with wearables or Bluetooth BP monitors
- Sharing readings with a doctor or third party
- Server-side anything (no API routes, no SSR, no analytics)
- Native mobile app (web only)
