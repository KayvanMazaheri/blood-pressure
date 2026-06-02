# Telegram Mini App — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Overview

Adapt the existing blood pressure tracker into a Telegram Mini App while keeping it fully functional as a standalone web app. The two experiences share every page and data layer; they differ only in their UI shell, storage backends, and cross-device sync capability.

- **Standalone web app** — unchanged behaviour. IndexedDB + localStorage. Google Drive backup. Current layout.
- **Telegram Mini App** — Telegram-native shell (bottom nav, BackButton, theming, haptics). Encryption key and data snapshots stored in Telegram CloudStorage for automatic cross-device sync.

The app remains a static Next.js export deployed to GitHub Pages. No server is required.

---

## Context Detection

A single utility determines which shell and storage providers to activate:

```typescript
// src/lib/telegram/context.ts
export function isTelegram(): boolean {
  return typeof window !== 'undefined' &&
    !!window.Telegram?.WebApp?.initDataUnsafe?.user
}

export function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}
```

Called once at root layout render. Result passed via React context so all descendants can read it without re-detection.

---

## Architecture

```
Root Layout
  ├── isTelegram() → <TelegramShell>
  │       ├── applyTelegramTheme()
  │       ├── Telegram.WebApp.ready() + expand()
  │       ├── <BottomNav> (3 tabs)
  │       └── page content (BackButton wired per-page)
  │
  └── else → <WebShell>
          └── current layout, no changes

Shared data layer (both shells):
  useReadings / useSettings
        ↓
  StorageProvider (interface — key storage only)
        ├── LocalStorageKeyProvider     (browser)
        └── TelegramCloudKeyProvider    (Telegram: CloudStorage)

  SyncManager (active only in Telegram context)
        ├── push: local IndexedDB → compress → encrypt → chunk → CloudStorage
        └── pull: CloudStorage → reassemble → decrypt → decompress → merge → IndexedDB
```

The health data itself always lives in IndexedDB (Dexie). The storage abstraction covers only the **encryption key**. The sync engine moves snapshots of the IndexedDB data into CloudStorage for cross-device access.

---

## Storage Abstraction

### Interface

```typescript
// src/lib/telegram/storage.ts
interface KeyStorage {
  getKey(): Promise<string | null>
  setKey(key: string): Promise<void>
  removeKey(): Promise<void>
  hasKey(): Promise<boolean>
}
```

### LocalStorageKeyProvider

Wraps the existing `localStorage['bp_enc_key']` access. No behaviour change for standalone users.

### TelegramCloudKeyProvider

Wraps Telegram's callback-based CloudStorage API in Promises:

```typescript
class TelegramCloudKeyProvider implements KeyStorage {
  async getKey(): Promise<string | null> {
    return new Promise((resolve) =>
      Telegram.WebApp.CloudStorage.getItem('bp_enc_key', (err, val) =>
        resolve(err ? null : val ?? null)
      )
    )
  }
  // setKey and removeKey follow the same pattern
}
```

### Factory

```typescript
// src/lib/telegram/storage.ts
export function createKeyStorage(): KeyStorage {
  return isTelegram()
    ? new TelegramCloudKeyProvider()
    : new LocalStorageKeyProvider()
}
```

The existing `src/lib/crypto/index.ts` is updated to call `createKeyStorage()` instead of accessing `localStorage` directly.

**`isKeyPresent()` becomes async:** The current synchronous `isKeyPresent(): boolean` must become `isKeyPresent(): Promise<boolean>` to support CloudStorage (callback-based). Its one caller, `src/app/page.tsx`, is updated to await it inside a `useEffect`.

---

## Sync Engine

### CloudStorage Layout

```
bp_enc_key              AES-256-GCM key as JWK string
bp_sync_meta            JSON: { version, lastSyncAt, deviceId, chunkCount }
bp_sync_tombstones      JSON array of deleted reading IDs
bp_sync_chunk_000       base64 string ≤ 4,096 chars
bp_sync_chunk_001       ...
bp_sync_chunk_NNN       last chunk
```

