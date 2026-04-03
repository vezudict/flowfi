import { NextResponse } from 'next/server'
import { PUBLIC_ERROR_TOO_MANY_REQUESTS } from '@/lib/api-public-error'
import { rateLimitConsume, rateLimitKeyAuth } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'

const AUTH_ATTEMPTS_PER_MINUTE = 10

/**
 * Call from the browser before login/signup to enforce per-IP throttling.
 * Does not replace Supabase Auth protections.
 */
export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request)
    const key = rateLimitKeyAuth(ip)
    if (!rateLimitConsume(key, AUTH_ATTEMPTS_PER_MINUTE).allowed) {
      console.warn('[rate-limit] auth attempt', { ip })
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('[api/auth/attempt]', e)
    return new NextResponse(null, { status: 204 })
  }
}
