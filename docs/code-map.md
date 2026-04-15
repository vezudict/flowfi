# Code Map

> Auto-generated architecture reference. Do not add implementation details.
> Last updated: 2026-04-15

---

## Project Overview

- **Type:** Full-stack web app (SaaS fintech)
- **Language/Runtime:** TypeScript / Node.js (Next.js runtime)
- **Framework:** Next.js 16.2.2 (App Router, Turbopack)
- **Entry point:** `src/app/layout.tsx` → `Providers` → route segments
- **Config files:** `.env.local`, `next.config.ts`, `tsconfig.json`, `tailwind.config` (inline in CSS)
- **Database:** Supabase (Postgres) — migrations in `supabase/migrations/`
- **Auth:** Supabase Auth via Bearer tokens; no Next.js middleware
- **AI:** OpenAI `gpt-4o-mini` via direct `fetch` (server-only)

---

## Route Layout

| Route | Segment | Auth Required |
|-------|---------|--------------|
| `/` | `src/app/page.tsx` | No (public landing) |
| `/login` | `src/app/login/` | No |
| `/signup` | `src/app/signup/` | No |
| `/guide` | `src/app/guide/` | No |
| `/dashboard` | `src/app/(app)/dashboard/` | Yes (client-enforced) |
| `/settings` | `src/app/(app)/settings/` | Yes |
| `/tools` | `src/app/(app)/tools/` | Yes |
| `/tools/credit-score` | `src/app/(app)/tools/credit-score/` | Yes |
| `/tools/tax-estimator` | `src/app/(app)/tools/tax-estimator/` | Yes |
| `/tools/decision-engine` | `src/app/(app)/tools/decision-engine/` | Yes |
| `/tools/rent-vs-buy` | `src/app/(app)/tools/rent-vs-buy/` | Yes |
| `/tools/import-transactions` | `src/app/(app)/tools/import-transactions/` | Yes |

---

## API Routes

| Endpoint | File | Role |
|----------|------|------|
| `POST /api/transactions` | `src/app/api/transactions/route.ts` | Create transaction |
| `PATCH /api/transactions/[id]` | `src/app/api/transactions/[id]/route.ts` | Edit transaction |
| `DELETE /api/transactions/[id]` | same | Delete transaction |
| `POST /api/transactions/import` | `src/app/api/transactions/import/route.ts` | Bulk import from CSV |
| `POST /api/transactions/bulk` | `src/app/api/transactions/bulk/route.ts` | Bulk delete |
| `POST /api/ai-insights` | `src/app/api/ai-insights/route.ts` | AI spending insights (cached) |
| `POST /api/decision-engine` | `src/app/api/decision-engine/route.ts` | AI financial Q&A verdict |
| `POST /api/categorize` | `src/app/api/categorize/route.ts` | AI category suggestion |
| `POST /api/parse-file` | `src/app/api/parse-file/route.ts` | AI PDF/CSV parse to transactions |
| `POST /api/parse-pdf` | `src/app/api/parse-pdf/route.ts` | PDF text extraction |
| `POST /api/auth/attempt` | `src/app/api/auth/attempt/route.ts` | Auth rate-limit preflight |
| `POST /api/profile/budget` | `src/app/api/profile/budget/route.ts` | Save monthly budget |
| `POST /api/profile/currency` | `src/app/api/profile/currency/route.ts` | Save preferred currency |

---

## Module Breakdown

