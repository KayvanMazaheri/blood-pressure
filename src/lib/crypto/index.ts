const KEY_STORAGE_KEY = 'bp_enc_key'
let cachedKey: CryptoKey | null = null

export function clearKeyCache() {
  cachedKey = null
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const stored = localStorage.getItem(KEY_STORAGE_KEY)
  if (stored) {
    const jwk = JSON.parse(stored) as JsonWebKey
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    return cachedKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const jwk = await crypto.subtle.exportKey('jwk', key)
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(jwk))
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
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

export function isKeyPresent(): boolean {
  return localStorage.getItem(KEY_STORAGE_KEY) !== null
}
