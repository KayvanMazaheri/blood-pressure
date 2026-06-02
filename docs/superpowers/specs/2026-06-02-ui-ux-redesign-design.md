# UI/UX Wellness Redesign — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Overview

A focused UI/UX upgrade targeting the two biggest daily pain points: reading the dashboard and entering a reading. The visual direction is **calm wellness + Telegram-native** — warm data presentation inside Telegram's familiar cell/section visual language. The web shell receives the same component improvements but keeps its existing layout chrome.

This spec covers the Telegram shell primarily; web shell changes are called out explicitly where they differ.

---

## Design Principles

- **Tell a story, not just numbers.** The dashboard should answer "how am I doing?" before the user reads a single data point.
- **Teach in context.** AHA classification feedback belongs at the moment of entry, not in a help screen.
- **Telegram-native feel.** Cells, section headers, left accent bars, and the MainButton — patterns users already know from Telegram itself.
- **Wellness palette.** Soft, non-alarming colors. Green/amber/orange/rose rather than clinical red/yellow/green.
- **Progressive disclosure.** Show the minimum needed; reveal detail on demand.

---

## AHA Classification Reference

Used throughout for color and label decisions.

| Classification | Systolic | Diastolic | Soft color | Label |
|---|---|---|---|---|
| Normal | < 120 | and < 80 | Emerald `#34d399` | NORMAL |
| Elevated | 120–129 | and < 80 | Amber `#fbbf24` | ELEVATED |
| Hypertension Stage 1 | 130–139 | or 80–89 | Orange `#f97316` | STAGE 1 |
| Hypertension Stage 2 | ≥ 140 | or ≥ 90 | Rose `#fb7185` | STAGE 2 |

Classification is determined by the higher of systolic and diastolic thresholds (i.e., if systolic is Stage 1 but diastolic is Stage 2, the reading is Stage 2).

---

## Section 1: Dashboard — Layout & Health Status Hero

### Layout order (Telegram shell)

1. Health Status Hero card
2. Time range tabs
3. Stat cards (3-column)
4. BP chart
5. Recent readings section
6. Telegram MainButton ("Add Reading")

The web shell keeps its current sticky header and FAB; the health status hero, stat card trends, and reading cell styles apply equally.

### Health Status Hero card

**Component:** `src/features/dashboard/components/HealthStatusHero.tsx`

A full-width rounded card placed at the top of the dashboard. Its background fill is a soft, low-opacity version of the AHA classification color (12% opacity fill, solid left border accent at full color).

**Content:**
- Large classification label in all-caps: `NORMAL` / `ELEVATED` / `HYPERTENSION · STAGE 1` / `HYPERTENSION · STAGE 2`
- One human-readable message line:
  - Normal → "Your pressure looks great"
  - Elevated → "Worth keeping an eye on"
  - Stage 1 → "Consider talking to your doctor"
  - Stage 2 → "Please consult your doctor"
- Small subtext: "Avg 118/76 · Based on last N readings" (N = count of readings in current time range)
- A small trend chip: "↑ Rising" / "↓ Improving" / "→ Stable" — comparing current period average to previous period of same length; colored muted-red for worsening, muted-green for improving, muted-foreground for stable
- Tapping the card navigates to `/history`

**When no readings exist:** The hero is not rendered — replaced by the empty state (see Section 5).

**When fewer than 2 periods of data exist:** Render hero without the trend chip.

### Stat cards with trend indicators

**Component:** `src/components/StatCard.tsx` (modified)

Each card gains:
- A trend indicator below the value: `↑ +3` / `↓ −2` / `→` in a small `text-xs` line
- Trend color logic:
  - Systolic / Diastolic: rising = `text-rose-400`, falling = `text-emerald-400`, stable = `text-muted-foreground`
  - Pulse: rising and falling both use `text-muted-foreground` (neutral — no clinical judgment)
- Stable threshold: ≤ 2 mmHg / bpm change → show `→` with no delta number
- Props added: `trend?: 'up' | 'down' | 'stable'`, `delta?: number`

---

## Section 2: Entry Form — Live AHA Badge

