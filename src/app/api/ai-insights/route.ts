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

function monthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function buildSummary(analytics: AnalyticsBundle, currency: string): InsightsSummary {
  const categoryBreakdown: Record<string, number> = {}
  for (const { name, value } of analytics.pieByCategory) {
    categoryBreakdown[name] = value
  }
  return {
    totalSpending: analytics.currentMonthTotal,
    totalIncome: analytics.currentMonthIncomeTotal,
    netSavings: analytics.netSavingsThisMonth,
    topCategory: analytics.topCategory,
    categoryBreakdown,
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

    const key = monthKey(new Date())

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
        return NextResponse.json({ insights, cached: true })
      }
    }

    // Generate fresh
    const summary = buildSummary(analytics, currency)
    const insights = await generateAIInsights(summary)

    // Upsert cache
    await supabase.from('ai_insights_cache').upsert(
      { user_id: user.id, month_key: key, insights },
      { onConflict: 'user_id,month_key' },
    )

    return NextResponse.json({ insights, cached: false })
  } catch (err) {
    console.error('AI ROUTE ERROR', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
