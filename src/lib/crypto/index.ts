// src/lib/crypto/index.ts
import { createKeyStorage } from '@/lib/telegram/storage'

let cachedKey: CryptoKey | null = null

export function clearKeyCache(): void {
  cachedKey = null
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const storage = createKeyStorage()
  const stored = await storage.getKey()

  if (stored) {
    const jwk = JSON.parse(stored) as JsonWebKey
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )
    return cachedKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', key)
  await storage.setKey(JSON.stringify(jwk))
  cachedKey = key
  return key
}

export async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), 12)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(data: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(decrypted)
}

export async function isKeyPresent(): Promise<boolean> {
  return createKeyStorage().hasKey()
}