### AHA classification badge

**Component:** `src/features/readings/components/AHABadge.tsx`

A small pill-shaped badge that classifies a systolic/diastolic pair in real time.

```
● NORMAL               (emerald background, teal text)
● ELEVATED             (amber background, amber-dark text)
● HYPERTENSION · STAGE 1   (orange background, orange-dark text)
● HYPERTENSION · STAGE 2   (rose background, rose-dark text)
```

**Behaviour in ReadingForm:**
- Hidden when either systolic or diastolic field is empty or invalid
- Appears immediately when both fields contain a valid number within range
- Updates on every keystroke (derived entirely from current field values — no state beyond what already exists)
- Positioned between the three input fields and the timestamp row

### Health context section polish

The current collapsed block gains Telegram-cell styling:
- Full-width row: label on left, chevron icon on right, `min-h-[44px]` touch target
- Label when empty: "Add health context"
- Label when fields filled: "Health context · N fields" (where N = count of non-null context fields)
- Chevron rotates 180° when expanded (CSS transition)

### Telegram MainButton as submit

In Telegram context, the "Save Reading" button at the bottom of the sheet is replaced by wiring the Telegram `MainButton`:
- When the form sheet opens: `MainButton.setText('Save Reading')`, `MainButton.show()`
- When the form sheet closes: `MainButton.hide()`
- `MainButton.onClick` triggers the same `handleSave` function
- The in-sheet button is hidden in Telegram context (`isTelegram() && 'hidden'`)

In web context the existing Save button is unchanged.

---

## Section 3: Reading Cards — Telegram-native Cells

### Left color accent bar

**Component:** `src/features/readings/components/ReadingCard.tsx` (modified)

Replace the colored systolic number with a 4px-wide left accent bar spanning the full cell height. Color = AHA classification soft color from the palette above (full opacity, not softened).

The systolic and diastolic numbers revert to the default foreground color. The accent bar carries the classification signal.

### Delete visibility

Delete button (`Trash2` icon) is hidden in the collapsed state. It appears only when the card is expanded (same tap to expand/collapse as today). This eliminates accidental deletes from list-scrolling.

### Collapsed state

```
[bar] 138/88  72 bpm          Today 14:32
      🧠 ☕ 💊                             ← context icon strip (if any)
```

- Left color bar
- `SYS/DIA` in default foreground weight (not bold colored)
- Pulse if present
- Timestamp right-aligned
- Context emoji strip on second line if any context fields are filled

### Expanded state

```
[bar] 138/88  72 bpm          Today 14:32
      ──────────────────────────────────
      💪 Right arm    🪑 Sitting
      😴 7h · fair    🧠 Stress: 2/5
      ☕ 2 cups        💊 Taken
      📝 After morning walk
                                      [🗑]
```

- Separator line between header and detail
- Two-column grid for context fields
- Notes span full width
- Delete button bottom-right, `text-destructive`

### Section headers in History page

Month group headers change from the current bordered box to a Telegram-style section header:
- All-caps, `text-xs`, `text-muted-foreground`, `tracking-wider`
- No border box — just the label with `px-4 pt-4 pb-1` padding
- e.g., `JUNE 2026`, `MAY 2026`

---

## Section 4: Navigation Polish

### Telegram MainButton wiring

**Component:** `src/lib/telegram/hooks/useMainButton.ts` (new hook)

```typescript
useMainButton({
  text: string,
  visible: boolean,
  onClick: () => void
})
```

Manages `Telegram.WebApp.MainButton` show/hide/text/onClick lifecycle, cleaning up on unmount.

