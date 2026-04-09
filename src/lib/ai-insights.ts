/**
 * AI-powered financial insights via OpenAI.
 * Called server-side only (Route Handler). Never import in client components.
 */

export type InsightsSummary = {
  totalSpending: number
  totalIncome: number
  netSavings: number
  topCategory: { category: string; amount: number } | null
  topCategoryAmount: number | null
  /** Top 5 spending categories by amount */
  categoryBreakdown: { name: string; value: number }[]
  /** Days with spending > 2x avg daily — top 3 spikes */
  unusualSpikes: { label: string; amount: number }[]
  transactionCount: number
  avgDailySpend: number
  previousMonthIncome: number
  currency: string
}

export type AIInsight = {
  title: string
  description: string
  type: 'spending' | 'income' | 'alert' | 'opportunity'
  priority: 'high' | 'medium' | 'low'
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const isDev = process.env.NODE_ENV === 'development'

/** Words that signal vague, uncommitted, or benchmark-driven phrasing. */
const WEAK_WORDS = ['consider', 'might', 'could', 'typically', 'average user', 'benchmark']

function sparseFallbackInsights(): AIInsight[] {
  return [
    {
      title: 'Not enough data yet',
      description: 'Add more transactions this month to unlock personalized AI insights.',
      type: 'alert',
      priority: 'low',
    },
  ]
}

function rateLimitFallbackInsights(): AIInsight[] {
  return [
    {
      title: 'Rate limit reached',
      description: 'AI insights are temporarily unavailable. Check back in a moment.',
      type: 'alert',
      priority: 'low',
    },
  ]
}

/**
 * Drop insights whose description contains weak, vague, or hallucination-prone phrasing.
 * Logs dropped items in dev mode. Keeps at least 1 insight even if all would be filtered.
 */
function filterWeakInsights(items: AIInsight[]): AIInsight[] {
  const strong = items.filter((item) => {
    const lower = item.description.toLowerCase()
    const weak = WEAK_WORDS.some((w) => lower.includes(w))
    if (weak && isDev) {
      console.warn('AI INSIGHT DROPPED (weak phrasing):', item.title, '—', item.description)
    }
    return !weak
  })
  // Never return empty — fall back to unfiltered set if all were dropped
  return strong.length > 0 ? strong : items
}

function buildPrompt(summary: InsightsSummary): string {
  // Step 3 — pre-computed ratios so AI doesn't need to derive them
  const savingsRate =
    summary.totalIncome > 0
      ? Math.round((summary.netSavings / summary.totalIncome) * 1000) / 10
      : null

  const topCategoryRatio =
    summary.totalSpending > 0 && summary.topCategoryAmount != null
      ? Math.round((summary.topCategoryAmount / summary.totalSpending) * 1000) / 10
      : null

  const ctx = {
    total_spending: summary.totalSpending,
    total_income: summary.totalIncome,
    net_savings: summary.netSavings,
    savings_rate_pct: savingsRate,
    top_category: summary.topCategory?.category ?? null,
    top_category_amount: summary.topCategoryAmount,
    top_category_ratio_pct: topCategoryRatio,
    category_breakdown: summary.categoryBreakdown,
    unusual_spikes: summary.unusualSpikes,
    transaction_count: summary.transactionCount,
    avg_daily_spend: summary.avgDailySpend,
    previous_month_income: summary.previousMonthIncome,
    currency: summary.currency,
  }

  if (isDev) {
    console.log('AI CONTEXT', JSON.stringify(ctx, null, 2))
  }

  // Step 7 — force a spike insight when data shows one
  const spikeInstruction =
    ctx.unusual_spikes.length > 0
      ? `\nREQUIRED: One insight MUST specifically address the spending spike(s) in unusual_spikes — cite the exact date(s) and amount(s).`
      : ''

  return `You are a premium fintech intelligence engine.

Rules:
- NO generic advice. NEVER say "save more", "spend less", "track your spending"
- NO external benchmarks. NEVER reference "typical users", "average income bracket", or anything not in the data
- ONLY use numbers provided in the financial data below
- Every insight MUST include a measurable impact expressed as a currency amount or percentage
- Focus on decisions, not descriptions${spikeInstruction}

Each insight must do all three:
1. Identify the specific issue or opportunity (with the exact number)
2. Quantify the impact (e.g., "represents 42% of spending" or "saving ₹800 more/month")
3. Suggest a concrete, specific action (not "reduce" — name the category, name a target amount)

Example of BAD insight: "Consider reducing shopping expenses to save more."
Example of GOOD insight: "Shopping at ₹3,300 takes up 38% of total spending. Cutting to ₹2,500 would lift net savings by ₹800 — an 18% improvement."

Tone: Confident, analytical, no fluff. Sound like CRED or Copilot Money.

Return a JSON object:
{
  "insights": [
    {
      "title": "Short punchy headline (max 6 words)",
      "description": "Current state with exact number → impact → specific action",
      "type": "spending" | "income" | "opportunity" | "alert",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Max 5 insights. Only output JSON — no explanation, no markdown fences.

Financial data:
${JSON.stringify(ctx, null, 2)}`
}

export async function generateAIInsights(
  summary: InsightsSummary,
  openaiModel: string = process.env.OPENAI_MODEL || 'gpt-4o-mini',
): Promise<AIInsight[]> {
  // Heuristic guard — skip AI for sparse data
  if (summary.transactionCount < 3 || summary.totalSpending < 0.01) {
    return sparseFallbackInsights()
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const prompt = buildPrompt(summary)

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a premium fintech intelligence engine. Generate decision-driving, data-specific financial insights. Use only the numbers provided. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      if (response.status === 429) {
        return rateLimitFallbackInsights()
      }
      throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty OpenAI response')

    if (isDev) {
      console.log('AI RAW RESPONSE', content)
    }

    const parsed = JSON.parse(content) as unknown

    let items: unknown[]
    if (Array.isArray(parsed)) {
      items = parsed
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      'insights' in parsed &&
      Array.isArray((parsed as { insights: unknown }).insights)
    ) {
      items = (parsed as { insights: unknown[] }).insights
    } else {
      throw new Error('Unexpected OpenAI response shape')
    }

    const valid = items.filter(isAIInsight).slice(0, 5)
    return filterWeakInsights(valid)
  } catch (err) {
    console.error('OPENAI ERROR', err)
    if (String(err).includes('429')) {
      return rateLimitFallbackInsights()
    }
    throw err
  }
}

function isAIInsight(item: unknown): item is AIInsight {
  if (!item || typeof item !== 'object') return false
  const o = item as Record<string, unknown>
  return (
    typeof o.title === 'string' &&
    typeof o.description === 'string' &&
    (o.type === 'spending' || o.type === 'income' || o.type === 'alert' || o.type === 'opportunity') &&
    (o.priority === 'high' || o.priority === 'medium' || o.priority === 'low')
  )
}
