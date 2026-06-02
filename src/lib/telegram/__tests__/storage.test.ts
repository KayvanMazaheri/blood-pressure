import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  LocalStorageKeyProvider,
  TelegramCloudKeyProvider,
  createKeyStorage,
} from '../storage'

describe('LocalStorageKeyProvider', () => {
  const provider = new LocalStorageKeyProvider()
  beforeEach(() => localStorage.clear())

  it('getKey returns null when nothing stored', async () => {
    expect(await provider.getKey()).toBeNull()
  })

  it('setKey then getKey returns the value', async () => {
    await provider.setKey('my-jwk')
    expect(await provider.getKey()).toBe('my-jwk')
  })

  it('hasKey returns false before set', async () => {
    expect(await provider.hasKey()).toBe(false)
  })

  it('hasKey returns true after set', async () => {
    await provider.setKey('my-jwk')
    expect(await provider.hasKey()).toBe(true)
  })

  it('removeKey clears the stored value', async () => {
    await provider.setKey('my-jwk')
    await provider.removeKey()
    expect(await provider.getKey()).toBeNull()
  })
})

describe('TelegramCloudKeyProvider', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: {
        CloudStorage: {
          getItem: (key: string, cb: (err: null, val: string) => void) =>
            cb(null, store[key] ?? ''),
          setItem: (
            key: string,
            val: string,
            cb?: (err: null) => void,
          ) => {
            store[key] = val
            cb?.(null)
          },
          removeItem: (key: string, cb?: (err: null) => void) => {
            delete store[key]
            cb?.(null)
          },
        } as unknown as TelegramCloudStorage,
      } as unknown as TelegramWebApp,
    }
  })

  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('getKey returns null when nothing stored', async () => {
    const p = new TelegramCloudKeyProvider()
    expect(await p.getKey()).toBeNull()
  })

  it('setKey then getKey returns the value', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    expect(await p.getKey()).toBe('tg-jwk')
  })

  it('hasKey returns true after set', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    expect(await p.hasKey()).toBe(true)
  })

  it('removeKey clears the stored value', async () => {
    const p = new TelegramCloudKeyProvider()
    await p.setKey('tg-jwk')
    await p.removeKey()
    expect(await p.getKey()).toBeNull()
  })
})

describe('createKeyStorage', () => {
  afterEach(() => {
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('returns LocalStorageKeyProvider outside Telegram', () => {
    expect(createKeyStorage()).toBeInstanceOf(LocalStorageKeyProvider)
  })

  it('returns TelegramCloudKeyProvider inside Telegram', () => {
    ;(window as Window & { Telegram: unknown }).Telegram = {
      WebApp: { initDataUnsafe: { user: { id: 1, first_name: 'T' } } } as unknown as TelegramWebApp,
    }
    expect(createKeyStorage()).toBeInstanceOf(TelegramCloudKeyProvider)
  })
})
