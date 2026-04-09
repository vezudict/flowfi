import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { buildRateLimitKey, rateLimitConsumeDual } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'

/** 5 AI categorize calls per user per minute (client caches results in localStorage). */
const CAT_PER_MINUTE_USER = 5
/** Aggregate IP cap. */
const CAT_PER_MINUTE_IP = 20

const VALID_CATEGORIES = [
  'food',
  'transport',
  'entertainment',
  'subscriptions',
  'utilities',
  'shopping',
  'transfer',
  'income',
  'other',
] as const

type ValidCategory = (typeof VALID_CATEGORIES)[number]

function isValidCategory(s: string): s is ValidCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(s)
}

export async function POST(req: Request) {
  // Auth
  const token = getBearerToken(req)
  if (!token) {
    return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
  }
  const auth = await requireUserFromBearer(token)
  if (!auth) {
    return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
  }
  const userId = auth.user.id

  // Rate limit
  const ip = getRequestIp(req)
  const { allowed } = rateLimitConsumeDual({
    userKey: buildRateLimitKey('user', userId, 'categorize'),
    userMax: CAT_PER_MINUTE_USER,
    ipKey: buildRateLimitKey('ip', ip, 'categorize'),
    ipMax: CAT_PER_MINUTE_IP,
  })
  if (!allowed) {
    return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
  }

  // Body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).description !== 'string'
  ) {
    return NextResponse.json({ error: 'description is required.' }, { status: 400 })
  }

  const description = ((body as Record<string, unknown>).description as string).trim()
  if (!description || description.length < 2) {
    return NextResponse.json({ category: 'other', confidence: 0.5 })
  }
  if (description.length > 200) {
    return NextResponse.json({ error: 'description too long.' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ category: 'other', confidence: 0.5 })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: `Categorize this bank transaction description into exactly one of these categories: food, transport, entertainment, subscriptions, utilities, shopping, transfer, income, other.

Description: "${description}"

Reply with ONLY the category name, nothing else.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ category: 'other', confidence: 0.5 })
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const raw = data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? 'other'
    const category: ValidCategory = isValidCategory(raw) ? raw : 'other'

    // Confidence: AI result is slightly less certain than rules — score it 0.75
    const confidence = category === 'other' ? 0.4 : 0.75

    return NextResponse.json({ category, confidence })
  } catch {
    // Graceful fallback — do not leak errors to client
    return NextResponse.json({ category: 'other', confidence: 0.5 })
  }
}
