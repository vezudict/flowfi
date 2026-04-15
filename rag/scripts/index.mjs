/**
 * FlowFi LightRAG-compatible indexer (Node.js)
 * Discovers source files, chunks at logical boundaries,
 * generates embeddings via OpenAI, writes to rag/index/.
 *
 * Usage: node rag/scripts/index.mjs
 * Env:   OPENAI_API_KEY must be set (reads from .env.local automatically)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const INDEX_DIR = path.join(PROJECT_ROOT, 'rag', 'index')
const EMBED_MODEL = 'text-embedding-3-small'
const CHUNK_SIZE = 512   // approx tokens (4 chars ≈ 1 token)
const CHUNK_OVERLAP = 64 // tokens of overlap
const CHARS_PER_TOKEN = 4
const MAX_CHARS = CHUNK_SIZE * CHARS_PER_TOKEN
const OVERLAP_CHARS = CHUNK_OVERLAP * CHARS_PER_TOKEN
const EMBED_BATCH = 100

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx',
  '.md', '.json', '.yaml', '.yml', '.toml', '.sql', '.graphql',
])

const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '__pycache__',
  '.git', 'coverage', '.cache', 'venv', '.venv', 'rag',
])

const EXCLUDE_PATTERNS = [
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.lock$/,
  /package-lock\.json$/,
]

function discoverFiles(root) {
  const results = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) walk(path.join(dir, entry.name))
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!INCLUDE_EXT.has(ext)) continue
        const full = path.join(dir, entry.name)
        if (EXCLUDE_PATTERNS.some((re) => re.test(full))) continue
        results.push(full)
      }
    }
  }
  walk(root)
  return results
}

// ---------------------------------------------------------------------------
// Preprocessing
// ---------------------------------------------------------------------------
function preprocess(content) {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trimEnd()).join('\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Chunking — logical boundaries first, sliding window fallback
// ---------------------------------------------------------------------------
const TS_BOUNDARY_RE = /^(export\s+)?(default\s+)?(async\s+)?(function|class|const|let|var|type|interface|enum)\s+/m
const IMPORT_RE = /^import\s+/m

function classifyFile(filePath, content) {
  const ext = path.extname(filePath)
  if (['.md', '.mdx', '.rst'].includes(ext)) return 'doc'
  if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) return 'config'
  if (['.sql', '.graphql', '.proto'].includes(ext)) return 'schema'
  if (IMPORT_RE.test(content)) return 'module'
  return 'module'
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function slidingWindowChunks(filePath, content, type) {
  const chunks = []
  let start = 0
  const lines = content.split('\n')
  let charPos = 0
  const lineStarts = lines.map((l) => { const s = charPos; charPos += l.length + 1; return s })

  while (start < content.length) {
    const end = Math.min(start + MAX_CHARS, content.length)
    const chunk = content.slice(start, end)

    // find line numbers
    const startLine = lineStarts.findIndex((s, i) => s >= start || (lineStarts[i + 1] ?? Infinity) > start) + 1
    const endLine = lineStarts.findLastIndex((s) => s < end) + 1

    chunks.push({
      id: sha256(chunk),
      file: path.relative(PROJECT_ROOT, filePath),
      start_line: Math.max(1, startLine),
      end_line: Math.max(1, endLine),
      type,
      content: chunk,
    })

    if (end >= content.length) break
    start = end - OVERLAP_CHARS
  }
  return chunks
}

function logicalChunks(filePath, content, type) {
  // Split on blank-line-separated top-level blocks, then on TS boundary patterns
  const lines = content.split('\n')
  const blocks = []
  let buf = []
  let startLine = 1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '' && buf.length > 0) {
      // Peek ahead: if next non-empty line is a boundary, flush
      const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim() !== '')
      if (nextNonEmpty && TS_BOUNDARY_RE.test(nextNonEmpty)) {
        blocks.push({ text: buf.join('\n'), startLine })
        buf = []
        startLine = i + 2
        continue
      }
    }
    buf.push(line)
  }
  if (buf.length > 0) blocks.push({ text: buf.join('\n'), startLine })

  // If any block is too large, slide it
  const chunks = []
  for (const block of blocks) {
    if (block.text.length <= MAX_CHARS) {
      chunks.push({
        id: sha256(block.text),
        file: path.relative(PROJECT_ROOT, filePath),
        start_line: block.startLine,
        end_line: block.startLine + block.text.split('\n').length - 1,
        type,
        content: block.text,
      })
    } else {
      // Too big — slide it
      const sub = slidingWindowChunks(filePath, block.text, type)
      // Adjust line numbers
      for (const c of sub) {
        c.start_line += block.startLine - 1
        c.end_line += block.startLine - 1
      }
      chunks.push(...sub)
    }
  }
  return chunks
}

function chunkFile(filePath, content) {
  const type = classifyFile(filePath, content)
  const ext = path.extname(filePath)

  // Use logical chunking for code files; sliding window for config/docs
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    const chunks = logicalChunks(filePath, content, type)
    return chunks.length > 0 ? chunks : slidingWindowChunks(filePath, content, type)
  }
  return slidingWindowChunks(filePath, content, type)
}

// ---------------------------------------------------------------------------
// Embedding via OpenAI
// ---------------------------------------------------------------------------
async function embedBatch(texts, apiKey) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!resp.ok) {
    const t = await resp.text()
    throw new Error(`OpenAI embeddings ${resp.status}: ${t.slice(0, 200)}`)
  }
  const data = await resp.json()
  return data.data.map((d) => d.embedding)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnv()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  fs.mkdirSync(INDEX_DIR, { recursive: true })

  // Load existing manifest for dedup
  const manifestPath = path.join(INDEX_DIR, 'manifest.json')
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { chunk_ids: [], total_chunks: 0 }
  const existingIds = new Set(manifest.chunk_ids ?? [])

  console.log(`\n=== FlowFi RAG Indexer ===`)
  console.log(`Project root: ${PROJECT_ROOT}`)
  console.log(`Index dir:    ${INDEX_DIR}`)
  console.log(`Existing chunks: ${existingIds.size}`)

  // File discovery
  const files = discoverFiles(PROJECT_ROOT)
  console.log(`\nFiles discovered: ${files.length}`)

  // Chunk all files
  let allChunks = []
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const content = preprocess(raw)
    if (!content) continue
    const chunks = chunkFile(file, content)
    allChunks.push(...chunks)
  }
  console.log(`Total chunks: ${allChunks.length}`)

  // Filter to only new chunks
  const newChunks = allChunks.filter((c) => !existingIds.has(c.id))
  console.log(`New chunks to embed: ${newChunks.length}`)

  if (newChunks.length === 0) {
    console.log('Nothing to embed — index is current.')
    return
  }

  // Embed in batches
  const chunksPath = path.join(INDEX_DIR, 'chunks.jsonl')
  const out = fs.createWriteStream(chunksPath, { flags: 'a' })
  let embedded = 0

  for (let i = 0; i < newChunks.length; i += EMBED_BATCH) {
    const batch = newChunks.slice(i, i + EMBED_BATCH)
    const texts = batch.map((c) => c.content)
    process.stdout.write(`  Embedding batch ${Math.ceil(i / EMBED_BATCH) + 1}/${Math.ceil(newChunks.length / EMBED_BATCH)}...`)

    const embeddings = await embedBatch(texts, apiKey)
    for (let j = 0; j < batch.length; j++) {
      out.write(JSON.stringify({ ...batch[j], embedding: embeddings[j] }) + '\n')
    }
    embedded += batch.length
    console.log(` done (${embedded}/${newChunks.length})`)
  }

  out.end()

  // Update manifest
  const newIds = newChunks.map((c) => c.id)
  const updatedManifest = {
    created: manifest.created ?? new Date().toISOString(),
    updated: new Date().toISOString(),
    model: EMBED_MODEL,
    total_chunks: (manifest.total_chunks ?? 0) + newChunks.length,
    chunk_ids: [...existingIds, ...newIds],
    settings: { chunk_size: CHUNK_SIZE, chunk_overlap: CHUNK_OVERLAP, chars_per_token: CHARS_PER_TOKEN },
  }
  fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2))

  // Write metadata
  fs.writeFileSync(
    path.join(INDEX_DIR, 'metadata.json'),
    JSON.stringify({
      project: 'flowfi',
      model: EMBED_MODEL,
      chunk_size: CHUNK_SIZE,
      chunk_overlap: CHUNK_OVERLAP,
      files_indexed: files.length,
      total_chunks: updatedManifest.total_chunks,
      updated: updatedManifest.updated,
    }, null, 2),
  )

  console.log(`\n✓ Index complete`)
  console.log(`  Files: ${files.length}`)
  console.log(`  Total chunks: ${updatedManifest.total_chunks}`)
  console.log(`  New embedded: ${newChunks.length}`)
  console.log(`  Skipped (cached): ${allChunks.length - newChunks.length}`)
  console.log(`  Output: ${INDEX_DIR}`)
}

main().catch((err) => { console.error('INDEXER ERROR:', err); process.exit(1) })
