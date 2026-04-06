import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_GENERIC,
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import {
  rateLimitConsumeDual,
  rateLimitKeyTransactionIp,
  rateLimitKeyTransactionUser,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import { parseAndValidateBulkTransactionDelete } from '@/lib/validation/sensitive-inputs'

const TX_PER_MINUTE_USER = 10
const TX_PER_MINUTE_IP = 40

export async function DELETE(request: Request) {
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
      userKey: rateLimitKeyTransactionUser(user.id),
      userMax: TX_PER_MINUTE_USER,
      ipKey: rateLimitKeyTransactionIp(ip),
      ipMax: TX_PER_MINUTE_IP,
    })
    if (!rl.allowed) {
      console.warn('[rate-limit] transaction bulk delete', { userId: user.id, ip, fp })
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = parseAndValidateBulkTransactionDelete(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .in('id', parsed.ids)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('[api/transactions/bulk DELETE]', error.message)
      return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
    }

    return NextResponse.json({ count: data?.length ?? 0 })
  } catch (e) {
    console.error('[api/transactions/bulk DELETE]', e)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
