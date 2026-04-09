/**
 * AI-powered financial insights via OpenAI.
 * Called server-side only (Route Handler). Never import in client components.
 */

export type InsightsSummary = {
  totalSpending: number
  totalIncome: number
  netSavings: number
  topCategory: { category: string; amount: number } | null
  categoryBreakdown: Record<string, number>
  currency: string
}

export type AIInsight = {
  title: string
  description: string
  type: 'spending' | 'income' | 'alert' | 'opportunity'
  priority: 'high' | 'medium' | 'low'
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export async function generateAIInsights(summary: InsightsSummary): Promise<AIInsight[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const prompt = `Analyze this user's monthly financial data and return concise, actionable insights.

Financial data:
${JSON.stringify(summary, null, 2)}

Rules:
- Max 6 insights
- Must include at least 1 high priority insight
- Avoid generic statements — be specific with numbers from the data
- Focus on actionable advice
- Use simple human tone
- Currency code in the data is the user's preferred currency

Return ONLY a valid JSON array in this exact shape:
[
  {
    "title": "Short headline",
    "description": "Clear actionable insight with specific numbers",
    "type": "spending | income | alert | opportunity",
    "priority": "high | medium | low"
  }
]`

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a fintech financial assistant. Analyze the user\'s monthly analytics and return concise, actionable insights. Return ONLY valid JSON with a top-level "insights" key containing the array.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty OpenAI response')

  const parsed = JSON.parse(content) as unknown

  // Support both top-level array and wrapped {"insights": [...]}
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

  return items
    .filter(isAIInsight)
    .slice(0, 6)
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
