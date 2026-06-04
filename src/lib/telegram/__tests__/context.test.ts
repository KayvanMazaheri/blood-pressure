import { describe, it, expect, afterEach } from 'vitest'
import { isTelegram, getTelegramUser, getTelegramWebApp } from '../context'

describe('isTelegram', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns false when window.Telegram is absent', () => {
    expect(isTelegram()).toBe(false)
  })

  it('returns false when WebApp has no colorScheme', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {} as unknown as TelegramWebApp,
    }
    expect(isTelegram()).toBe(false)
  })

  it('returns true when colorScheme is light (no user required)', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { colorScheme: 'light', initDataUnsafe: {} } as unknown as TelegramWebApp,
    }
    expect(isTelegram()).toBe(true)
  })

  it('returns true when colorScheme is dark', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { colorScheme: 'dark', initDataUnsafe: {} } as unknown as TelegramWebApp,
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
