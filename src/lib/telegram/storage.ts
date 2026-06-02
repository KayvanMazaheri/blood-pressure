import { isTelegram } from './context'

export interface KeyStorage {
  getKey(): Promise<string | null>
  setKey(key: string): Promise<void>
  removeKey(): Promise<void>
  hasKey(): Promise<boolean>
}

export class LocalStorageKeyProvider implements KeyStorage {
  private readonly storageKey = 'bp_enc_key'

  async getKey(): Promise<string | null> {
    return localStorage.getItem(this.storageKey)
  }

  async setKey(key: string): Promise<void> {
    localStorage.setItem(this.storageKey, key)
  }

  async removeKey(): Promise<void> {
    localStorage.removeItem(this.storageKey)
  }

  async hasKey(): Promise<boolean> {
    return localStorage.getItem(this.storageKey) !== null
  }
}

export class TelegramCloudKeyProvider implements KeyStorage {
  private readonly storageKey = 'bp_enc_key'

  async getKey(): Promise<string | null> {
    return new Promise((resolve) => {
      window.Telegram!.WebApp.CloudStorage.getItem(this.storageKey, (err, val) =>
        resolve(err ? null : val || null),
      )
    })
  }

  async setKey(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.setItem(this.storageKey, key, (err) =>
        err ? reject(err) : resolve(),
      )
    })
  }

  async removeKey(): Promise<void> {
    return new Promise((resolve, reject) => {
      window.Telegram!.WebApp.CloudStorage.removeItem(this.storageKey, (err) =>
        err ? reject(err) : resolve(),
      )
    })
  }

  async hasKey(): Promise<boolean> {
    const key = await this.getKey()
    return key !== null
  }
}

export function createKeyStorage(): KeyStorage {
  return isTelegram() ? new TelegramCloudKeyProvider() : new LocalStorageKeyProvider()
}
