import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt, clearKeyCache } from './index'

// jsdom provides crypto.subtle via Web Crypto API polyfill in Node 20+
describe('crypto', () => {
  beforeEach(() => {
    localStorage.clear()
    clearKeyCache()
  })

  it('encrypts and decrypts a string', async () => {
    const original = JSON.stringify({ systolic: 128, diastolic: 84 })
    const ciphertext = await encrypt(original)
    expect(ciphertext).not.toBe(original)
    const plaintext = await decrypt(ciphertext)
    expect(plaintext).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const data = 'hello'
    const a = await encrypt(data)
    const b = await encrypt(data)
    expect(a).not.toBe(b)
  })

  it('persists the key in localStorage across calls', async () => {
    await encrypt('test')
    const key1 = localStorage.getItem('bp_enc_key')
    clearKeyCache()
    await encrypt('test2')
    const key2 = localStorage.getItem('bp_enc_key')
    expect(key1).toBe(key2)
  })
})
