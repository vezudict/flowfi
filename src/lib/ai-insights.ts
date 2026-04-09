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
      title: 'Category concentration',
      description:
        'Spending is concentrated in your top category. Consider setting a budget cap.',
      type: 'spending',
      priority: 'medium',
    },
    {
      title: 'Savings momentum',
      description: 'You are maintaining positive savings this month.',
      type: 'income',
      priority: 'low',
    },
  ]
}

function buildPrompt(summary: InsightsSummary): string {
  const ctx = {
    total_spending: summary.totalSpending,
    total_income: summary.totalIncome,
    net_savings: summary.netSavings,
    top_category: summary.topCategory?.category ?? null,
    top_category_amount: summary.topCategoryAmount,
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

  return `You are a high-end fintech AI (like CRED / Monarch / Copilot Money).

Your job is to generate INSIGHTFUL, NON-GENERIC financial insights.

Rules:
- NO generic advice (e.g., "save more", "spend less", "track your spending")
- Each insight MUST reference ACTUAL numbers from the data
- Prioritize unusual patterns, inefficiencies, or opportunities
- Be concise but specific — 1-2 sentences per description
- Sound like a premium financial product
- Max 5 insights

Return a JSON object with an "insights" key containing an array:
{
  "insights": [
    {
      "title": "Short headline (max 6 words)",
      "description": "Specific insight referencing real numbers",
      "type": "spending" | "income" | "opportunity" | "alert",
      "priority": "high" | "medium" | "low"
    }
  ]
}

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
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a premium fintech AI that generates specific, data-driven financial insights. Always respond with valid JSON.',
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

    return items.filter(isAIInsight).slice(0, 5)
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
