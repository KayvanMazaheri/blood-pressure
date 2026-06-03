import { describe, it, expect, afterEach } from 'vitest'
import { isTelegram, getTelegramUser, getTelegramWebApp } from '../context'

describe('isTelegram', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns false when window.Telegram is absent', () => {
    expect(isTelegram()).toBe(false)
  })

  it('returns false when initDataUnsafe.user is absent', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: {} } as unknown as TelegramWebApp,
    }
    expect(isTelegram()).toBe(false)
  })

  it('returns true when user is present in initDataUnsafe', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {
        initDataUnsafe: { user: { id: 1, first_name: 'Test' } },
      } as unknown as TelegramWebApp,
    }
    expect(isTelegram()).toBe(true)
  })
})

describe('getTelegramUser', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns null when not in Telegram', () => {
    expect(getTelegramUser()).toBeNull()
  })

  it('returns user object when in Telegram', () => {
    const user = { id: 42, first_name: 'Alice', username: 'alice' }
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: { user } } as unknown as TelegramWebApp,
    }
    expect(getTelegramUser()).toEqual(user)
  })
})

describe('getTelegramWebApp', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns null when window.Telegram is absent', () => {
    expect(getTelegramWebApp()).toBeNull()
  })

  it('returns WebApp when present', () => {
    const webApp = {
      initDataUnsafe: { user: { id: 1, first_name: 'T' } },
    } as unknown as TelegramWebApp
    ;(window as Window & { Telegram: unknown }).Telegram = { WebApp: webApp }
    expect(getTelegramWebApp()).toBe(webApp)
  })
})