Used by:
- Dashboard page: `text="Add Reading"`, `visible=true` when not in form, hidden when form is open
- ReadingForm: `text="Save Reading"`, `visible=true` while form is open (overrides dashboard's MainButton)

### BottomNav active indicator dot

Active tab gains a 4px × 4px filled circle indicator above the icon (Telegram's own tab bar convention). Inactive tabs have no dot.

```
   ●                    (active indicator dot)
   🏠      📋      ⚙️
Dashboard History Settings
```

Implemented as a `w-1 h-1 rounded-full bg-primary` element, positioned above the icon with `mb-0.5`.

### Web shell FAB repositioning

FAB `bottom` position changes from `bottom-6` to `bottom-6` (unchanged — web shell has no BottomNav). No change needed; the FAB overlap only exists in the Telegram shell which now uses MainButton instead.

---

## Section 5: Empty State

**Component:** `src/features/dashboard/components/EmptyState.tsx`

Shown on the dashboard when `readings.length === 0` and `!loading`. Replaces the health status hero, stat cards, chart, and recent list entirely.

```
         ♥

   Track your blood
       pressure

Add readings to see your chart,
trends, and health status here.
Your data stays on your device.

  ▓▓▓▓  Add first reading  ▓▓▓▓
```

- Heart icon from `lucide-react` (`Heart`), `h-12 w-12 text-muted-foreground/40`
- Heading: `text-xl font-semibold`
- Body: `text-sm text-muted-foreground text-center max-w-xs`
- CTA: in web context a `Button` that calls `onAddReading()`; in Telegram context the MainButton handles this (CTA button hidden)

---

## Section 6: Skeleton Loading

Replace the `"Loading…"` text with a skeleton layout that matches the real content shape. Uses a `bg-muted animate-pulse rounded` pattern (Tailwind CSS, no library).

**Skeleton layout:**

- Hero card: full-width rect, `h-24 rounded-2xl`
- Stat cards: three equal `h-16 rounded-xl` side by side
- Chart: `h-48 rounded-xl`
- Two reading-cell skeletons: `h-12 rounded-xl`

Shown while `loading === true`. Prevents layout shift and looks intentional.

---

## New Files

```
src/features/dashboard/components/HealthStatusHero.tsx   Health status card
src/features/dashboard/components/EmptyState.tsx          Empty state for zero readings
src/features/readings/components/AHABadge.tsx             Live AHA classification pill
src/lib/telegram/hooks/useMainButton.ts                   Telegram MainButton lifecycle hook
```

## Modified Files

```
src/app/page.tsx                                          Wire hero, empty state, skeleton, MainButton
src/components/StatCard.tsx                               Add trend prop + indicator
src/components/shells/BottomNav.tsx                       Add active indicator dot
src/features/readings/components/ReadingCard.tsx          Left bar, hide delete, expand polish
src/features/readings/components/ReadingForm.tsx          AHABadge, MainButton submit, context label
src/app/history/page.tsx                                  Telegram-style month section headers
```

---

## Utility Changes

### AHA classification utility

**File:** `src/lib/utils/aha.ts` (new)

```typescript
export type AHAClass = 'normal' | 'elevated' | 'stage1' | 'stage2'

export function classifyBP(systolic: number, diastolic: number): AHAClass
export function ahaLabel(cls: AHAClass): string        // "NORMAL", "ELEVATED", etc.
export function ahaMessage(cls: AHAClass): string      // Human-readable one-liner
export function ahaColor(cls: AHAClass): string        // Hex color from wellness palette
```

Used by `HealthStatusHero`, `AHABadge`, `ReadingCard` accent bar. Centralises the classification logic (currently duplicated across `BPChart` tooltip and `ReadingCard`).

### Trend calculation utility

**File:** `src/lib/utils/stats.ts` (extended)

Add `computeTrend(current: number | null, previous: number | null): { direction: 'up'|'down'|'stable', delta: number | null }`.

Used by `StatCard` and `HealthStatusHero`.

---

## Out of Scope

- History page filter chips (deferred to a future spec)
- Settings page Telegram-style grouped list (deferred)
- Chart visual changes (chart already has AHA zones; no changes needed)
- Animations beyond the chevron rotate and pulse skeleton

---

## Accessibility

- All new interactive elements have `aria-label`
- Color is never the sole signal — AHA badge includes text label, accent bar is always paired with numeric value
- Tap targets ≥ 44px on all new touchable elements
- `prefers-reduced-motion`: skeleton animation and chevron transition respect `motion-safe:` Tailwind variant
