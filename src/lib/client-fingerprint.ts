'use client'

const STORAGE_KEY = 'flowfi-client-fp'

function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

/**
 * Stable, non-PII client id for lightweight request correlation / logs.
 * Not a security boundary.
 */
export function getClientFingerprint(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const seed = `${ua}|${Date.now()}|${Math.random().toString(36).slice(2)}`
      id = `fp_${simpleHash(seed)}_${Date.now().toString(36)}`
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return 'fp_unavailable'
  }
}
