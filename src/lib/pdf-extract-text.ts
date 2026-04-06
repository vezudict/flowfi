import { PDFParse } from 'pdf-parse'

/**
 * Extract plain text from a PDF buffer (Node runtime).
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}
