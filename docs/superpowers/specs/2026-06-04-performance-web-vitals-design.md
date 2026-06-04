# Performance & Web Vitals Optimisation — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Overview

The current production build ships 1,468 KB of uncompressed JS. The single largest chunk (522 KB) bundles recharts and base-ui and is loaded eagerly on the dashboard, blocking first paint and main-thread responsiveness. This spec addresses every measurable web vitals axis: LCP (less JS to parse on first load), INP (smaller main-thread work per interaction), and CLS (proper viewport meta + fixed-height skeletons).

**Approach:** Approach B — dynamic imports with matching skeletons, plus head/metadata and cleanup.

---

## Section 1: Dynamic Imports

### Principle

Use `next/dynamic` with `ssr: false` to move heavy components off the critical-path bundle. Each lazy component gets a `loading` skeleton whose height matches the real component exactly, preventing layout shift when the chunk arrives.

### BPChart (dashboard page)

**File to change:** `src/app/page.tsx`

Replace the static import:
```tsx
import { BPChart } from '@/features/chart/components/BPChart'
```

With:
```tsx
import dynamic from 'next/dynamic'

const BPChart = dynamic(() => import('@/features/chart/components/BPChart').then(m => ({ default: m.BPChart })), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-muted motion-safe:animate-pulse" />,
})
```

The skeleton is 220px — exactly the chart's rendered height (`height={220}` in `ResponsiveContainer`) — so there is zero CLS when recharts loads.

**Impact:** Removes the 522 KB recharts + base-ui chunk from the initial dashboard bundle.

### ReadingForm (dashboard page)

**File to change:** `src/app/page.tsx`

Replace the static import:
```tsx
import { ReadingForm } from '@/features/readings/components/ReadingForm'
```

With:
```tsx
const ReadingForm = dynamic(() => import('@/features/readings/components/ReadingForm').then(m => ({ default: m.ReadingForm })), {
  ssr: false,
  loading: () => null,
})
```

`loading: () => null` because the form is always `open={false}` on initial render — it is never visible before user interaction, so no skeleton is needed and no CLS can occur.

### BackupRestore and CsvImport (settings page)

**File to change:** `src/app/settings/page.tsx`

Replace the static imports:
```tsx
import { CsvImport } from '@/features/backup/components/CsvImport'
import { BackupRestore } from '@/features/backup/components/BackupRestore'
```

With:
```tsx
const BackupRestore = dynamic(() => import('@/features/backup/components/BackupRestore').then(m => ({ default: m.BackupRestore })), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
})

const CsvImport = dynamic(() => import('@/features/backup/components/CsvImport').then(m => ({ default: m.CsvImport })), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted" />,
})
```

These components only load when the user explicitly opens the Settings page, so they have no effect on dashboard LCP regardless. The skeletons prevent CLS inside the settings page itself.

### No changes to component files

All lazy-loading is applied at the import sites (`page.tsx` files). The component implementations are unchanged.

---

## Section 2: Head / Metadata / Font / Cleanup

### Viewport metadata

**File to change:** `src/app/layout.tsx`

Currently `layout.tsx` has no `viewport` export. Missing this causes mobile browsers to use the historical default of 980px layout width before rescaling to the device width — a guaranteed CLS event on first paint.

Add as a separate named export (Next.js 15+ requires `viewport` to be separate from `metadata`):

```tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}
```

`themeColor` provides the status bar / browser chrome tint on both Android and Telegram PWA-style installs.

### Inter font display

**File to change:** `src/app/layout.tsx`

Make the `display: 'swap'` strategy explicit. `next/font/google` defaults to `swap` today, but being explicit prevents a silent regression if the Next.js default ever changes:

```tsx
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```

### Remove unused public assets

**Files to delete:** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

These are Next.js project template placeholders. None are referenced anywhere in the application source. They are copied verbatim into the `out/` static export on every deploy — pure dead weight with no runtime effect when removed.

---

## Files Changed

| File | Action | Reason |
|---|---|---|
| `src/app/page.tsx` | Modify | Lazy-load BPChart and ReadingForm |
| `src/app/settings/page.tsx` | Modify | Lazy-load BackupRestore and CsvImport |
| `src/app/layout.tsx` | Modify | Add viewport export, explicit Inter display |
| `public/file.svg` | Delete | Unused template asset |
| `public/globe.svg` | Delete | Unused template asset |
| `public/next.svg` | Delete | Unused template asset |
| `public/vercel.svg` | Delete | Unused template asset |
| `public/window.svg` | Delete | Unused template asset |

---

## Expected Outcomes

| Metric | Before | Expected After |
|---|---|---|
| Initial JS (dashboard) | ~1,468 KB | ~900 KB (−38%) |
| Recharts on critical path | Yes | No — loads after paint |
| Viewport CLS | Present | Eliminated |
| LCP | Blocked by 522 KB parse | Unblocked |
| INP | High (large JS parse) | Reduced |
| Unused public files | 5 SVGs | 0 |

---

## Out of Scope

- Web app manifest / service worker (Approach C, deferred)
- `preconnect` / `dns-prefetch` resource hints (Approach C, deferred)
- Image optimisation (no images in the app)
- Server-side rendering (app is static export by design)
