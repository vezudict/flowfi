import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { buildRateLimitKey, rateLimitConsume } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import type { CreditSimResult } from '@/lib/credit-score-sim'

const PER_MINUTE_USER = 5
const PER_MINUTE_IP = 20
const MODEL = 'gpt-4o-mini'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

export type CreditScoreInsight = { insight: string }

function buildPrompt(score: number, result: CreditSimResult): string {
  const factorText = result.factors
    .map((f) => `- ${f.label}: impact ${f.impact > 0 ? '+' : ''}${f.impact} (${f.explanation})`)
    .join('\n')

  return `You are a credit health advisor. A user has a simulated credit score of ${score} (range 300–900, educational only).

Factor breakdown:
${factorText}

Suggestions already shown: ${result.suggestions.join('; ')}

Give exactly 2–3 sharp, specific insights about the BIGGEST opportunities to improve this score. Each insight must:
- Reference specific numbers from the factor breakdown
- Be concrete (not generic)
- Be under 2 sentences

Respond ONLY with valid JSON: { "insights": ["...", "...", "..."] }`
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request)
    const auth = await requireUserFromBearer(token)
    if (!auth) {
      return NextResponse.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
    }
    const { user } = auth
    const ip = getRequestIp(request)

    const userRl = rateLimitConsume(buildRateLimitKey('user', user.id, 'credit.explain'), PER_MINUTE_USER)
    const ipRl = rateLimitConsume(buildRateLimitKey('ip', ip, 'credit.explain'), PER_MINUTE_IP)
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const score = typeof b.score === 'number' ? b.score : null
    const result = b.result as CreditSimResult | undefined

    if (!score || !result) {
      return NextResponse.json({ error: 'score and result required.' }, { status: 400 })
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
          { role: 'user', content: buildPrompt(score, result) },
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

    const parsed = JSON.parse(content) as { insights?: unknown[] }
    const insights = Array.isArray(parsed.insights)
      ? parsed.insights.filter((x) => typeof x === 'string').slice(0, 3)
      : []

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('[credit-score-explain] ERROR', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
