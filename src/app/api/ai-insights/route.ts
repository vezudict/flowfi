import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { generateAIInsights, type AIInsight, type InsightsSummary } from '@/lib/ai-insights'
import type { AnalyticsBundle } from '@/lib/transaction-analytics'
import {
  buildRateLimitKey,
  rateLimitConsume,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'

/** Allow 10 AI insight requests per user per minute (cache means most are DB reads). */
const AI_PER_MINUTE_USER = 10
/** Aggregate IP cap to prevent mass scraping. */
const AI_PER_MINUTE_IP = 30

const isDev = process.env.NODE_ENV === 'development'

function monthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Lightweight djb2-style hash of key analytics values.
 * Used to bust the cache when spending behavior changes within a month.
 */
function hashAnalytics(analytics: AnalyticsBundle): string {
  const str = JSON.stringify({
    t: analytics.currentMonthTotal,
    i: analytics.currentMonthIncomeTotal,
    c: analytics.transactionCount,
  })
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(36)
}

function buildSummary(analytics: AnalyticsBundle, currency: string): InsightsSummary {
  // Compute average daily spend from days that had any spending
  const spendingDays = analytics.dailyInCurrentMonth.filter((d) => d.amount > 0)
  const avgDailySpend =
    spendingDays.length > 0
      ? Math.round((analytics.currentMonthTotal / spendingDays.length) * 100) / 100
      : 0

  // Unusual spikes: days with spending more than 2x the daily average
  const unusualSpikes = analytics.dailyInCurrentMonth
    .filter((d) => d.amount > avgDailySpend * 2 && d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  return {
    totalSpending: analytics.currentMonthTotal,
    totalIncome: analytics.currentMonthIncomeTotal,
    netSavings: analytics.netSavingsThisMonth,
    topCategory: analytics.topCategory,
    topCategoryAmount: analytics.topCategory?.amount ?? null,
    categoryBreakdown: analytics.pieByCategory.slice(0, 5),
    unusualSpikes,
    transactionCount: analytics.transactionCount,
    avgDailySpend,
    previousMonthIncome: analytics.previousMonthIncomeTotal,
    currency,
  }
}

function isAIInsightArray(items: unknown[]): items is AIInsight[] {
  return items.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      typeof (item as Record<string, unknown>).description === 'string',
  )
}

export async function POST(request: Request) {
  try {
    console.log('🚀 API HIT: /api/ai-insights')
    const token = getBearerToken(request)
    const auth = await requireUserFromBearer(token)
    if (!auth) {
      return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
    }
    const { user, supabase } = auth
    const ip = getRequestIp(request)

    const userRl = rateLimitConsume(
      buildRateLimitKey('user', user.id, 'ai.insights'),
      AI_PER_MINUTE_USER,
    )
    const ipRl = rateLimitConsume(
      buildRateLimitKey('ip', ip, 'ai.insights'),
      AI_PER_MINUTE_IP,
    )
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    const body = (await request.json()) as { analytics?: AnalyticsBundle; currency?: string }
    const analytics = body.analytics
    const currency = typeof body.currency === 'string' ? body.currency : 'USD'

    if (!analytics || typeof analytics !== 'object') {
      return NextResponse.json({ error: 'analytics required' }, { status: 400 })
    }

    console.log('📊 Incoming analytics:', analytics)
    console.log('🤖 Using model:', process.env.OPENAI_MODEL || 'gpt-4o-mini')

    const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    // Cache key includes analytics hash so insights refresh when spending changes
    const key = `${monthKey(new Date())}:${hashAnalytics(analytics)}`

    // Cache read
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('insights')
      .eq('user_id', user.id)
      .eq('month_key', key)
      .maybeSingle()

    if (cached?.insights) {
      const raw = cached.insights
      // Only serve cache if it contains structured AIInsight objects (not legacy string[])
      const insights = Array.isArray(raw) && raw.length > 0 && isAIInsightArray(raw) ? raw : null
      if (insights) {
        return NextResponse.json({ insights, cached: true, debug_model: MODEL })
      }
    }

    // Generate fresh
    const summary = buildSummary(analytics, currency)
    if (isDev) {
      console.log('AI SUMMARY BUILT', summary)
    }
    console.log('🔥 AI MODEL USED:', MODEL)
    const insights = await generateAIInsights(summary, MODEL)

    // Upsert cache
    await supabase.from('ai_insights_cache').upsert(
      { user_id: user.id, month_key: key, insights },
      { onConflict: 'user_id,month_key' },
    )

    return NextResponse.json({ insights, cached: false, debug_model: MODEL })
  } catch (err) {
    console.error('AI ROUTE ERROR', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
