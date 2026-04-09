# FlowFi architecture

This document describes how the system is wired for a production-minded **Next.js** + **Supabase** + **OpenAI** fintech dashboard. Terminology matches the product: **transactions**, **insights**, **budget**, **health score**.

---

## Runtime shape

- **Single Next.js app** (App Router). Public marketing and guide routes coexist with authenticated `(app)` routes under the same deployment.
- **No separate BFF**: Route Handlers in `src/app/api/*` are the integration layer for mutations, imports, and AI.
- **Supabase** holds auth identity and Postgres. The browser holds a session; the server never trusts the body’s user id—only `auth.getUser()` on a client constructed with the caller’s Bearer access token.

---

## Request flows

### Authenticated reads and writes (transactions, profile)

1. User session from Supabase Auth in the browser.
2. Client uses the Supabase JS client for reads where RLS applies, or `authedFetch` to API routes that re-verify the token.
3. Route Handlers call `createSupabaseFromAccessToken` and `requireUserFromBearer`; subsequent queries run as that user, so **RLS** policies enforce isolation.

### AI insights

1. Dashboard computes analytics from **transactions** (and optionally anomaly hints on the client).
2. `POST /api/ai-insights` receives `{ analytics, currency }`.
3. Handler rate-limits, resolves cache key (`month` + hash of key analytics fields), reads `ai_insights_cache` or calls `generateAIInsights` with an enriched summary.
4. OpenAI returns JSON **insights**; response is cached per user/key.

### PDF import

1. User uploads a file; client posts `multipart/form-data` to `POST /api/parse-file`.
2. Server extracts text (`pdf-parse`), calls OpenAI to structure rows, returns candidates for UI review.
3. Persisting rows uses the same **transactions** pipeline as CSV/manual entry (validation + RLS).

### Categorization assist

1. `POST /api/categorize` (when `OPENAI_API_KEY` is set) can suggest a category from description text; primary categorization remains keywords + user **category memory** + normalization rules.

---

## Front end ↔ back end boundaries

| Concern | Where it lives |
|---------|----------------|
| OAuth/session | Supabase client + `AuthContext` |
| Dashboard analytics | `transaction-analytics.ts` (client safe) |
| Health score | `financial-health-score.ts` |
| AI prompt + OpenAI HTTP | Server only: `ai-insights.ts`, `parse-file`, `categorize` |
| Rate limits | `rate-limit.ts` in Route Handlers |
| Input validation | `validation/sensitive-inputs.ts` |

---

## Security model (summary)

- **Secrets**: `OPENAI_API_KEY` and Supabase keys live in env; never in client bundles except the public Supabase anon key.
- **RLS**: All user rows must be scoped by `user_id` / `auth.uid()` in your Supabase policies.
- **AI**: Payloads are ephemeral API calls; FlowFi does not claim to train models on your **transactions**.

---

## Scalability notes

- AI and PDF routes are the cost and latency hotspots; caching **insights** reduces repeat OpenAI calls for unchanged months/analytics fingerprints.
- Rate limits are in-process memory; for multi-instance production, replace with Redis or edge rate limiting.

---

## Related docs

- [ai.md](./ai.md) — **insights** and parsing behavior
- [database.md](./database.md) — tables and **RLS** overview