**Capacity:** 10 years of daily readings ≈ 50 chunks. At 1 deletion/week for 10 years ≈ 520 tombstone UUIDs ≈ 19 KB — a second tombstone key (`bp_sync_tombstones_001`) is added automatically when the first exceeds 3,800 chars (safe margin below 4,096).

### Snapshot Format

Reuses the existing `.bpdata` pipeline:

```
all readings (JSON) + settings (JSON)
  → compress via native CompressionStream (gzip)
  → encrypt with enc key (AES-256-GCM, random IV)
  → base64 encode
  → split into chunks of 4,096 chars
```

`CompressionStream` is available in all Chromium/WebKit versions used by Telegram clients.

### Push Algorithm

```
1. Serialize all IndexedDB readings + settings to JSON
2. Compress → encrypt → base64 → chunk
3. Write bp_sync_meta (chunkCount, lastSyncAt = Date.now(), deviceId)
4. Write bp_sync_tombstones (current tombstone list)
5. Write bp_sync_chunk_000 … bp_sync_chunk_NNN
6. Delete any old chunks beyond new chunkCount (stale cleanup)
```

### Pull Algorithm

```
1. Read bp_sync_meta → get chunkCount
2. Read all chunks in parallel (CloudStorage.getItems)
3. Reassemble → decrypt → decompress → parse
4. Read bp_sync_tombstones
5. Merge with local IndexedDB:
     merged = union(local readings, cloud readings) by ID
              minus any ID present in tombstones
6. Write merged back to IndexedDB
7. Update local last-seen sync timestamp
```

### Merge Rules

- Readings are immutable after creation (no edit flow). UUID collision is impossible.
- Union-by-ID is therefore safe and lossless — both sides are always kept.
- Tombstones apply globally: a deleted ID is removed regardless of which device deleted it.
- Settings: cloud version wins on pull (last-write-wins by `lastSyncAt`).

### Sync Triggers

| Event | Action |
|---|---|
| App opens, local IndexedDB empty, CloudStorage has data | Pull + import |
| App opens, `bp_sync_meta.lastSyncAt` > local last-seen | Pull + merge |
| Reading added | Debounced push (30 s) |
| Reading deleted | Append to tombstone list + debounced push (5 s) |
| `visibilitychange` → hidden | Push if dirty |
| "Sync now" button | Pull → merge → push |

### SyncManager Interface

```typescript
// src/lib/telegram/sync.ts
export class SyncManager {
  async pull(): Promise<void>
  async push(): Promise<void>
  schedulePush(debounceMs: number): void
  get isSyncing(): boolean
  get lastSyncAt(): number | null
  get error(): string | null
}
```

### New Device Flow (Telegram)

```
1. Check CloudStorage['bp_enc_key']
     found  → use existing key
     not found → generate new key, store in CloudStorage
2. Check bp_sync_meta
     found  → pull chunks, merge into local IndexedDB
     not found → fresh start (no prior data)
3. App is ready
```

---

## Telegram Shell

### Initialization

```typescript
// TelegramShell.tsx — on mount
Telegram.WebApp.ready()
Telegram.WebApp.expand()
applyTelegramTheme(Telegram.WebApp.themeParams)

// Re-apply on theme change (user switches Telegram theme)
Telegram.WebApp.onEvent('themeChanged', () =>
  applyTelegramTheme(Telegram.WebApp.themeParams)
)
```

### Layout

```
┌──────────────────────────────┐
│  safe area top inset         │
│                              │
│  page content (full height)  │
│                              │
│  safe area bottom inset      │
├──────────────────────────────┤
│  BottomNav (fixed)           │
│  [ Dashboard | History | Settings ] │
└──────────────────────────────┘
```

- No custom `PageHeader` rendered in Telegram shell
- `padding-bottom` on page content = `BottomNav height + contentSafeAreaInset.bottom`
- `padding-top` = `safeAreaInset.top` (device notch / status bar)

### BackButton

| Page | BackButton |
|---|---|
| Dashboard (root) | Hidden |
| History | Shown → `router.back()` |
| Settings | Shown → `router.back()` |
| Any future sub-page | Shown → `router.back()` |

BackButton visibility is set by each page via a `useTelegramBackButton(show: boolean)` hook.

### BottomNav

Three tabs with icons from `lucide-react`:

