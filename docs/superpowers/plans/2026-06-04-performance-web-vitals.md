# Performance & Web Vitals Optimisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the dashboard initial JS by ~38% and eliminate CLS by lazy-loading heavy components, adding proper viewport metadata, and removing unused assets.

**Architecture:** Three `next/dynamic` calls move recharts (522 KB chunk), the reading form bottom sheet, and the backup components off the critical path. Fixed-height pulse skeletons prevent CLS during chunk loading. A `Viewport` named export in `layout.tsx` eliminates mobile rescaling shift.

**Tech Stack:** Next.js 16 `next/dynamic`, `next/font/google`, TypeScript strict, Vitest.

---

## File Map

| File | Action |
|---|---|
| `src/app/page.tsx` | Convert BPChart and ReadingForm to dynamic imports; fix chart skeleton height to 220px |
| `src/app/settings/page.tsx` | Convert BackupRestore and CsvImport to dynamic imports |
| `src/app/layout.tsx` | Add `Viewport` export; add explicit `display: 'swap'` to Inter |
| `public/file.svg` | Delete |
| `public/globe.svg` | Delete |
| `public/next.svg` | Delete |
| `public/vercel.svg` | Delete |
| `public/window.svg` | Delete |

---

## Task 1: Lazy-load BPChart and ReadingForm in the dashboard

**Files:**
- Modify: `src/app/page.tsx`

The dashboard currently imports BPChart and ReadingForm statically, pulling recharts (522 KB) and the bottom-sheet form into the initial bundle. BPChart is below the fold and benefits from a matching-height skeleton; ReadingForm is always hidden on load so its skeleton is `null`.

Also fix: the existing data-loading skeleton uses `h-48` (192 px) for the chart area, but the chart renders at 220 px. Change it to `h-[220px]` to match exactly.

- [ ] **Step 1: Replace the two static imports with dynamic imports**

In `src/app/page.tsx`, remove these two lines from the top import block:
```tsx
import { ReadingForm } from '@/features/readings/components/ReadingForm'
import { BPChart } from '@/features/chart/components/BPChart'
```

Add `dynamic` import from next, and two dynamic component declarations. Place them directly below the last `import type` line:
```tsx
import dynamic from 'next/dynamic'

const BPChart = dynamic(
  () => import('@/features/chart/components/BPChart').then((m) => ({ default: m.BPChart })),
  {
    ssr: false,
    loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-muted" />,
  }
)

const ReadingForm = dynamic(
  () =>
    import('@/features/readings/components/ReadingForm').then((m) => ({
      default: m.ReadingForm,
    })),
  { ssr: false, loading: () => null }
)
```

- [ ] **Step 2: Fix the data-loading skeleton chart height**

In `src/app/page.tsx`, find the data-loading skeleton block (around line 116 in the current file):
```tsx
<div className="h-48 animate-pulse rounded-xl bg-muted" />
```

Change it to:
```tsx
<div className="h-[220px] animate-pulse rounded-xl bg-muted" />
```

- [ ] **Step 3: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "Lazy-load BPChart and ReadingForm; fix chart skeleton height to 220px"
```

---

## Task 2: Lazy-load BackupRestore and CsvImport in settings

**Files:**
- Modify: `src/app/settings/page.tsx`

The settings page statically imports two heavy backup components. These pull in the Google Drive OAuth client and crypto utilities. Since Settings is never the first page a user sees, lazy-loading these has no dashboard LCP impact but reduces the settings page's own parse cost.

- [ ] **Step 1: Replace static imports with dynamic imports**

In `src/app/settings/page.tsx`, remove:
```tsx
import { CsvImport } from '@/features/backup/components/CsvImport'
import { BackupRestore } from '@/features/backup/components/BackupRestore'
```

Add after the existing import block (before the component function):
```tsx
import dynamic from 'next/dynamic'

const BackupRestore = dynamic(
  () =>
    import('@/features/backup/components/BackupRestore').then((m) => ({
      default: m.BackupRestore,
    })),
  {
    ssr: false,
    loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
  }
)

const CsvImport = dynamic(
  () =>
    import('@/features/backup/components/CsvImport').then((m) => ({ default: m.CsvImport })),
  {
    ssr: false,
    loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
  }
)
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "Lazy-load BackupRestore and CsvImport in settings page"
```

---

## Task 3: Add Viewport export and fix Inter font in layout

**Files:**
- Modify: `src/app/layout.tsx`

Two changes: (1) add a `Viewport` named export — Next.js 15+ requires this to be separate from `metadata`; missing it causes mobile browsers to use a 980px default width before rescaling, a guaranteed CLS event. (2) Add explicit `display: 'swap'` to the Inter font config — `next/font/google` defaults to this today, but being explicit prevents silent regression.

- [ ] **Step 1: Add Viewport import and export**

In `src/app/layout.tsx`, change the first import line from:
```tsx
import type { Metadata } from 'next'
```

To:
```tsx
import type { Metadata, Viewport } from 'next'
```

Then add the `viewport` export immediately after the `metadata` export:
```tsx
export const metadata: Metadata = {
  title: 'Blood Pressure Tracker',
  description: 'Private, local-first blood pressure tracking',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}
```

- [ ] **Step 2: Add explicit display: 'swap' to Inter**

Change:
```tsx
const inter = Inter({ subsets: ['latin'] })
```

To:
```tsx
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```

- [ ] **Step 3: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Add viewport metadata and explicit Inter display:swap"
```

---

## Task 4: Delete unused public assets

**Files:**
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

These are Next.js project template placeholders. None are referenced anywhere in the app source (`grep -r "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src/` returns nothing). They are copied into `out/` on every static export deploy.

- [ ] **Step 1: Confirm they are unreferenced**

```bash
grep -r "file\.svg\|globe\.svg\|next\.svg\|vercel\.svg\|window\.svg" /Users/kayvan/Workspace/GitHub/PersonalAccount/blood-pressure/src/
```

Expected: no output (zero matches)

- [ ] **Step 2: Delete the files**

```bash
rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass (no test references these files)

- [ ] **Step 4: Commit**

```bash
git add -u public/
git commit -m "Remove unused Next.js template SVGs from public/"
```

---

## Final verification

- [ ] **Run full CI gate**

```bash
npm test && npx tsc --noEmit && npm run lint && npx prettier --check .
```

Expected: all pass

- [ ] **Verify bundle improvement**

```bash
npm run build 2>&1 | tail -20
```

Then check the chunk sizes:

```bash
find .next/static/chunks -name "*.js" | xargs du -k | sort -rn | head -10
```

The chunk previously at 522 KB (containing recharts) should no longer appear in the top results for the initial load path. If using `@next/bundle-analyzer`, run `ANALYZE=true npm run build` to get a visual confirmation.

- [ ] **Push**

```bash
git push origin main
```
