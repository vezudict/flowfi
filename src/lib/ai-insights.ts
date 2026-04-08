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

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export async function generateAIInsights(summary: InsightsSummary): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const prompt = `You are a financial analyst AI.

Given this user's financial data for the current month:
${JSON.stringify(summary, null, 2)}

Generate 3-5 concise insights. Requirements:
- Focus on spending patterns, unusual activity, category dominance, and financial health
- Keep tone professional, slightly conversational
- Each insight must be 1-2 sentences max
- Avoid generic advice — be specific with numbers from the data
- Currency code in the data is the user's preferred currency

Return ONLY valid JSON in this exact shape: {"insights": string[]}`

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
        { role: 'system', content: 'You are a financial analyst AI. Return only valid JSON.' },
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
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('insights' in parsed) ||
    !Array.isArray((parsed as { insights: unknown }).insights)
  ) {
    throw new Error('Unexpected OpenAI response shape')
  }

  return (parsed as { insights: unknown[] }).insights
    .filter((s): s is string => typeof s === 'string')
    .slice(0, 5)
}
