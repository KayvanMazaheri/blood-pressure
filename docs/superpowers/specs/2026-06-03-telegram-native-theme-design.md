# Telegram Native Theme & Integration — Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Overview

A full rewrite of the Telegram integration layer. The current implementation has three categories of problems:

1. **Wrong architecture for theming** — JS reads `themeParams` and re-injects them as CSS variables. Telegram already injects `var(--tg-theme-*)` CSS variables into every Mini App page automatically. The JS layer is redundant, runs after paint (causing flicker), and misses 6 of the 15 available theme params.
2. **Missing chrome integration** — `setHeaderColor`, `setBackgroundColor`, `setBottomBarColor` are never called, so Telegram's own UI chrome (drag handle, status bar, bottom edge) doesn't match the app colors.
3. **Non-native behaviors** — Browser `confirm()` dialogs, no `SettingsButton`, no home screen prompt, no viewport height correction.

Approach: CSS-first for colors (use Telegram's own vars directly), slim JS for chrome + behaviors.

---

## Section 1: Theme Architecture (CSS-first)

### How it works

Telegram auto-injects all `--tg-theme-*` CSS variables on page load and updates them on `themeChanged`. We no longer need JS to read and re-write these. Instead, a CSS attribute selector remaps Tailwind's design tokens to the Telegram vars when the app runs inside Telegram.

`TelegramShell` sets `document.documentElement.dataset.shell = 'telegram'` on mount. This activates the CSS block.

### globals.css addition

```css
[data-shell="telegram"] {
  --background:             var(--tg-theme-bg-color);
  --foreground:             var(--tg-theme-text-color);
  --card:                   var(--tg-theme-section-bg-color, var(--tg-theme-secondary-bg-color));
  --card-foreground:        var(--tg-theme-text-color);
  --popover:                var(--tg-theme-section-bg-color, var(--tg-theme-secondary-bg-color));
  --popover-foreground:     var(--tg-theme-text-color);
  --primary:                var(--tg-theme-button-color);
  --primary-foreground:     var(--tg-theme-button-text-color);
  --secondary:              var(--tg-theme-secondary-bg-color);
  --secondary-foreground:   var(--tg-theme-text-color);
  --muted:                  var(--tg-theme-secondary-bg-color);
  --muted-foreground:       var(--tg-theme-subtitle-text-color, var(--tg-theme-hint-color));
  --accent:                 var(--tg-theme-secondary-bg-color);
  --accent-foreground:      var(--tg-theme-text-color);
  --destructive:            var(--tg-theme-destructive-text-color);
  --border:                 var(--tg-theme-section-separator-color);
  --input:                  var(--tg-theme-section-separator-color);
  --ring:                   var(--tg-theme-accent-text-color, var(--tg-theme-button-color));
  --min-h:                  var(--tg-viewport-stable-height, 100dvh);
  font-family:              system-ui, -apple-system, sans-serif;
}
```

### Dark mode variant update

```css
/* Before */
@custom-variant dark (&:is(.dark *));

/* After */
@custom-variant dark (&:is(.dark *), &:is([data-color-scheme="dark"] *));
```

### Files

- `src/app/globals.css` — add `[data-shell="telegram"]` block, update `@custom-variant dark`

---

## Section 2: Chrome Colors & Color Scheme

### Chrome color calls

Three calls inform Telegram's own UI chrome of the app's colors. Called once on mount and again on `themeChanged`:

```typescript
tg.setHeaderColor('secondary_bg_color')
tg.setBackgroundColor('bg_color')
tg.setBottomBarColor('bottom_bar_bg_color')
```

`'secondary_bg_color'`, `'bg_color'`, `'bottom_bar_bg_color'` are Telegram keyword strings that resolve to the current theme value — no hardcoding hex needed.

### Color scheme toggle

Replace `document.documentElement.classList.remove('dark')` with:

```typescript
document.documentElement.dataset.colorScheme = tg.colorScheme  // 'light' | 'dark'
```

Update this on every `themeChanged` event. This drives the `dark:` Tailwind variant without touching the `.dark` class (which belongs to the web shell's manual dark mode).

### theme.ts refactor

`applyTelegramTheme()` is deleted. Replaced with a slim `applyChrome(tg)` function:

```typescript
export function applyChrome(tg: TelegramWebApp): void {
  tg.setHeaderColor('secondary_bg_color')
  tg.setBackgroundColor('bg_color')
  tg.setBottomBarColor('bottom_bar_bg_color')
  document.documentElement.dataset.colorScheme = tg.colorScheme
}
```

### Files

- `src/lib/telegram/theme.ts` — replace with `applyChrome()`
- `src/components/shells/TelegramShell.tsx` — set `data-shell`, `data-color-scheme`, call `applyChrome` on mount and `themeChanged`

---

## Section 3: Native Dialog Helpers

### Problem

`confirm()` renders a browser dialog inside Telegram — visually jarring and platform-inconsistent.

### Solution

New file `src/lib/telegram/dialogs.ts` with Promise-wrapped Telegram dialog APIs. Each function checks `isTelegram()` and falls back to the browser equivalent when running in the web shell:

```typescript
export function tgConfirm(message: string): Promise<boolean>
// Telegram: showConfirm(message, callback)
// Web: Promise.resolve(confirm(message))

export function tgAlert(message: string): Promise<void>
// Telegram: showAlert(message, callback)
// Web: Promise.resolve(alert(message))

export function tgPopup(params: TelegramPopupParams): Promise<string>
// Telegram: showPopup(params, callback) — resolves with button id
// Web: falls back to confirm() for simple cases
```

### Usage sites

| Location | Current | New |
|---|---|---|
| `ReadingCard.tsx` | `confirm('Delete this reading?')` | `await tgConfirm('Delete this reading?')` |
| `history/page.tsx` CSV export | `confirm('This exports unencrypted…')` | `await tgConfirm('This exports unencrypted…')` |
| `history/page.tsx` export format | Two separate buttons (CSV / Download) | `await tgPopup({ message: 'Choose export format', buttons: [{id:'csv', text:'CSV (plain text)'}, {id:'bpdata', text:'Encrypted backup (.bpdata)'}] })` — single entry point, Telegram-native picker |

The export popup replaces the two separate `Button` components in the history page header with a single export button that opens the popup. In web context it falls back to the existing two-button UI.

### Files

- `src/lib/telegram/dialogs.ts` — new
- `src/features/readings/components/ReadingCard.tsx` — use `tgConfirm`
- `src/app/history/page.tsx` — use `tgConfirm` + `tgPopup`

---

## Section 4: SettingsButton & Home Screen Prompt

### SettingsButton

Telegram exposes a native gear icon in its own header chrome via `SettingsButton`. We activate it app-wide from `TelegramShell` — it doesn't need to be per-page since Settings is always reachable from anywhere.

New hook `src/lib/telegram/hooks/useSettingsButton.ts`:

```typescript
useSettingsButton({ onClick: () => void })
// Shows SettingsButton, registers onClick, hides + cleans up on unmount
```

Called in `TelegramShell` with `router.push('/settings')` as the handler. Fires `haptic('selection')` before navigation.

### Home screen prompt

On first launch inside Telegram, prompt the user to add the app to their home screen. Criteria:

- Only in Telegram (`isTelegram()`)
- Only once ever (`localStorage.getItem('bp_home_prompted')`)
- Only if `checkHomeScreenStatus` returns `'unknown'` (never asked)
- Delayed 3 seconds after mount (user has seen the app first)

```typescript
// In TelegramShell useEffect
setTimeout(() => {
  if (localStorage.getItem('bp_home_prompted')) return
  tg.checkHomeScreenStatus((status) => {
    if (status === 'unknown') {
      tg.addToHomeScreen()
      localStorage.setItem('bp_home_prompted', '1')
    }
  })
}, 3000)
```

### Files

- `src/lib/telegram/hooks/useSettingsButton.ts` — new
- `src/components/shells/TelegramShell.tsx` — call hook, add home screen logic

---

## Section 5: Viewport Height & TypeScript Types

### Viewport

`min-h-screen` compiles to `min-height: 100vh`. In Telegram, the virtual keyboard overlays the viewport without shrinking `100vh`, causing bottom content to be hidden behind the keyboard.

Fix: override `min-height` on the body inside the Telegram CSS block:

```css
[data-shell="telegram"] body {
  min-height: var(--tg-viewport-stable-height, 100dvh);
}
```

This means page components don't need to change — the body itself becomes the correct height.

We also add a `viewportChanged` listener that calls `tg.expand()` if `tg.isExpanded` becomes false, preventing the app from collapsing when Telegram tries to shrink it:

```typescript
tg.onEvent('viewportChanged', () => {
  if (!tg.isExpanded) tg.expand()
})
```

### TypeScript type completions

**`TelegramThemeParams` additions:**
- `header_bg_color?: string`
- `bottom_bar_bg_color?: string`
- `section_header_text_color?: string`
- `section_separator_color?: string`
- `subtitle_text_color?: string`
- `link_color?: string`

**`TelegramWebApp` method additions:**
- `setHeaderColor(color: string): void`
- `setBackgroundColor(color: string): void`
- `setBottomBarColor(color: string): void`
- `showAlert(message: string, callback?: () => void): void`
- `showConfirm(message: string, callback?: (confirmed: boolean) => void): void`
- `showPopup(params: TelegramPopupParams, callback?: (buttonId: string) => void): void`
- `addToHomeScreen(): void`
- `checkHomeScreenStatus(callback: (status: 'added' | 'missed' | 'unknown') => void): void`
- `SettingsButton: TelegramSettingsButton`
- `colorScheme: 'light' | 'dark'`
- `isActive: boolean`

**New interfaces:**
```typescript
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
```

### Files

- `src/types/telegram.d.ts` — complete all types

---

## New Files

```
src/lib/telegram/dialogs.ts
src/lib/telegram/hooks/useSettingsButton.ts
```

## Modified Files

```
src/app/globals.css
src/app/history/page.tsx
src/components/shells/TelegramShell.tsx
src/features/readings/components/ReadingCard.tsx
src/lib/telegram/theme.ts
src/types/telegram.d.ts
```

---

## Out of Scope

- Fullscreen mode (user chose expanded mode)
- BiometricManager, LocationManager, Accelerometer (not relevant to a BP tracking app)
- `setEmojiStatus` integration
- `DeviceStorage` / `SecureStorage` (app already uses IndexedDB + Web Crypto)
- Inline keyboard / `sendData` (no bot interaction needed from the app)