| Module | Path | Role |
|--------|------|------|
| App shell | `src/components/layout/AppShell.tsx` | Sticky navbar + main wrapper for `(app)` routes |
| App navbar | `src/components/layout/AppNavbar.tsx` | Nav, sign-out, mobile drawer |
| Landing navbar | `src/components/layout/LandingNavbar.tsx` | Public nav for `/` and `/guide` |
| Brand logo | `src/components/layout/BrandLogoLink.tsx` | FlowFi wordmark → `/` |
| Providers | `src/components/providers.tsx` | Wraps AuthContext, CurrencyContext, SessionIdleTracker, Toaster |
| Auth context | `src/contexts/auth-context.tsx` | Supabase session state; exposes `useAuth()` |
| Currency context | `src/contexts/currency-context.tsx` | User preferred currency; exposes `useCurrency()` |
| Dashboard page | `src/app/(app)/dashboard/page.tsx` | Main client page: transactions, analytics, charts, AI insights |
| Dashboard cards | `src/components/dashboard/` | SummaryCard, NetSavingsCard, FinancialHealthCard, MonthlyBudgetCard, FinancialInsights, charts |
| Tool pages | `src/app/(app)/tools/*/page.tsx` | Thin server wrappers that mount client components |
| Tool clients | `src/components/tools/` | DecisionEngineClient, CreditScoreSimClient, TaxEstimatorClient, RentVsBuyClient, ImportTransactionsClient, PdfBankStatementUpload |
| UI primitives | `src/components/ui/` | Modal, button, card, chart, date-picker, AppToaster |
| Settings | `src/components/settings/` | SettingsShell, ThemePreferenceSection, CurrencySelector |
| Supabase client | `src/lib/supabase.ts` | Browser-side Supabase client (anon key) |
| Supabase server | `src/lib/supabase-server.ts` | `createSupabaseFromAccessToken`, `requireUserFromBearer`, `getBearerToken` |
| Authed API | `src/lib/authed-api.ts` | `authedFetch`, `readAuthedJson`, `preflightAuthAttempt` — client-side helpers |
| Rate limiter | `src/lib/rate-limit.ts` | In-memory fixed-window rate limiting; dual (user+IP) and single key |
| Analytics | `src/lib/transaction-analytics.ts` | `computeAnalytics(transactions)` → `AnalyticsBundle` |
| AI insights | `src/lib/ai-insights.ts` | `generateAIInsights(summary)` → OpenAI call (server-only) |
| Transaction logic | `src/lib/transactions.ts` | `Transaction` type |
| Transaction flow | `src/lib/transaction-flow.ts` | `isExpenseForMetrics`, `isIncomeForMetrics`, `transactionEntryType` |
| Transaction filters | `src/lib/transaction-filters.ts` | Client-side filter state and `filterTransactions` |
| Transaction normalizer | `src/lib/transaction-normalizer.ts` | `normalizeTransaction` — unify shape after import/fetch |
| Category system | `src/lib/category-suggestion.ts`, `category-display.ts`, `category-memory.ts`, `category-backfill.ts` | Category inference, display, localStorage memory |
| Anomaly detection | `src/lib/anomaly-detection.ts` | `detectAnomalies(transactions)` → `Anomaly[]` |
| Recurring | `src/lib/recurring-transactions.ts` | Detect recurring patterns |
| Spending insights | `src/lib/spending-insights.ts` | Rule-based insight fallback (no AI) |
| Financial health | `src/lib/financial-health-score.ts` | `computeFinancialHealthScore(analytics)` |
| CSV import | `src/lib/csv-transactions.ts` | Parse CSV rows to transactions |
| PDF parse | `src/lib/parse-transactions-from-text.ts` | Extract transactions from PDF text |
| Tool libraries | `src/lib/credit-score-sim.ts`, `decision-engine.ts`, `rent-vs-buy.ts`, `tax-estimator.ts` | Pure calculation logic for each tool |
| Theme | `src/lib/theme-preference.ts` | localStorage `theme` key, `system`/`dark`/`light` |
| Validation | `src/lib/validation/` | `sensitive-inputs.ts` — `parseAndValidateTransactionBody` |
| Format/utils | `src/lib/format-currency.ts`, `currencies.ts`, `numeric-input.ts`, `utils.ts` | Display helpers |
| Rate limit | `src/lib/request-ip.ts` | Extract client IP from request headers |
| Client fingerprint | `src/lib/client-fingerprint.ts` | Stable browser fingerprint for rate limiting |
| Session idle | `src/components/session/SessionIdleTracker.tsx` | 15-min idle sign-out, 14-min warning modal |
| Supabase migrations | `supabase/migrations/` | `profiles`, `transactions`, `ai_insights_cache` tables |
| RAG indexer | `rag/scripts/index.mjs` | Semantic code indexer → `rag/index/` (gitignored) |

