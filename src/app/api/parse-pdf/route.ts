import { NextResponse } from 'next/server'
import {
  PUBLIC_ERROR_GENERIC,
  PUBLIC_ERROR_TOO_MANY_REQUESTS,
  PUBLIC_ERROR_UNAUTHORIZED,
} from '@/lib/api-public-error'
import { extractTextFromPdfBuffer } from '@/lib/pdf-extract-text'
import {
  rateLimitConsumeDual,
  rateLimitKeyPdfParseIp,
  rateLimitKeyPdfParseUser,
} from '@/lib/rate-limit'
import { getRequestIp } from '@/lib/request-ip'
import { getBearerToken, requireUserFromBearer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024
const PDF_MAGIC = Buffer.from('%PDF-')

const PARSE_PER_MINUTE_USER = 10
const PARSE_PER_MINUTE_IP = 30

function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= PDF_MAGIC.length && buf.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
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
    const rl = rateLimitConsumeDual({
      userKey: rateLimitKeyPdfParseUser(user.id),
      userMax: PARSE_PER_MINUTE_USER,
      ipKey: rateLimitKeyPdfParseIp(ip),
      ipMax: PARSE_PER_MINUTE_IP,
    })
    if (!rl.allowed) {
      return NextResponse.json({ error: PUBLIC_ERROR_TOO_MANY_REQUESTS }, { status: 429 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Expected multipart form data with a PDF file.' }, { status: 400 })
    }

    const entry = formData.get('file')
    if (!entry || !(entry instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded. Use the field name "file".' }, { status: 400 })
    }

    if (entry.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 5 MB.' },
        { status: 400 },
      )
    }

    const mimeOk = entry.type === 'application/pdf'
    const extOk = entry.name.toLowerCase().endsWith('.pdf')
    if (!mimeOk && !(entry.type === '' && extOk)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF (application/pdf).' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await entry.arrayBuffer())
    if (!looksLikePdf(buffer)) {
      return NextResponse.json({ error: 'This file is not a valid PDF.' }, { status: 400 })
    }

    let text: string
    try {
      text = await extractTextFromPdfBuffer(buffer)
    } catch (e) {
      console.error('[api/parse-pdf] parse', e)
      return NextResponse.json(
        {
          error:
            'We could not read text from this PDF. It may be encrypted, damaged, or scanned as images only.',
        },
        { status: 422 },
      )
    }

    return NextResponse.json({ text })
  } catch (e) {
    console.error('[api/parse-pdf]', e)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
