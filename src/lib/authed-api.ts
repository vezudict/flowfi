'use client'

import { supabase } from '@/lib/supabase'
import { PUBLIC_ERROR_GENERIC } from '@/lib/api-public-error'
import { getClientFingerprint } from '@/lib/client-fingerprint'

export async function authedFetch(
  input: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return new Response(JSON.stringify({ error: 'You must be signed in.' }), { status: 401 })
  }
  const { json, headers: initHeaders, ...rest } = init
  const headers = new Headers(initHeaders)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  headers.set('x-flowfi-fingerprint', getClientFingerprint())
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    rest.body = JSON.stringify(json)
  }
  // FormData: let the runtime set multipart boundary (never send application/json or manual Content-Type).
  if (rest.body instanceof FormData) {
    headers.delete('Content-Type')
  }
  return fetch(input, { ...rest, headers })
}

export async function readAuthedJson<T>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    return { ok: false, message: PUBLIC_ERROR_GENERIC }
  }
  if (!res.ok) {
    const msg =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error: string }).error === 'string'
        ? (parsed as { error: string }).error
        : PUBLIC_ERROR_GENERIC
    return { ok: false, message: msg }
  }
  return { ok: true, data: parsed as T }
}

/** Fire-and-forget auth throttle check before Supabase password auth. */
export async function preflightAuthAttempt(): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/auth/attempt', {
    method: 'POST',
    headers: { 'x-flowfi-fingerprint': getClientFingerprint() },
  })
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    const msg =
      typeof body?.error === 'string' ? body.error : 'Too many attempts. Try again in a minute.'
    console.warn('[auth] rate limited', { status: res.status })
    return { ok: false, message: msg }
  }
  if (!res.ok) {
    console.warn('[auth] preflight unexpected', res.status)
    return { ok: true }
  }
  return { ok: true }
}
