import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { buildRateLimitKey, rateLimitConsume } from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'
import type { TaxEstimate } from '@/lib/tax-estimator'

const PER_MINUTE_USER = 5
const PER_MINUTE_IP = 20
const MODEL = 'gpt-4o-mini'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

function buildPrompt(estimate: TaxEstimate): string {
  const { grossIncome, totalDeductions, taxableIncome, estimatedTax, effectiveTaxRatePercent, suggestions } = estimate

  return `You are an Indian income tax advisor. A user has the following tax profile (simplified educational model, not official):

Gross income: ₹${(grossIncome / 100000).toFixed(2)}L
Total deductions claimed: ₹${(totalDeductions / 100000).toFixed(2)}L
Taxable income: ₹${(taxableIncome / 100000).toFixed(2)}L
Estimated tax: ₹${Math.round(estimatedTax).toLocaleString('en-IN')}
Effective rate: ${effectiveTaxRatePercent.toFixed(2)}%

Existing suggestions shown: ${suggestions.join('; ')}

Give exactly 2–3 specific, actionable tax optimization insights. Rules:
- Must reference specific rupee amounts from the data above
- Focus on deductions NOT already in the existing suggestions
- Mention specific sections (80C, 80D, 80CCD, HRA, etc.)
- Under 2 sentences each
- No generic advice

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

    const userRl = rateLimitConsume(buildRateLimitKey('user', user.id, 'tax.optimize'), PER_MINUTE_USER)
    const ipRl = rateLimitConsume(buildRateLimitKey('ip', ip, 'tax.optimize'), PER_MINUTE_IP)
    if (!userRl.allowed || !ipRl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const estimate = (body as Record<string, unknown>).estimate as TaxEstimate | undefined
    if (!estimate || typeof estimate.grossIncome !== 'number') {
      return NextResponse.json({ error: 'estimate required.' }, { status: 400 })
    }

    if (estimate.grossIncome < 100000) {
      return NextResponse.json({ insights: ['Income is below ₹1L — standard deduction covers most or all tax at this level.'] })
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
        messages: [{ role: 'user', content: buildPrompt(estimate) }],
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
    console.error('[tax-optimize] ERROR', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
