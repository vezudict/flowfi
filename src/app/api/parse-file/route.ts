/**
 * POST /api/parse-file
 *
 * Accepts a PDF bank statement (FormData `file` field).
 * Extracts text with pdf-parse, then uses OpenAI to return structured transactions.
 * Returns { transactions: ParsedTransaction[] }
 */

import pdfParse from 'pdf-parse'
import {
  PUBLIC_ERROR_GENERIC,
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import {
  rateLimitConsumeDual,
  rateLimitKeyPdfParseIp,
  rateLimitKeyPdfParseUser,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export type ParsedTransaction = {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const MAX_BYTES = 5 * 1024 * 1024

const PARSE_PER_MINUTE_USER = 5
const PARSE_PER_MINUTE_IP = 15

async function parseWithAI(text: string): Promise<ParsedTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const prompt = `Extract financial transactions from this bank statement text.

Return a JSON object with a "transactions" array:
{
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "string", "amount": number, "type": "debit" | "credit" }
  ]
}

Rules:
- amount must be a positive number (absolute value, no negatives)
- type: "debit" for expenses/withdrawals, "credit" for income/deposits
- date must be in YYYY-MM-DD format
- description: clean and concise, remove reference codes and noise
- Ignore headers, footers, opening/closing balance rows
- Do NOT hallucinate transactions — only extract what is clearly present in the text
- Return { "transactions": [] } if no transactions are found

Bank statement text:
${text.slice(0, 8000)}`

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract structured transaction data from bank statement text. Always respond with valid JSON containing a "transactions" array.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    if (res.status === 429) throw new Error('rate_limited')
    throw new Error(`OpenAI error: ${res.status}`)
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  const parsed = JSON.parse(content) as { transactions?: unknown[] }
  const items = parsed.transactions
  if (!Array.isArray(items)) return []

  const result: ParsedTransaction[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const tx = item as Record<string, unknown>
    const date = typeof tx.date === 'string' ? tx.date.trim() : ''
    const description = typeof tx.description === 'string' ? tx.description.trim() : ''
    const amount = typeof tx.amount === 'number' ? Math.abs(tx.amount) : 0
    const type = tx.type === 'credit' ? 'credit' : 'debit'
    if (!date || !description || amount <= 0) continue
    result.push({ date, description, amount, type })
  }

  return result
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req)
    const auth = await requireUserFromBearer(token)
    if (!auth) {
      return Response.json({ error: PUBLIC_ERROR_UNAUTHORIZED }, { status: 401 })
    }
    const { user } = auth
    const ip = getRequestIp(req)

    const rl = rateLimitConsumeDual({
      userKey: rateLimitKeyPdfParseUser(user.id),
      userMax: PARSE_PER_MINUTE_USER,
      ipKey: rateLimitKeyPdfParseIp(ip),
      ipMax: PARSE_PER_MINUTE_IP,
    })
    if (!rl.allowed) {
      return Response.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file uploaded. Choose a PDF and try again.' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 })
    }

    const mimeOk = file.type === 'application/pdf'
    const extOk = file.name.toLowerCase().endsWith('.pdf')
    if (!mimeOk && !(file.type === '' && extOk)) {
      return Response.json({ error: 'Please choose a valid PDF file.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text: string
    try {
      const data = await pdfParse(buffer)
      text = data.text
    } catch {
      return Response.json(
        {
          error:
            "We couldn't read that PDF. Try another file or export the statement again from your bank.",
        },
        { status: 422 },
      )
    }

    if (!text.trim()) {
      return Response.json({ transactions: [] })
    }

    let transactions: ParsedTransaction[]
    try {
      transactions = await parseWithAI(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'rate_limited') {
        return Response.json(
          { error: 'Too many requests. Wait a moment and try again.' },
          { status: 429 },
        )
      }
      console.error('[parse-file] AI error:', err)
      return Response.json(
        { error: 'Could not parse file. Try CSV or a simpler PDF.' },
        { status: 500 },
      )
    }

    return Response.json({ transactions })
  } catch (err) {
    console.error('[parse-file]', err)
    return Response.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
