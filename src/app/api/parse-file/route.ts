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
  confidence?: number
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const MAX_BYTES = 5 * 1024 * 1024
const MAX_TRANSACTIONS = 200

const PARSE_PER_MINUTE_USER = 5
const PARSE_PER_MINUTE_IP = 15

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const NOISE_WORDS_RE = /\b(total|balance|opening|closing|brought forward|carried forward|b\/f|c\/f)\b/i

function computeConfidence(tx: ParsedTransaction): number {
  let score = 1.0
  if (!tx.date || !ISO_DATE_RE.test(tx.date)) score -= 0.3
  if (!Number.isFinite(tx.amount) || tx.amount <= 0) score -= 0.4
  if (!tx.description || tx.description.trim().length < 4) score -= 0.2
  if (tx.type !== 'debit' && tx.type !== 'credit') score -= 0.3
  if (tx.description && NOISE_WORDS_RE.test(tx.description)) score -= 0.5
  return Math.max(0, Math.min(1, score))
}

function detectStructure(text: string): 'table' | 'ledger' {
  const isTableLike = text.includes('Date') && text.includes('Amount')
  const isLedgerLike = text.split('\n').length > 50
  if (isTableLike) return 'table'
  if (isLedgerLike) return 'ledger'
  return 'table'
}

/**
 * Merge very short lines (< 15 chars) with the following line.
 * Helps with PDFs that break transaction descriptions across lines.
 */
function mergeShortLines(text: string): string {
  const lines = text.split('\n')
  const merged: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length < 15 && i + 1 < lines.length) {
      merged.push(trimmed + ' ' + lines[i + 1].trim())
      i++
    } else {
      merged.push(line)
    }
  }
  return merged.join('\n')
}

async function parseWithAI(text: string): Promise<ParsedTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const processedText = mergeShortLines(text)
  const structure = detectStructure(processedText)

  console.log('[parse-file] RAW TEXT SAMPLE', processedText.slice(0, 500))

  const prompt = `You are a financial data extraction engine.

Extract transactions from raw bank statement text.

The format may vary (table, ledger, mixed).

STRICT RULES:
- Only extract real transactions
- Ignore headers, totals, balances, opening/closing balance rows, and footers
- Do NOT hallucinate missing rows
- Each row must have date, description, amount
- If unsure → skip row
- amount must be a positive number (absolute value, no negatives)
- type: "debit" for expenses/withdrawals, "credit" for income/deposits
- date must be in YYYY-MM-DD format
- description: clean and concise, remove reference codes and noise

Handle:
- Multi-line descriptions
- Different date formats
- Debit/Credit columns OR signed amounts

Output JSON:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "clean text",
      "amount": number,
      "type": "debit" | "credit"
    }
  ]
}

Structure hint: ${structure}

TEXT:
${processedText.slice(0, 8000)}`

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
            'You are a financial data extraction engine. Extract structured transaction data from bank statement text. Always respond with valid JSON containing a "transactions" array.',
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

  // Double-pass validation: strict checks before accepting each row
  const result: ParsedTransaction[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const tx = item as Record<string, unknown>

    const date = typeof tx.date === 'string' ? tx.date.trim() : ''
    if (!date || !ISO_DATE_RE.test(date)) continue

    const description = typeof tx.description === 'string' ? tx.description.trim() : ''
    if (description.length < 3) continue

    const rawAmount = tx.amount
    const amount =
      typeof rawAmount === 'number'
        ? Math.abs(rawAmount)
        : typeof rawAmount === 'string'
          ? Math.abs(parseFloat(rawAmount))
          : NaN
    if (!Number.isFinite(amount) || amount <= 0) continue

    const type: 'debit' | 'credit' = tx.type === 'credit' ? 'credit' : 'debit'

    result.push({ date, description, amount, type })
  }

  // Safety limit + confidence scoring
  const capped = result.slice(0, MAX_TRANSACTIONS).map((tx) => ({
    ...tx,
    confidence: computeConfidence(tx),
  }))

  console.log('[parse-file] PARSED COUNT', capped.length)

  return capped
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
