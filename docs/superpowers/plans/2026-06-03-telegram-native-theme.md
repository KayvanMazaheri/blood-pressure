# Telegram Native Theme & Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken JS-based Telegram theme with a CSS-first architecture and add the full native Telegram behavior layer (chrome colors, native dialogs, SettingsButton, home screen prompt, viewport fix).

**Architecture:** Telegram auto-injects `var(--tg-theme-*)` CSS variables into every Mini App page. A `[data-shell="telegram"]` CSS block remaps shadcn/Tailwind design tokens directly to those variables — zero JS needed for colors. A slim `applyChrome()` function handles the three chrome color API calls (`setHeaderColor`, `setBackgroundColor`, `setBottomBarColor`). Native dialogs are centralized in `dialogs.ts` as Promise-wrapped helpers that fall back to browser APIs in the web shell.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind v4 + shadcn/ui, Vitest + jsdom for tests, Telegram Web App JS API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/telegram.d.ts` | Modify | Complete global type declarations for all Telegram APIs used |
| `src/lib/telegram/theme.ts` | Rewrite | Slim `applyChrome(tg)` — only chrome color calls |
| `src/app/globals.css` | Modify | Add `[data-shell="telegram"]` CSS block + dark variant + viewport |
| `src/lib/telegram/dialogs.ts` | Create | `tgConfirm`, `tgAlert`, `tgPopup` with Telegram/web fallbacks |
| `src/lib/telegram/__tests__/dialogs.test.ts` | Create | Unit tests for dialogs |
| `src/lib/telegram/hooks/useSettingsButton.ts` | Create | Hook managing Telegram SettingsButton lifecycle |
| `src/components/shells/TelegramShell.tsx` | Modify | Wire: data-shell, applyChrome, viewportChanged, SettingsButton, home screen |
| `src/features/readings/components/ReadingCard.tsx` | Modify | Replace `confirm()` with `tgConfirm()` |
| `src/app/history/page.tsx` | Modify | Replace `confirm()` with `tgConfirm()`; Telegram export via `tgPopup` |

---

## Task 1: Complete TypeScript types

**Files:**
- Modify: `src/types/telegram.d.ts`

- [ ] **Step 1: Replace the file content**

```typescript
// src/types/telegram.d.ts
export {}

