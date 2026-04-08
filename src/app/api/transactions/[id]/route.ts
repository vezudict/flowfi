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
import { parseAndValidateTransactionBody } from '@/lib/validation/sensitive-inputs'

const TX_PER_MINUTE_USER = 10
const TX_PER_MINUTE_IP = 40

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fp = request.headers.get('x-flowfi-fingerprint') ?? ''
  try {
    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
    }

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
      console.warn('[rate-limit] transaction patch', { userId: user.id, ip, fp })
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = parseAndValidateTransactionBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: parsed.data.amount,
        category: parsed.data.category,
        description: parsed.data.description,
        transaction_type: parsed.data.transaction_type,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, user_id, amount, category, description, created_at, transaction_type')
      .single()

    if (error) {
      console.error('[api/transactions PATCH]', error.message)
      return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    console.error('[api/transactions PATCH]', e)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
