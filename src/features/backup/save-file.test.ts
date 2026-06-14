import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveTextFile } from './save-file'

/** Define a navigator property that jsdom does not implement natively. */
function defineNav(key: string, value: unknown): void {
  Object.defineProperty(navigator, key, { configurable: true, value })
}

function enterTelegram(): void {
  window.Telegram = { WebApp: { colorScheme: 'dark' } as TelegramWebApp }
}

describe('saveTextFile', () => {
  beforeEach(() => {
    delete window.Telegram
    for (const key of ['share', 'canShare', 'clipboard']) {
      if (Object.getOwnPropertyDescriptor(navigator, key)) {
        delete (navigator as unknown as Record<string, unknown>)[key]
      }
    }
    vi.restoreAllMocks()
  })

  it('uses the native share sheet inside Telegram when files can be shared', async () => {
    enterTelegram()
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined)
    defineNav('canShare', () => true)
    defineNav('share', share)

    const result = await saveTextFile('a,b\n1,2', 'bp.csv', 'text/csv')

    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
    const file = share.mock.calls[0][0].files?.[0]
    expect(file).toBeInstanceOf(File)
    expect(file?.name).toBe('bp.csv')
  })

  it('returns "cancelled" when the user dismisses the share sheet', async () => {
    enterTelegram()
    defineNav('canShare', () => true)
    defineNav('share', vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError')))

    const result = await saveTextFile('x', 'bp.csv', 'text/csv')

    expect(result).toBe('cancelled')
  })

  it('uses an anchor download in the web shell, even when sharing is available', async () => {
    // Not in Telegram: the web shell must keep its existing direct-download behaviour
    // and never invoke the share sheet.
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined)
    defineNav('canShare', () => true)
    defineNav('share', share)
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => {})

    const result = await saveTextFile('x', 'bp.csv', 'text/csv')

    expect(result).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('falls back to the clipboard inside Telegram when sharing is unavailable', async () => {
    enterTelegram()
    defineNav('canShare', () => false)
    const writeText = vi.fn().mockResolvedValue(undefined)
    defineNav('clipboard', { writeText })

    const result = await saveTextFile('the-data', 'bp.csv', 'text/csv')

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('the-data')
  })

  it('falls back to the clipboard inside Telegram when sharing is blocked (non-abort error)', async () => {
    enterTelegram()
    defineNav('canShare', () => true)
    defineNav('share', vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError')))
    const writeText = vi.fn().mockResolvedValue(undefined)
    defineNav('clipboard', { writeText })

    const result = await saveTextFile('the-data', 'bp.csv', 'text/csv')

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('the-data')
  })

  it('returns "failed" when the clipboard fallback also fails', async () => {
    enterTelegram()
    defineNav('canShare', () => false)
    defineNav('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })

    const result = await saveTextFile('x', 'bp.csv', 'text/csv')

    expect(result).toBe('failed')
  })
})
