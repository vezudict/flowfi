import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import {
  buildRateLimitKey,
  rateLimitConsume,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import { computeAnalytics } from '@/lib/transaction-analytics'
import type { Transaction } from '@/lib/transactions'

/** 5 decision requests per user per minute (AI call). */
const DE_PER_MINUTE_USER = 5
/** Aggregate IP cap. */
const DE_PER_MINUTE_IP = 20

const isDev = process.env.NODE_ENV === 'development'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export type DecisionResult = {
  summary: string
  verdict: 'yes' | 'no' | 'depends'
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
  suggestions: string[]
  fallback?: boolean
}

/** djb2-style hash for cache keying. */
function hashString(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(36)
}

/** In-process cache: key → { result, expiresAt } */
const decisionCache = new Map<string, { result: DecisionResult; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached(key: string): DecisionResult | null {
  const entry = decisionCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    decisionCache.delete(key)
    return null
  }
  return entry.result
}

function setCache(key: string, result: DecisionResult): void {
  decisionCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

function buildSystemPrompt(): string {
  return `You are a financial decision engine. Answer using given numbers only. No generic advice. Return structured JSON.`
}

function buildUserPrompt(question: string, ctx: Record<string, unknown>): string {
  return `Question: "${question}"
Data: ${JSON.stringify(ctx)}
Return JSON: {"summary":"one sentence with a number","verdict":"yes"|"no"|"depends","confidence":"low"|"medium"|"high","reasons":["≤3 items, each with a number"],"suggestions":["≤3 actionable items"]}`
}

function fallbackResult(): DecisionResult {
  return {
    summary: 'Not enough financial data to make a decision.',
    verdict: 'depends',
    confidence: 'low',
    reasons: ['You have fewer than 3 transactions on record.'],
    suggestions: ['Add more transactions to get a personalized AI analysis.'],
    fallback: true,
  }
}

function isValidDecisionResult(obj: unknown): obj is DecisionResult {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.summary === 'string' &&
    (o.verdict === 'yes' || o.verdict === 'no' || o.verdict === 'depends') &&
    (o.confidence === 'low' || o.confidence === 'medium' || o.confidence === 'high') &&
    Array.isArray(o.reasons) &&
    Array.isArray(o.suggestions)
  )
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request)
    const auth = await requireUserFromBearer(token)
    if (!auth) {
      return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
    }
    const { user, supabase } = auth
    const ip = getRequestIp(request)

    const userRl = rateLimitConsume(
      buildRateLimitKey('user', user.id, 'decision.engine'),
      DE_PER_MINUTE_USER,
    )
    const ipRl = rateLimitConsume(
      buildRateLimitKey('ip', ip, 'decision.engine'),
      DE_PER_MINUTE_IP,
    )
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const question =
      body && typeof body === 'object' && 'question' in body && typeof (body as Record<string, unknown>).question === 'string'
        ? ((body as Record<string, unknown>).question as string).trim()
        : ''

    if (question.length <= 5) {
      return NextResponse.json({ error: 'Question must be longer than 5 characters.' }, { status: 400 })
    }

    if (isDev) {
      console.log('DECISION INPUT', question)
    }

    // Fetch transactions for the authenticated user
    const { data: rows, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, category, description, created_at, transaction_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (txError) {
      console.error('[decision-engine] transaction fetch error', txError.message)
      return NextResponse.json({ error: 'Failed to load transactions.' }, { status: 500 })
    }

    const transactions = (rows ?? []) as Transaction[]
    const analytics = computeAnalytics(transactions)

    const {
      currentMonthTotal: totalSpending,
      currentMonthIncomeTotal: totalIncome,
      netSavingsThisMonth: netSavings,
      pieByCategory,
      transactionCount,
    } = analytics

    // Sparse data fallback — skip OpenAI call
    if (transactionCount < 3 || totalSpending === 0) {
      if (isDev) console.log('[decision-engine] EARLY EXIT — sparse data', { transactionCount, totalSpending })
      return NextResponse.json(fallbackResult())
    }

    // Compute avg daily spend
    const spendingDays = analytics.dailyInCurrentMonth.filter((d) => d.amount > 0)
    const avgDailySpend =
      spendingDays.length > 0
        ? Math.round((totalSpending / spendingDays.length) * 100) / 100
        : 0

    // Only send the top spending category — not the full breakdown array
    const topCat = pieByCategory[0] ?? null

    const ctx = {
      totalSpending,
      totalIncome,
      netSavings,
      topCategory: topCat ? { name: topCat.name, amount: topCat.value } : null,
      avgDailySpend,
      transactionCount,
    }

    if (isDev) {
      console.log('[decision-engine] CONTEXT', ctx)
    }

    // Cache key: hash of question + key financial values (invalidates when spending changes)
    const cacheKey = hashString(
      `${question}:${totalSpending}:${totalIncome}:${transactionCount}`,
    )
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[decision-engine] OPENAI_API_KEY not set')
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(question, ctx) },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      if (response.status === 429) {
        return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
      }
      throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty OpenAI response')

    if (isDev) {
      console.log('DECISION RESPONSE', content)
    }

    const parsed: unknown = JSON.parse(content)
    if (!isValidDecisionResult(parsed)) {
      throw new Error('Unexpected OpenAI response shape')
    }

    // Enforce string arrays, cap at 3 items each
    const result: DecisionResult = {
      summary: parsed.summary,
      verdict: parsed.verdict,
      confidence: parsed.confidence,
      reasons: ((parsed.reasons as unknown[]).filter((r) => typeof r === 'string') as string[]).slice(0, 3),
      suggestions: ((parsed.suggestions as unknown[]).filter((s) => typeof s === 'string') as string[]).slice(0, 3),
    }

    setCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[decision-engine] ERROR', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
