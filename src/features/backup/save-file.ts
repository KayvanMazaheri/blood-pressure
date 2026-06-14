import { isTelegram } from '@/lib/telegram/context'

export type SaveResult = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'

/**
 * Save a text payload to the user's device.
 *
 * In the normal web shell a `<a download>` click works, so we keep using it. Inside
 * Telegram's WebViews (Android + Desktop) that same click is a silent no-op, so there we
 * try, in order:
 *
 *   1. `navigator.share({ files })` — native sheet; keeps health data on-device.
 *   2. clipboard — last resort, so the export is never silently lost.
 */
export async function saveTextFile(
  text: string,
  filename: string,
  mime: string
): Promise<SaveResult> {
  if (!isTelegram()) {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  }

  const file = new File([text], filename, { type: mime })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      // User dismissed the share sheet — treat as a no-op, not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Any other rejection (e.g. sharing blocked) falls through to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
