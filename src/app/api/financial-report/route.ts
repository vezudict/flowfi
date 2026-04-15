import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { buildRateLimitKey, rateLimitConsume } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import { computeAnalytics } from '@/lib/transaction-analytics'
import type { Transaction } from '@/lib/transactions'

const PER_MINUTE_USER = 5
const PER_MINUTE_IP = 20
const MODEL = 'gpt-4o-mini'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/** djb2 hash */
function hashString(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(36)
}

function monthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const reportCache = new Map<string, { report: FinancialReport; expiresAt: number }>()

function getCached(key: string): FinancialReport | null {
  const entry = reportCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { reportCache.delete(key); return null }
  return entry.report
}

function setCache(key: string, report: FinancialReport): void {
  reportCache.set(key, { report, expiresAt: Date.now() + CACHE_TTL_MS })
}

export type FinancialReport = {
  summary: string
  spendingAnalysis: string
  incomeAnalysis: string
  risks: string[]
  opportunities: string[]
  recommendations: string[]
  generatedAt: string
  fallback?: boolean
}

function fallbackReport(reason: string): FinancialReport {
  return {
    summary: 'Not enough transaction data to generate a meaningful report.',
    spendingAnalysis: reason,
    incomeAnalysis: 'Add income transactions to get income analysis.',
    risks: ['Insufficient data — results may not reflect your real financial picture.'],
    opportunities: ['Import more transactions to unlock AI-powered insights.'],
    recommendations: ['Add at least 5 transactions to get a personalized financial report.'],
    generatedAt: new Date().toISOString(),
    fallback: true,
  }
}

function buildSystemPrompt(): string {
  return `You are a financial analyst generating a monthly financial report.

RULES:
- Use ONLY the provided data — no generic advice
- Include specific numbers in every section
- Be structured, clear, and concise
- risks and opportunities must be specific to the data
- NO filler phrases like "consider your finances carefully"

Respond ONLY with valid JSON matching the exact schema specified.`
}

function buildUserPrompt(ctx: Record<string, unknown>): string {
  return `Generate a monthly financial report for this user.

Financial data:
${JSON.stringify(ctx, null, 2)}

Return a JSON object with this EXACT shape (no extra fields):
{
  "summary": "1–2 sentence overall financial health assessment with specific numbers",
  "spendingAnalysis": "1–2 sentence key spending insight with amounts and categories",
  "incomeAnalysis": "1–2 sentence income stability/trend insight with amounts",
  "risks": ["specific risk with a number", "specific risk with a number"],
  "opportunities": ["specific opportunity with a number", "specific opportunity with a number"],
  "recommendations": ["clear actionable step", "clear actionable step", "clear actionable step"]
}`
}

function isValidReport(obj: unknown): obj is Omit<FinancialReport, 'generatedAt'> {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.summary === 'string' &&
    typeof o.spendingAnalysis === 'string' &&
    typeof o.incomeAnalysis === 'string' &&
    Array.isArray(o.risks) &&
    Array.isArray(o.opportunities) &&
    Array.isArray(o.recommendations)
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

    const userRl = rateLimitConsume(buildRateLimitKey('user', user.id, 'financial.report'), PER_MINUTE_USER)
    const ipRl = rateLimitConsume(buildRateLimitKey('ip', ip, 'financial.report'), PER_MINUTE_IP)
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    // Fetch transactions
    const { data: rows, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, category, description, created_at, transaction_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (txError) {
      return NextResponse.json({ error: 'Failed to load transactions.' }, { status: 500 })
    }

    const transactions = (rows ?? []) as Transaction[]

    // Sparse data fallback
    if (transactions.length < 5) {
      return NextResponse.json(fallbackReport(`You have ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} — add more to unlock AI analysis.`))
    }

    const analytics = computeAnalytics(transactions)
    const {
      currentMonthTotal: totalSpending,
      currentMonthIncomeTotal: totalIncome,
      netSavingsThisMonth: netSavings,
      pieByCategory,
      transactionCount,
      topCategory,
      previousMonthIncomeTotal,
    } = analytics

    const spendingDays = analytics.dailyInCurrentMonth.filter((d) => d.amount > 0)
    const avgDailySpend = spendingDays.length > 0
      ? Math.round((totalSpending / spendingDays.length) * 100) / 100
      : 0

    const ctx = {
      month: monthKey(),
      totalSpending,
      totalIncome,
      netSavings,
      avgDailySpend,
      transactionCount,
      topCategory,
      previousMonthIncome: previousMonthIncomeTotal,
      categoryBreakdown: pieByCategory.slice(0, 6),
    }

    const cacheKey = hashString(`${user.id}:${monthKey()}:${totalSpending}:${totalIncome}:${transactionCount}`)
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
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
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(ctx) },
        ],
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
      }
      throw new Error(`OpenAI ${response.status}`)
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty OpenAI response')

    const parsed: unknown = JSON.parse(content)
    if (!isValidReport(parsed)) {
      throw new Error('Unexpected OpenAI response shape')
    }

    const report: FinancialReport = {
      summary: parsed.summary,
      spendingAnalysis: parsed.spendingAnalysis,
      incomeAnalysis: parsed.incomeAnalysis,
      risks: (parsed.risks as unknown[]).filter((r) => typeof r === 'string') as string[],
      opportunities: (parsed.opportunities as unknown[]).filter((o) => typeof o === 'string') as string[],
      recommendations: (parsed.recommendations as unknown[]).filter((r) => typeof r === 'string') as string[],
      generatedAt: new Date().toISOString(),
    }

    setCache(cacheKey, report)
    return NextResponse.json(report)
  } catch (err) {
    console.error('[financial-report] ERROR', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
