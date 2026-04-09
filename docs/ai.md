# FlowFi AI layer

How **insights**, parsing, and assisted categorization use OpenAI—without mixing “product AI” with your source of truth for **transactions**.

---

## Principles

1. **Server-only** — API keys never ship to the browser; only Route Handlers call OpenAI.
2. **Structured output** — **Insights** use `response_format: json_object` and strict parsing into typed **insights** (`title`, `description`, `type`, `priority`).
3. **Guards** — Sparse **transactions** (low count or negligible spend) return a local fallback instead of burning tokens.
4. **No training claim** — Data is sent as chat completions to your configured provider; FlowFi does not operate a separate model-training pipeline on user ledgers.

---

## Insights (`/api/ai-insights`)

**Input:** Client sends `computeAnalytics(transactions)` plus `currency`. The route may also consider anomaly payloads when wired in the product.

**Summary construction** (server): Enriched object includes totals, top categories (top slice of pie), average daily spend, unusual day-level spikes, prior-month income, optional anomaly list.

**Model:** `OPENAI_MODEL` or default `gpt-4o-mini`.

**Prompting:** Anti-generic and anti-hallucination rules; asks for measurable impacts and concrete actions. Pre-computed ratios (e.g. savings rate %, top category share %) are injected so the model does less brittle arithmetic in prose.

**Post-processing:** `filterWeakInsights` drops vague phrasing (e.g. “consider”, “might”, “typically”); if everything would drop, the unfiltered set is kept so the UI never goes empty unexpectedly.

**Caching:** `ai_insights_cache` stores JSON **insights** keyed by user and a composite key (calendar month + hash of key analytics fields) so regenerations track real data changes.

**Errors:** Rate limit from OpenAI maps to canned fallback **insights**; other failures bubble as API errors and are logged server-side.

---

## PDF parsing (`/api/parse-file`)

1. **Extract** — `pdf-parse` reads text from uploaded PDFs (size capped server-side).
2. **Structure** — OpenAI turns messy statement text into an array of `{ date, description, amount, type }` objects.
3. **Review** — The UI shows candidates; users confirm before rows become **transactions**.

This keeps the model as a **parser**, not an accounting system—humans remain the approval gate.

---

## Categorization (`/api/categorize`)

Optional assist: suggests a category label from description. The canonical path remains:

- Keyword maps (`category-suggestion`)
- User corrections stored in **category memory** (browser `localStorage`)
- Normalization in `transaction-normalizer` / `category-backfill`

---

## Operations

- Set `OPENAI_API_KEY` in production for AI routes; without it, **insights** and parse/categorize routes that depend on it will error or short-circuit per implementation.
- Override `OPENAI_MODEL` for cost/latency experiments.
- Watch provider rate limits; FlowFi applies app-level rate limits in addition.

---

## Related

- [architecture.md](./architecture.md) — end-to-end flow
- [database.md](./database.md) — `ai_insights_cache` schema
