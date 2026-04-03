import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_GENERIC,
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import {
  rateLimitConsumeDual,
  rateLimitKeyCurrencyIp,
  rateLimitKeyCurrencyUser,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import { parseAndValidateCurrencyBody } from '@/lib/validation/sensitive-inputs'

const CURRENCY_PER_MINUTE_USER = 20
const CURRENCY_PER_MINUTE_IP = 80

export async function PATCH(request: Request) {
  const fp = request.headers.get('x-flowfi-fingerprint') ?? ''
  try {
    const token = getBearerToken(request)
    const auth = await requireUserFromBearer(token)
    if (!auth) {
      return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
    }
    const { user, supabase } = auth
    const ip = getRequestIp(request)
    const rl = rateLimitConsumeDual({
      userKey: rateLimitKeyCurrencyUser(user.id),
      userMax: CURRENCY_PER_MINUTE_USER,
      ipKey: rateLimitKeyCurrencyIp(ip),
      ipMax: CURRENCY_PER_MINUTE_IP,
    })
    if (!rl.allowed) {
      console.warn('[rate-limit] currency', { userId: user.id, ip, fp })
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = parseAndValidateCurrencyBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ preferred_currency: parsed.data })
      .eq('id', user.id)

    if (error) {
      console.error('[api/profile/currency]', error.message)
      return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/profile/currency]', e)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