| Tab | Icon | Route |
|---|---|---|
| Dashboard | `Home` | `/` |
| History | `ClipboardList` | `/history` |
| Settings | `Settings` | `/settings` |

Active tab highlighted using Telegram's `button_color`. Tab switches trigger `selectionChanged()` haptic.

---

## Theming

Applied by injecting a `<style>` block at runtime. No Tailwind config changes. Every existing shadcn component inherits the new values automatically.

| Telegram `themeParams` key | shadcn CSS variable |
|---|---|
| `bg_color` | `--background` |
| `secondary_bg_color` | `--card`, `--muted` |
| `text_color` | `--foreground` |
| `hint_color` | `--muted-foreground` |
| `button_color` | `--primary` |
| `button_text_color` | `--primary-foreground` |
| `destructive_text_color` | `--destructive` |
| `accent_text_color` | `--ring` |
| `section_bg_color` | `--popover` |
| `link_color` | `--accent-foreground` |

```typescript
// src/lib/telegram/theme.ts
export function applyTelegramTheme(params: ThemeParams): void {
  const map: Record<string, string> = {
    '--background': params.bg_color,
    '--card': params.secondary_bg_color,
    // ...
  }
  const style = document.getElementById('tg-theme') ?? (() => {
    const el = document.createElement('style')
    el.id = 'tg-theme'
    document.head.appendChild(el)
    return el
  })()
  style.textContent = `:root { ${Object.entries(map)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')} }`
}
```

---

## Haptic Feedback

```typescript
// src/lib/telegram/haptics.ts
export function haptic(type: 'success' | 'warning' | 'error' | 'selection' | 'light'): void {
  if (!isTelegram()) return
  const hf = Telegram.WebApp.HapticFeedback
  if (type === 'selection') hf.selectionChanged()
  else if (type === 'light') hf.impactOccurred('light')
  else hf.notificationOccurred(type)
}
```

| User action | Haptic call |
|---|---|
| Save reading (success) | `haptic('success')` |
| Delete reading | `haptic('warning')` |
| Validation error | `haptic('error')` |
| Tab switch | `haptic('selection')` |
| Toggle / button tap | `haptic('light')` |

---

## Sync UI

### SyncStatus component

Shown in Settings page (both shells when in Telegram context):

```
● Synced  2 min ago          [Sync now]
⟳ Syncing…
⚠ Sync failed  [Retry]
```

### SyncSettings component

Full section in Settings → "Telegram Sync":

- Last synced timestamp
- "Sync now" button
- Data size indicator (approximate reading count in cloud)
- "Clear cloud data" (destructive, with confirmation)

---

## Standalone "Connect to Telegram" Flow

Shown in Settings → "Use in Telegram" section, **only when `isTelegram()` is false**:

```
Use in Telegram

Get automatic cross-device sync by opening
this app inside Telegram.

[ Open in Telegram ↗ ]

Already have data here?
Export it first, then import it after
opening in Telegram.

[ Export your data ]
```

- "Open in Telegram" links to `https://t.me/{NEXT_PUBLIC_TELEGRAM_BOT_NAME}/{NEXT_PUBLIC_TELEGRAM_APP_NAME}`
- "Export your data" triggers the existing `.bpdata` export
- Section is hidden in Telegram context

**Migration path (standalone → Telegram Mini App)**

```
1. Standalone Settings → Export .bpdata
2. Open Mini App in Telegram (fresh, CloudStorage empty)
3. Settings → Import → select .bpdata
4. App imports readings, pushes snapshot to CloudStorage
5. All future Telegram devices pull from CloudStorage automatically
```

---

## New File Structure

Files created or modified (existing files outside this list are unchanged):

```
src/lib/telegram/
  context.ts         isTelegram(), getTelegramUser()
  theme.ts           applyTelegramTheme()
  haptics.ts         haptic() helper
  storage.ts         KeyStorage interface + LocalStorageKeyProvider
                     + TelegramCloudKeyProvider + createKeyStorage()
  sync.ts            SyncManager class

src/components/shells/
  WebShell.tsx       current layout extracted into this component
  TelegramShell.tsx  Telegram root wrapper (init, theme, BackButton ctx)
  BottomNav.tsx      3-tab bottom navigation

src/lib/telegram/
  hooks/useTelegramBackButton.ts   show/hide BackButton + bind handler per page

src/features/sync/
  hooks/useSync.ts             SyncManager React hook
  components/SyncStatus.tsx    last-synced indicator + sync now button
  components/SyncSettings.tsx  full settings section

src/app/layout.tsx             updated: shell selection + Telegram SDK script
src/lib/crypto/index.ts        updated: use createKeyStorage() instead of localStorage directly;
                               isKeyPresent() becomes async
src/app/page.tsx               updated: await isKeyPresent() in useEffect
src/features/settings/components/DangerZone.tsx
                               updated: also clear CloudStorage keys/chunks in Telegram context
src/components/KeyMissingError.tsx
                               updated: also clear CloudStorage in Telegram context

.env.local.example             updated: two new env vars documented
.github/workflows/ci-deploy.yml  updated: pass new env vars at build time
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Existing — subdirectory prefix for GitHub Pages |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Existing — Google Drive OAuth |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Bot username (without @) for deep link construction |
| `NEXT_PUBLIC_TELEGRAM_APP_NAME` | Mini App short name registered with BotFather |

Both new vars are optional — if absent, the "Open in Telegram" button is hidden.

---

## Telegram SDK Script

Added to `src/app/layout.tsx`:

```tsx
<Script
  src="https://telegram.org/js/telegram-web-app.js"
  strategy="beforeInteractive"
/>
```

`beforeInteractive` ensures `window.Telegram.WebApp` is available before any React hydration. The script is a no-op in non-Telegram browsers.

---

## Manual Bot Setup (one-time)

```
1. Message @BotFather → /newbot → choose name + username → receive token
   (token is never needed in the app — discard after setup)

2. /mybots → select bot → Bot Settings → Menu Button
   → set URL to GitHub Pages URL (e.g. https://user.github.io/blood-pressure/)

3. /mybots → select bot → Bot Settings → Configure Mini App → /newapp
   → set short name (NEXT_PUBLIC_TELEGRAM_APP_NAME)
   → set URL to same GitHub Pages URL

4. Add to GitHub repository secrets:
   NEXT_PUBLIC_TELEGRAM_BOT_NAME
   NEXT_PUBLIC_TELEGRAM_APP_NAME
```

---

## TypeScript: Telegram SDK Types

The SDK is not on npm. Declare global types in `src/types/telegram.d.ts`:

```typescript
interface TelegramWebApp {
  ready(): void
  expand(): void
  initDataUnsafe: { user?: { id: number; first_name: string; username?: string } }
  themeParams: ThemeParams
  colorScheme: 'light' | 'dark'
  HapticFeedback: HapticFeedback
  BackButton: { show(): void; hide(): void; onClick(fn: () => void): void; offClick(fn: () => void): void }
  CloudStorage: {
    setItem(key: string, value: string, cb: (err: Error | null) => void): void
    getItem(key: string, cb: (err: Error | null, value: string | null) => void): void
    getItems(keys: string[], cb: (err: Error | null, values: Record<string, string>) => void): void
    removeItem(key: string, cb: (err: Error | null) => void): void
    removeItems(keys: string[], cb: (err: Error | null) => void): void
    getKeys(cb: (err: Error | null, keys: string[]) => void): void
  }
  onEvent(event: string, fn: () => void): void
  offEvent(event: string, fn: () => void): void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}
```

---

## Out of Scope

- Telegram bot handlers (no server, no message processing)
- `sendData()` / `answerWebAppQuery()` flows
- Telegram Stars / payments
- Telegram Login Widget in standalone mode
- Telegram DeviceStorage (CloudStorage is used for the key; DeviceStorage adds no benefit over localStorage for this use case)
- Push notifications via Telegram bot
- Any UI changes to the existing Web shell

---

## Constraints Carried Forward

- No server-side storage. User health data never leaves the device except via explicit user action (CloudStorage sync or Google Drive backup).
- Google Drive backup remains available in both shells.
- The app must be fully functional without any Telegram account.
- Static export (`output: 'export'`) is preserved — no API routes, no SSR.
