import { NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
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

export const runtime = "nodejs"

/** pdf-parse v2 is class-based; this matches the v1 `const data = await pdfParse(buffer)` shape. */
async function pdfParse(buffer: Buffer): Promise<{ text: string }> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return { text: result.text }
  } finally {
    await parser.destroy()
  }
}

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

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 5 MB.' },
        { status: 400 },
      )
    }

    const mimeOk = file.type === 'application/pdf'
    const extOk = file.name.toLowerCase().endsWith('.pdf')
    if (!mimeOk && !(file.type === '' && extOk)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF (application/pdf).' },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("file:", file)
    console.log("buffer length:", buffer.length)

    if (!looksLikePdf(buffer)) {
      return NextResponse.json({ error: 'This file is not a valid PDF.' }, { status: 400 })
    }

    let data: { text: string }
    try {
      data = await pdfParse(buffer)
    } catch (err) {
      console.error('[api/parse-pdf] parse', err)
      return new Response(JSON.stringify({ error: 'Parsing failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return Response.json({
      text: data.text,
    })
  } catch (err) {
    console.error('[api/parse-pdf]', err)
    return NextResponse.json({ error: PUBLIC_ERROR_GENERIC }, { status: 500 })
  }
}
