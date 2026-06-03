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
      buttons: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
      ],
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
