/**
 * Client-side category memory using localStorage.
 *
 * Two independent stores:
 *  1. User corrections — description → category (permanent; user intent always wins)
 *  2. AI cache         — description → { category, ts } (expires after 30 days)
 *
 * All keys are normalized (trimmed + lowercased) to match reliably across re-imports.
 */

const MEMORY_KEY = 'flowfi_category_memory_v1'
const AI_CACHE_KEY = 'flowfi_category_ai_cache_v1'
const AI_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type AiCacheEntry = { category: string; ts: number }

function readStore<T = unknown>(key: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, T>
  } catch {
    return {}
  }
}

function writeStore(key: string, store: Record<string, unknown>): void {
  try {
    localStorage.setItem(key, JSON.stringify(store))
  } catch {
    // Storage quota exceeded — fail silently
  }
}

function memKey(description: string): string {
  return description.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// User corrections
// ---------------------------------------------------------------------------

/**
 * Returns the user-corrected category for this description, or null if none stored.
 * Safe to call server-side (returns null when window is absent).
 */
export function getCategoryFromMemory(description: string): string | null {
  if (typeof window === 'undefined') return null
  const store = readStore<string>(MEMORY_KEY)
  const v = store[memKey(description)]
  return typeof v === 'string' ? v : null
}

/**
 * Persist a user-chosen category for this description.
 * Called whenever the user saves a category edit.
 */
export function setCategoryMemory(description: string, category: string): void {
  if (typeof window === 'undefined') return
  const store = readStore<string>(MEMORY_KEY)
  store[memKey(description)] = category.trim().toLowerCase()
  writeStore(MEMORY_KEY, store)
}

// ---------------------------------------------------------------------------
// AI result cache
// ---------------------------------------------------------------------------

/**
 * Returns a cached AI-suggested category, or null if absent / expired.
 */
export function getAiCategoryCache(description: string): string | null {
  if (typeof window === 'undefined') return null
  const store = readStore<AiCacheEntry>(AI_CACHE_KEY)
  const entry = store[memKey(description)]
  if (!entry || typeof entry.category !== 'string') return null
  if (Date.now() - entry.ts > AI_CACHE_TTL_MS) return null
  return entry.category
}

/**
 * Store an AI-suggested category for this description.
 * Callers should reduce displayed confidence slightly when using AI results.
 */
export function setAiCategoryCache(description: string, category: string): void {
  if (typeof window === 'undefined') return
  const store = readStore<AiCacheEntry>(AI_CACHE_KEY)
  store[memKey(description)] = { category: category.trim().toLowerCase(), ts: Date.now() }
  writeStore(AI_CACHE_KEY, store)
}