declare global {
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
    section_header_text_color?: string
    section_separator_color?: string
    link_color?: string
    subtitle_text_color?: string
    header_bg_color?: string
    bottom_bar_bg_color?: string
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

  interface TelegramMainButton {
    isVisible: boolean
    text: string
    setText(text: string): void
    show(): void
    hide(): void
    onClick(fn: () => void): void
    offClick(fn: () => void): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
  }

  interface TelegramSettingsButton {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(fn: () => void): void
    offClick(fn: () => void): void
  }

  interface TelegramPopupButton {
    id?: string
    type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
    text?: string
  }

  interface TelegramPopupParams {
    title?: string
    message: string
    buttons?: TelegramPopupButton[]
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
    isExpanded: boolean
    isActive: boolean
    viewportHeight: number
    viewportStableHeight: number
    themeParams: TelegramThemeParams
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
    MainButton: TelegramMainButton
    SettingsButton: TelegramSettingsButton
    CloudStorage: TelegramCloudStorage
    ready(): void
    expand(): void
    close(): void
    setHeaderColor(color: string): void
    setBackgroundColor(color: string): void
    setBottomBarColor(color: string): void
    showAlert(message: string, callback?: () => void): void
    showConfirm(message: string, callback?: (confirmed: boolean) => void): void
    showPopup(params: TelegramPopupParams, callback?: (buttonId: string) => void): void
    addToHomeScreen(): void
    checkHomeScreenStatus(callback: (status: 'added' | 'missed' | 'unknown') => void): void
    onEvent(eventType: string, eventHandler: () => void): void
    offEvent(eventType: string, eventHandler: () => void): void
  }

  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Commit**

```bash
git add src/types/telegram.d.ts
git commit -m "Complete Telegram WebApp TypeScript type definitions"
```

---

## Task 2: Rewrite theme.ts

**Files:**
- Rewrite: `src/lib/telegram/theme.ts`

- [ ] **Step 1: Replace the file**

```typescript
// src/lib/telegram/theme.ts
export function applyChrome(tg: TelegramWebApp): void {
  tg.setHeaderColor('secondary_bg_color')
  tg.setBackgroundColor('bg_color')
  tg.setBottomBarColor('bottom_bar_bg_color')
  // Remove the web shell's hardcoded dark class; Telegram theme drives color scheme
  document.documentElement.classList.remove('dark')
  document.documentElement.dataset.colorScheme = tg.colorScheme
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/theme.ts
git commit -m "Replace applyTelegramTheme with slim applyChrome"
```

---

## Task 3: Update globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update the dark variant line**

Find this line near the top of `globals.css`:
```css
@custom-variant dark (&:is(.dark *));
```

Replace with:
```css
@custom-variant dark (&:is(.dark *), &:is([data-color-scheme="dark"] *));
```

- [ ] **Step 2: Append the Telegram theme block at the end of the file**

Add after the closing `}` of the `@layer base` block:

```css
[data-shell="telegram"] {
  --background:              var(--tg-theme-bg-color);
  --foreground:              var(--tg-theme-text-color);
  --card:                    var(--tg-theme-section-bg-color, var(--tg-theme-secondary-bg-color));
  --card-foreground:         var(--tg-theme-text-color);
  --popover:                 var(--tg-theme-section-bg-color, var(--tg-theme-secondary-bg-color));
  --popover-foreground:      var(--tg-theme-text-color);
  --primary:                 var(--tg-theme-button-color);
  --primary-foreground:      var(--tg-theme-button-text-color);
  --secondary:               var(--tg-theme-secondary-bg-color);
  --secondary-foreground:    var(--tg-theme-text-color);
  --muted:                   var(--tg-theme-secondary-bg-color);
  --muted-foreground:        var(--tg-theme-subtitle-text-color, var(--tg-theme-hint-color));
  --accent:                  var(--tg-theme-secondary-bg-color);
  --accent-foreground:       var(--tg-theme-text-color);
  --destructive:             var(--tg-theme-destructive-text-color);
  --border:                  var(--tg-theme-section-separator-color);
  --input:                   var(--tg-theme-section-separator-color);
  --ring:                    var(--tg-theme-accent-text-color, var(--tg-theme-button-color));
  font-family:               system-ui, -apple-system, sans-serif;
}

[data-shell="telegram"] body {
  min-height: var(--tg-viewport-stable-height, 100dvh);
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "Add CSS-first Telegram theme block and dark variant update"
```

---

## Task 4: Create dialogs.ts with tests

**Files:**
- Create: `src/lib/telegram/dialogs.ts`
- Create: `src/lib/telegram/__tests__/dialogs.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/telegram/__tests__/dialogs.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/telegram/context', () => ({
  isTelegram: vi.fn(),
}))

import { isTelegram } from '@/lib/telegram/context'
import { tgConfirm, tgAlert, tgPopup } from '../dialogs'

const mockIsTelegram = vi.mocked(isTelegram)

beforeEach(() => {
  vi.resetAllMocks()
  delete (window as { Telegram?: unknown }).Telegram
})

describe('tgConfirm', () => {
  it('resolves with window.confirm result in web context', async () => {
    mockIsTelegram.mockReturnValue(false)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const result = await tgConfirm('Are you sure?')
    expect(window.confirm).toHaveBeenCalledWith('Are you sure?')
    expect(result).toBe(true)
  })

  it('resolves false when web user cancels', async () => {
    mockIsTelegram.mockReturnValue(false)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(await tgConfirm('Delete?')).toBe(false)
  })

  it('uses Telegram showConfirm and resolves true', async () => {
    mockIsTelegram.mockReturnValue(true)
    const showConfirm = vi.fn((_msg: string, cb: (v: boolean) => void) => cb(true))
    window.Telegram = { WebApp: { showConfirm } } as unknown as typeof window.Telegram
    expect(await tgConfirm('Delete?')).toBe(true)
    expect(showConfirm).toHaveBeenCalledWith('Delete?', expect.any(Function))
  })

  it('uses Telegram showConfirm and resolves false', async () => {
    mockIsTelegram.mockReturnValue(true)
    const showConfirm = vi.fn((_msg: string, cb: (v: boolean) => void) => cb(false))
    window.Telegram = { WebApp: { showConfirm } } as unknown as typeof window.Telegram
    expect(await tgConfirm('Delete?')).toBe(false)
  })
})

describe('tgAlert', () => {
  it('calls window.alert in web context', async () => {
    mockIsTelegram.mockReturnValue(false)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    await tgAlert('Something happened')
    expect(window.alert).toHaveBeenCalledWith('Something happened')
  })

  it('uses Telegram showAlert in Telegram context', async () => {
    mockIsTelegram.mockReturnValue(true)
    const showAlert = vi.fn((_msg: string, cb: () => void) => cb())
    window.Telegram = { WebApp: { showAlert } } as unknown as typeof window.Telegram
    await tgAlert('Something happened')
    expect(showAlert).toHaveBeenCalledWith('Something happened', expect.any(Function))
  })
})

describe('tgPopup', () => {
  it('resolves first button id in web context when user confirms', async () => {
    mockIsTelegram.mockReturnValue(false)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const result = await tgPopup({
      message: 'Export format',
      buttons: [
        { id: 'csv', type: 'default', text: 'CSV' },
        { id: 'cancel', type: 'cancel' },
      ],
    })
    expect(result).toBe('csv')
  })

  it('resolves cancel button id in web context when user cancels', async () => {
    mockIsTelegram.mockReturnValue(false)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const result = await tgPopup({
      message: 'Export format',
      buttons: [
        { id: 'csv', type: 'default', text: 'CSV' },
        { id: 'cancel', type: 'cancel' },
      ],
    })
    expect(result).toBe('cancel')
  })

  it('resolves first button id as fallback when no cancel button in web context', async () => {
    mockIsTelegram.mockReturnValue(false)
    const result = await tgPopup({
      message: 'Choose',
      buttons: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
    })
    expect(result).toBe('a')
  })

  it('uses Telegram showPopup and resolves with button id', async () => {
    mockIsTelegram.mockReturnValue(true)
    const showPopup = vi.fn((_params: unknown, cb: (id: string) => void) => cb('csv'))
    window.Telegram = { WebApp: { showPopup } } as unknown as typeof window.Telegram
    const result = await tgPopup({
      message: 'Export',
      buttons: [{ id: 'csv', text: 'CSV' }],
    })
    expect(result).toBe('csv')
    expect(showPopup).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- dialogs
```

Expected: FAIL — `Cannot find module '../dialogs'`

- [ ] **Step 3: Create dialogs.ts**

```typescript
// src/lib/telegram/dialogs.ts
import { isTelegram } from './context'

export function tgConfirm(message: string): Promise<boolean> {
  if (!isTelegram()) return Promise.resolve(window.confirm(message))
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showConfirm(message, resolve)
  })
}

export function tgAlert(message: string): Promise<void> {
  if (!isTelegram()) {
    window.alert(message)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showAlert(message, resolve)
  })
}

export function tgPopup(params: TelegramPopupParams): Promise<string> {
  if (!isTelegram()) {
    const buttons = params.buttons ?? []
    const cancelBtn = buttons.find((b) => b.type === 'cancel' || b.type === 'close')
    const confirmBtn = buttons.find((b) => b !== cancelBtn)
    if (cancelBtn) {
      const confirmed = window.confirm(params.message)
      return Promise.resolve(confirmed ? (confirmBtn?.id ?? '') : (cancelBtn.id ?? ''))
    }
    return Promise.resolve(buttons[0]?.id ?? '')
  }
  return new Promise((resolve) => {
    window.Telegram!.WebApp.showPopup(params, resolve)
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- dialogs
```

Expected: all 9 tests pass

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/telegram/dialogs.ts src/lib/telegram/__tests__/dialogs.test.ts
git commit -m "Add tgConfirm, tgAlert, tgPopup dialog helpers with tests"
```

---

## Task 5: Create useSettingsButton hook

**Files:**
- Create: `src/lib/telegram/hooks/useSettingsButton.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/telegram/hooks/useSettingsButton.ts
'use client'
import { useEffect } from 'react'
import { isTelegram } from '@/lib/telegram/context'

interface UseSettingsButtonOptions {
  onClick: () => void
}

export function useSettingsButton({ onClick }: UseSettingsButtonOptions): void {
  useEffect(() => {
    if (!isTelegram()) return
    const btn = window.Telegram!.WebApp.SettingsButton
    btn.show()
    btn.onClick(onClick)
    return () => {
      btn.offClick(onClick)
      btn.hide()
    }
  }, [onClick])
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/hooks/useSettingsButton.ts
git commit -m "Add useSettingsButton hook for Telegram native settings navigation"
```

---

## Task 6: Update TelegramShell

**Files:**
- Modify: `src/components/shells/TelegramShell.tsx`

The shell needs to: set `data-shell` + `data-color-scheme` on `<html>`, call `applyChrome`, listen to `themeChanged` and `viewportChanged`, wire SettingsButton, and trigger the home screen prompt.

- [ ] **Step 1: Replace the file content**

```typescript
// src/components/shells/TelegramShell.tsx
'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from './BottomNav'
import { applyChrome } from '@/lib/telegram/theme'
import { useSettingsButton } from '@/lib/telegram/hooks/useSettingsButton'
import { getSyncManager } from '@/lib/telegram/sync'
import { isTelegram } from '@/lib/telegram/context'
import { haptic } from '@/lib/telegram/haptics'

export function TelegramShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const goToSettings = useCallback(() => {
    haptic('selection')
    router.push('/settings')
  }, [router])

  useSettingsButton({ onClick: goToSettings })

  useEffect(() => {
    if (!isTelegram()) return
    const tg = window.Telegram!.WebApp

    tg.ready()
    tg.expand()

    // CSS block handles colors; JS sets data attributes and chrome colors
    document.documentElement.dataset.shell = 'telegram'
    applyChrome(tg)

    const handleThemeChange = () => applyChrome(tg)
    tg.onEvent('themeChanged', handleThemeChange)

    const handleViewportChange = () => {
      if (!tg.isExpanded) tg.expand()
    }
    tg.onEvent('viewportChanged', handleViewportChange)

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

    // Home screen prompt — once per install
    const HOME_KEY = 'bp_home_prompted'
    const promptTimer = setTimeout(() => {
      if (localStorage.getItem(HOME_KEY)) return
      tg.checkHomeScreenStatus((status) => {
        if (status === 'unknown') {
          tg.addToHomeScreen()
          localStorage.setItem(HOME_KEY, '1')
        }
      })
    }, 3000)

    return () => {
      tg.offEvent('themeChanged', handleThemeChange)
      tg.offEvent('viewportChanged', handleViewportChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearTimeout(promptTimer)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        paddingTop: 'var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px))',
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

- [ ] **Step 2: Verify type check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors (the existing `react-hooks/set-state-in-effect` in ShellProvider is pre-existing and unrelated)

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/shells/TelegramShell.tsx
git commit -m "Wire Telegram shell: CSS theme, chrome colors, SettingsButton, home screen prompt"
```

---

## Task 7: Update ReadingCard to use tgConfirm

**Files:**
- Modify: `src/features/readings/components/ReadingCard.tsx`

- [ ] **Step 1: Add import and replace confirm call**

At the top of `ReadingCard.tsx`, add the import after the existing imports:

```typescript
import { tgConfirm } from '@/lib/telegram/dialogs'
```

Replace the `handleDelete` function:

```typescript
async function handleDelete() {
  const confirmed = await tgConfirm('Delete this reading?')
  if (!confirmed) return
  haptic('warning')
  setDeleting(true)
  await onDelete(reading.id)
}
```

- [ ] **Step 2: Verify type check**

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
git add src/features/readings/components/ReadingCard.tsx
git commit -m "Use tgConfirm for delete confirmation in ReadingCard"
```

---

## Task 8: Update history page to use tgConfirm and tgPopup

**Files:**
- Modify: `src/app/history/page.tsx`

The history page currently has two export buttons (CSV and Download). In Telegram, we replace these with a single button that opens a native popup. In web, the two buttons are preserved.

- [ ] **Step 1: Replace the file content**

```typescript
'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ReadingList } from '@/features/readings/components/ReadingList'
import { useReadings } from '@/features/readings/hooks/useReadings'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { exportToCSV, exportToBpdata } from '@/features/backup/export'
import { useTelegramBackButton } from '@/lib/telegram/hooks/useTelegramBackButton'
import { isTelegram } from '@/lib/telegram/context'
import { tgConfirm, tgPopup } from '@/lib/telegram/dialogs'

export default function HistoryPage() {
  useTelegramBackButton(true)
  const { readings, deleteReading } = useReadings()
  const { settings } = useSettings()
  const [exporting, setExporting] = useState(false)

  async function handleExportCSV() {
    const confirmed = await tgConfirm(
      'This exports unencrypted health data as a plain CSV. Continue?'
    )
    if (!confirmed) return
    exportToCSV(readings)
  }

  async function handleExportBpdata() {
    setExporting(true)
    try {
      await exportToBpdata(readings)
    } finally {
      setExporting(false)
    }
  }

  async function handleTelegramExport() {
    const buttonId = await tgPopup({
      title: 'Export Data',
      message: 'Choose an export format',
      buttons: [
        { id: 'csv', type: 'default', text: 'CSV (plain text)' },
        { id: 'bpdata', type: 'default', text: 'Encrypted backup (.bpdata)' },
        { id: 'cancel', type: 'cancel' },
      ],
    })
    if (buttonId === 'csv') await handleExportCSV()
    else if (buttonId === 'bpdata') await handleExportBpdata()
  }

  const exportMenu = isTelegram() ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTelegramExport}
      disabled={readings.length === 0 || exporting}
      aria-label="Export readings"
    >
      <Download className="h-4 w-4" />
    </Button>
  ) : (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExportCSV}
        disabled={readings.length === 0}
      >
        CSV
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportBpdata}
        disabled={readings.length === 0 || exporting}
        aria-label="Export encrypted backup"
      >
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

- [ ] **Step 2: Verify type check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Run Prettier**

```bash
npx prettier --write src/app/history/page.tsx src/features/readings/components/ReadingCard.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/app/history/page.tsx src/features/readings/components/ReadingCard.tsx
git commit -m "Use tgConfirm and tgPopup in history page for native Telegram dialogs"
```

---

## Final verification

- [ ] **Run full suite one last time**

```bash
npm test && npx tsc --noEmit && npm run lint && npx prettier --check .
```

Expected: all pass, no errors, no formatting issues

- [ ] **Push**

```bash
git push origin main
```