---

## File Relationships

**Auth path:**
- `src/lib/authed-api.ts` → `src/lib/supabase.ts` (gets session/token)
- `src/app/api/*/route.ts` → `src/lib/supabase-server.ts` (validates Bearer token)
- `src/app/api/*/route.ts` → `src/lib/rate-limit.ts` (enforces limits)
- `src/app/api/*/route.ts` → `src/lib/request-ip.ts` (extracts IP)

**Dashboard data path:**
- `src/app/(app)/dashboard/page.tsx` → `src/lib/authed-api.ts` (fetch transactions)
- `src/app/(app)/dashboard/page.tsx` → `src/lib/transaction-analytics.ts` (compute analytics)
- `src/app/(app)/dashboard/page.tsx` → `src/lib/anomaly-detection.ts` (detect anomalies)
- `src/app/(app)/dashboard/page.tsx` → `src/app/api/ai-insights` (POST for AI insights)
- `src/app/(app)/dashboard/page.tsx` → `src/components/dashboard/*` (render cards/charts)

**AI insights path:**
- `src/app/api/ai-insights/route.ts` → `src/lib/ai-insights.ts` (OpenAI call)
- `src/app/api/ai-insights/route.ts` → Supabase `ai_insights_cache` (read/write cache)

**Decision engine path:**
- `src/components/tools/DecisionEngineClient.tsx` → `src/lib/authed-api.ts`
- `src/app/api/decision-engine/route.ts` → Supabase `transactions` (fetch user data)
- `src/app/api/decision-engine/route.ts` → `src/lib/transaction-analytics.ts`
- `src/app/api/decision-engine/route.ts` → OpenAI API (direct fetch)

**Import path:**
- `src/components/tools/ImportTransactionsClient.tsx` → `src/lib/csv-transactions.ts`
- `src/components/tools/PdfBankStatementUpload.tsx` → `src/app/api/parse-file`
- `src/app/api/parse-file/route.ts` → `src/lib/parse-transactions-from-text.ts` + OpenAI
- `src/app/api/transactions/import/route.ts` → Supabase `transactions`

**Tool pages (static shell pattern):**
- `src/app/(app)/tools/*/page.tsx` → `src/components/tools/*Client.tsx` (mount client)
- `src/app/(app)/tools/page.tsx` → static grid of tool links (no data fetch)

---

## Data Flow

### Authenticated page request
1. Browser hits `/(app)/dashboard` — Next.js renders `AppShell` (sticky navbar + main)
2. `AppShell` renders `AppNavbar` (auth controls) + page `<main>`
3. Dashboard `page.tsx` (client) calls `authedFetch('/api/transactions')` with Bearer token
4. API route calls `requireUserFromBearer` → Supabase validates token → returns `{ user, supabase }`
5. Route queries `supabase.from('transactions')` scoped to `user.id`
6. Dashboard runs `computeAnalytics(transactions)` + `detectAnomalies` client-side
7. POSTs analytics bundle to `/api/ai-insights` → checks `ai_insights_cache` → OpenAI on miss
8. Renders summary cards, charts, and AI insight panel

### API mutation (create/edit transaction)
1. Client calls `authedFetch('/api/transactions', { method: 'POST', json: {...} })`
2. Route: `getBearerToken` → `requireUserFromBearer` → validates session
3. `rateLimitConsumeDual` checks per-user + per-IP cap
4. `parseAndValidateTransactionBody` validates payload
5. `supabase.from('transactions').insert(payload)` — RLS enforced by Supabase

### AI decision engine
1. User types question in `DecisionEngineClient`; submits via `authedFetch('/api/decision-engine')`
2. Route fetches last 500 transactions, runs `computeAnalytics`
3. If `transactionCount < 3` → returns fallback (no OpenAI call)
4. Checks in-process cache (5-min TTL, SHA-256 key)
5. On miss: POSTs to OpenAI `gpt-4o-mini` with `response_format: json_object`
6. Returns `{ summary, verdict, confidence, reasons[], suggestions[] }`
