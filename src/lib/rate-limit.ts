/**
 * In-memory key–value rate limiting (fixed time windows, per Node process).
 * Keys reset automatically when `now >= resetAt`. Each store entry is independent.
 *
 * For authenticated mutations, use `rateLimitConsumeDual` (per-user AND per-IP caps).
 * Auth-only routes use a single IP key (no user yet).
 *
 * At scale, replace the Map with Redis / Upstash using the same key format.
 */

export type RateLimitScope = 'user' | 'ip'

/** Single bucket: count of allowed requests within the current window. */
export type RateLimitEntry = {
  count: number
  /** When this window started (ms since epoch). */
  windowStartedAt: number
  /** First instant after the window ends; `now >= resetAt` starts a fresh window. */
  resetAt: number
}

const DEFAULT_WINDOW_MS = 60_000

/** Bounded in-memory KV: rate limit key → current window state */
const store = new Map<string, RateLimitEntry>()

/** Drop expired entries occasionally so the map cannot grow without bound. */
const PRUNE_TTL_AFTER_RESET_MS = 5 * 60_000
const PRUNE_EVERY_N_CALLS = 200
let callsSincePrune = 0

function pruneStale(now: number) {
  callsSincePrune += 1
  if (callsSincePrune < PRUNE_EVERY_N_CALLS && store.size < 5000) return
  callsSincePrune = 0
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt + PRUNE_TTL_AFTER_RESET_MS) {
      store.delete(key)
    }
  }
}

function normalizeWindow(entry: RateLimitEntry | undefined, now: number, windowMs: number): RateLimitEntry {
  if (!entry || now >= entry.resetAt) {
    return {
      count: 0,
      windowStartedAt: now,
      resetAt: now + windowMs,
    }
  }
  return entry
}

/**
 * Current utilisation without consuming a slot (for dual checks).
 */
export function rateLimitPeek(
  key: string,
  maxPerWindow: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now()
  const entry = normalizeWindow(store.get(key), now, windowMs)
  const allowed = entry.count < maxPerWindow
  return { allowed, count: entry.count, resetAt: entry.resetAt }
}

/**
 * Consume one slot if under the limit for the current window; otherwise deny.
 */
export function rateLimitConsume(
  key: string,
  maxPerWindow: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  pruneStale(now)

  let entry = normalizeWindow(store.get(key), now, windowMs)
  if (entry.count >= maxPerWindow) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry = {
    ...entry,
    count: entry.count + 1,
  }
  store.set(key, entry)
  const remaining = Math.max(0, maxPerWindow - entry.count)
  return { allowed: true, remaining, resetAt: entry.resetAt }
}

/**
 * Per-user AND per-IP limits: both must have capacity; then both are incremented together.
 * Prevents one IP from exhausting many accounts and enforces fair per-user caps.
 */
export function rateLimitConsumeDual(params: {
  userKey: string
  userMax: number
  ipKey: string
  ipMax: number
  windowMs?: number
}): { allowed: boolean; resetAtUser: number; resetAtIp: number } {
  const windowMs = params.windowMs ?? DEFAULT_WINDOW_MS
  const now = Date.now()
  pruneStale(now)

  const u = normalizeWindow(store.get(params.userKey), now, windowMs)
  const i = normalizeWindow(store.get(params.ipKey), now, windowMs)

  if (u.count >= params.userMax || i.count >= params.ipMax) {
    return { allowed: false, resetAtUser: u.resetAt, resetAtIp: i.resetAt }
  }

  const nextU = { ...u, count: u.count + 1 }
  const nextI = { ...i, count: i.count + 1 }
  store.set(params.userKey, nextU)
  store.set(params.ipKey, nextI)

  return { allowed: true, resetAtUser: nextU.resetAt, resetAtIp: nextI.resetAt }
}

/** @deprecated Prefer `rateLimitConsume(...).allowed` — kept for minimal call-site churn. */
export function rateLimitAllow(key: string, maxPerWindow: number, windowMs?: number): boolean {
  return rateLimitConsume(key, maxPerWindow, windowMs).allowed
}

/** Stable key: scope separates user id vs client IP. */
export function buildRateLimitKey(
  scope: RateLimitScope,
  id: string,
  action: string,
): string {
  const safeId = id.slice(0, 256)
  const safeAction = action.replace(/[^a-z0-9._-]/gi, '_').slice(0, 64)
  return `rl:${scope}:${safeId}:${safeAction}`
}

// --- Preset actions (single key helpers) ---

export function rateLimitKeyAuth(ip: string): string {
  return buildRateLimitKey('ip', ip, 'auth.attempt')
}

export function rateLimitKeyTransactionUser(userId: string): string {
  return buildRateLimitKey('user', userId, 'tx.mutate')
}

export function rateLimitKeyTransactionIp(ip: string): string {
  return buildRateLimitKey('ip', ip, 'tx.mutate')
}

export function rateLimitKeyImportUser(userId: string): string {
  return buildRateLimitKey('user', userId, 'tx.import')
}

export function rateLimitKeyImportIp(ip: string): string {
  return buildRateLimitKey('ip', ip, 'tx.import')
}

export function rateLimitKeyBudgetUser(userId: string): string {
  return buildRateLimitKey('user', userId, 'profile.budget')
}

export function rateLimitKeyBudgetIp(ip: string): string {
  return buildRateLimitKey('ip', ip, 'profile.budget')
}

export function rateLimitKeyCurrencyUser(userId: string): string {
  return buildRateLimitKey('user', userId, 'profile.currency')
}

export function rateLimitKeyCurrencyIp(ip: string): string {
  return buildRateLimitKey('ip', ip, 'profile.currency')
}
