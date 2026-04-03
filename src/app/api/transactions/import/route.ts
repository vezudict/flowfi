import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_GENERIC,
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import {
  rateLimitConsumeDual,
  rateLimitKeyImportIp,
  rateLimitKeyImportUser,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import { parseAndValidateImportBody } from '@/lib/validation/sensitive-inputs'

const IMPORT_PER_MINUTE_USER = 10
const IMPORT_PER_MINUTE_IP = 30

export async function POST(request: Request) {
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
      userKey: rateLimitKeyImportUser(user.id),
      userMax: IMPORT_PER_MINUTE_USER,
      ipKey: rateLimitKeyImportIp(ip),
      ipMax: IMPORT_PER_MINUTE_IP,
    })
    if (!rl.allowed) {
      console.warn('[rate-limit] import', { userId: user.id, ip, fp })
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = parseAndValidateImportBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 })
    }

    const payload = parsed.data.map((r) => ({
      user_id: user.id,
      amount: r.amount,
      category: r.category,
      description: r.description,
      created_at: r.createdAt,
    }))

    const { error } = await supabase.from('transactions').insert(payload)
    if (error) {
      console.error('[api/transactions/import]', error.message)
      return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
    }

    return NextResponse.json({ count: payload.length })
  } catch (e) {
    console.error('[api/transactions/import]', e)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
