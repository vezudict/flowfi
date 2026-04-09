# FlowFi Code Map

Structured overview for humans and AI: **where logic lives**, **where UI renders**, and **how modules relate**.  
**Maintenance:** Update this file (and `code-map.ts` if you use it) when you add routes, API handlers, or major `src/lib` modules.

---

## Repository documentation layer

Human-facing product and technical docs for FlowFi (recruiter- and OSS-friendly):

| Asset | Purpose |
|-------|---------|
| `README.md` | Product overview, features, **tech stack**, setup, env vars, structure, roadmap, license pointer |
| `docs/architecture.md` | System design: auth, API routes, AI vs DB boundaries, security notes |
| `docs/ai.md` | **Insights**, PDF parse, categorization — how OpenAI is used server-side |
| `docs/database.md` | `profiles`, **transactions**, `ai_insights_cache`, **RLS** expectations |
| `.env.example` | Safe template for `NEXT_PUBLIC_*`, `OPENAI_*`, optional debug flags (copy → `.env.local`) |
| `LICENSE` | MIT |
| `public/screenshots/` | Drop README screenshots here (`dashboard.png`, etc.) |

---

## Core Logic

| Path | Does | Affects / relates to |
|------|------|----------------------|
| `src/lib/transaction-analytics.ts` | Monthly totals, pie/bar series, net savings, income vs debit splits | Dashboard charts, summary cards |
| `src/lib/transaction-flow.ts` | `transactionEntryType` + `isExpenseForMetrics` / `isIncomeForMetrics` (persisted type, else category heuristic) | Analytics, insights, list badges — **must stay aligned** |
| `src/lib/debug-transaction-flow.ts` | Optional `NEXT_PUBLIC_DEBUG_FLOWFI_TX=1` console trace for debit/credit through analytics/insights | Debugging only; no default logs |
| `src/lib/spending-insights.ts` | Savings, expense, income insight bullets; category names in copy via **`getCategoryLabel`** | `FinancialInsights` |
| `src/lib/anomaly-detection.ts` | **`detectAnomalies(transactions, analytics, currency)`** — 4 rules: spending spike (daily > 2× avg), dominant category (> 40% of total), income drop (> 30% vs prev month), large single expense (> 30% of monthly total). Returns `Anomaly[]` sorted by severity, capped at 3. Runs client-side before AI fetch; results sent to API in POST body and injected into AI prompt context. | Dashboard, `api/ai-insights` |
| `src/lib/ai-insights.ts` | **`generateAIInsights(summary, openaiModel?)`** — enriched **`InsightsSummary`** input (now includes `anomalies?: Anomaly[]`). **Heuristic guard:** `transactionCount < 3` or `totalSpending < 0.01` → sparse fallback (no API call). **`buildPrompt()`**: injects pre-computed `savings_rate_pct` + `top_category_ratio_pct`; if `unusual_spikes` present, REQUIRED instruction forces 1 spike insight; if `anomalies` present, instructs AI to reference them. **Anti-hallucination rules in prompt:** no external benchmarks, no "typical users", only provided numbers. **Decision-driven format:** every insight must (1) name the issue with exact number, (2) quantify impact in currency/%, (3) suggest specific action with target amount. `temperature: 0.3`, `response_format: json_object`. **Post-process:** `filterWeakInsights()` drops descriptions containing "consider"/"might"/"could"/"typically"/"average user" (falls back to unfiltered if all dropped); max **5**. **429:** rate-limit fallback; other errors rethrow. **Dev:** logs `AI CONTEXT`, `AI RAW RESPONSE`, dropped insights. Server-only | `api/ai-insights` route |
| `src/lib/recurring-transactions.ts` | Detect recurring debits; insight copy uses **`getCategoryLabel`** | Dashboard insights, row badges |
| `src/lib/financial-health-score.ts` | Composite score from ledger + budget | `FinancialHealthCard` |
| `src/lib/category-suggestion.ts` | **`CATEGORY_KEYWORDS`** map (buckets: food, transport, entertainment, subscriptions, utilities, shopping, transfer, income) + **`detectCategory(description)`** (substring match, ordered buckets; dev-only `CATEGORY DETECTED` log); **`normalizeCategoryLabel`** / **`finalizeTransactionCategory`** (normalize + override **other** when keywords hit); **`resolveTransactionCategory`** (CSV: explicit plausible column unless other-like, then keywords); **`resolvePdfImportCategory`** (keywords then credit→`income`); **`suggestCategoryFromDescription`** for dashboard/edit UI; analytics helpers; shared by **`category-backfill`** | Dashboard add + edit, **CSV** (`csv-transactions` + `resolveTransactionCategory`), **PDF** text parse (`detectCategory` in `parse-transactions-from-text`, confirm via `resolvePdfImportCategory`), **POST/PATCH/import** (`finalizeTransactionCategory` in `sensitive-inputs`), **soft backfill** (`fixTransactionCategory`) |
| `src/lib/category-memory.ts` | **Client-side category memory (localStorage).** Two stores: (1) **user corrections** (`flowfi_category_memory_v1`) — `setCategoryMemory(desc, cat)` / `getCategoryFromMemory(desc)`, permanent, set on every successful category edit; (2) **AI cache** (`flowfi_category_ai_cache_v1`) — `setAiCategoryCache` / `getAiCategoryCache`, expires after 30 days. Keys are normalized (trim + lowercase). Safe to call server-side (returns null). | `category-backfill` (user memory → rules), `TransactionEditModal` (save on edit + read for AI hint) |
| `src/lib/category-backfill.ts` | **`fixTransactionCategory(tx)`** — **priority order: (1) user memory → (2) keyword rules (only when other-like) → (3) stored category**; dev-only `CATEGORY FROM MEMORY` / `FIXED CATEGORY` logs; **no DB writes** | Called via `normalizeTransaction` |
| `src/lib/category-display.ts` | **`CATEGORY_DISPLAY`** / **`CATEGORY_STYLES`** maps; **`getCategoryLabel`** / **`getCategoryStyleClass`** (normalize via `normalizeCategoryLabel` before lookup; unknown → **Misc** / zinc) | Dashboard list, pie **legend/tooltip** (`CategoryPieChart.formatSegmentLabel`), top category card, filter options, add-form suggestion, `TransactionEditModal` suggestion, insight copy (`spending-insights`, `recurring-transactions`) |
| `src/lib/transaction-normalizer.ts` | **`normalizeTransaction(tx)`** — single source of truth for client-side normalization; applies `fixTransactionCategory`; dev-only `CATEGORY FLOW` log on mismatch | `fetchTransactionsForUser` (fetch path), `handleTransactionSaved` (edit path) |
| `src/lib/transaction-filters.ts` | Search/date/category filters | Dashboard transaction list |
| `src/lib/format-currency.ts` | `Intl` currency formatting | UI everywhere |
| `src/lib/currencies.ts` | Supported codes, locale metadata | Settings, formatting |
| `src/lib/numeric-input.ts` | Sanitize decimal inputs | Forms |
| `src/lib/utils.ts` | `cn()` etc. | Components |
| `src/lib/credit-score-sim.ts` | Credit score simulation math | Credit score tool |
| `src/lib/tax-estimator.ts` | Tax estimation (INR) | Tax tool |
| `src/lib/rent-vs-buy.ts` | Rent vs buy projections | Rent vs buy tool |
| `src/lib/decision-engine.ts` | Decision engine rules / outputs | Decision tool |
| `src/lib/csv-transactions.ts` | Parse/normalize CSV rows for import | Import tool, API import |
| `src/lib/parse-transactions-from-text.ts` | Date utilities: **`parsePdfStatementDateToIso`** (accepts YYYY-MM-DD, DD-MMM-YYYY, DD-MM-YYYY, DD/MM/YYYY → ISO string) + `formatTodayPdfStatementDate`; used by PDF editable preview in `ImportTransactionsClient`; regex parser kept for reference but no longer primary path | PDF preview |
| `src/lib/transactions.ts` | Client fetch/delete helpers; `Transaction` type; **`fetchTransactionsForUser`** maps rows through **`normalizeTransaction`** (soft backfill, post-fetch only) | Dashboard, modals |
| `src/lib/authed-api.ts` | Bearer `fetch` + JSON helpers | Client → API routes |
| `src/lib/supabase-server.ts` | Service role / user from token for Route Handlers | All `api/*` mutations |
| `src/lib/supabase.ts` | Browser Supabase client | Auth context, client data |
| `src/lib/ensure-profile.ts` | Ensure profile row exists | Auth flows |
| `src/lib/profile-budget.ts` | **`fetchProfilePreferences`**: single `profiles` read **`select('monthly_budget, preferred_currency').eq('id', userId).maybeSingle()`** (deduped in-flight); **`PROFILE FETCH ERROR`** on failure; **`fetchProfileBudget` / `fetchPreferredCurrency`** wrap same call | Dashboard (`loadDashboard` → budget), **`CurrencyProvider`** → preferred currency |
| `src/lib/rate-limit.ts` | In-memory rate limits | API routes |
| `src/lib/request-ip.ts` | Client IP for rate limiting | API routes |
| `src/lib/api-public-error.ts` | Stable error strings for clients | API responses |
| `src/lib/client-fingerprint.ts` | Optional client fingerprint header | Authed requests |
| `src/lib/theme-preference.ts` | `localStorage` theme (`dark` / `light` / `system`) | Settings, layout script |
| `src/lib/validation/sensitive-inputs.ts` | Validate transaction body, budget, currency, bulk delete, import rows | POST/PATCH transactions, import |

---

## Pages / Routes (`src/app`)

| Path | Does | Affects |
|------|------|---------|
| `src/app/layout.tsx` | Root layout, fonts, theme FOUC script, providers | Entire app |
| `src/app/page.tsx` | Public landing | Marketing |
| `src/app/login/page.tsx` | Sign-in | Auth |
| `src/app/signup/page.tsx` | Sign-up | Auth |
| `src/app/guide/page.tsx` | In-app guide | Learn |
| `src/app/(app)/layout.tsx` | Authenticated shell (`AppShell`) | Dashboard, tools, settings |
| `src/app/(app)/dashboard/page.tsx` | **Dashboard hub:** metrics, charts, add-tx form, filters. **Recent activity:** scrollable list with sticky **Bulk select** header, floating bulk-delete bar, empty state. **`SelectableTransactionRow` (memo):** `[checkbox | description+meta | amount+badge+actions]` — description primary line, **`getCategoryLabel` + `getCategoryStyleClass`** on category meta/title fallback, amount tinted debit/credit, **`TransactionEntryTypeBadge`** beside amount. **`CategoryPieChart`** passes **`formatSegmentLabel={getCategoryLabel}`**. **`SummaryCard`** top category uses display label + accent class. **AI insights:** `useEffect` on **`transactions`** (after **`!authLoading`** and **`session.access_token`**) → **`authedFetch` POST `/api/ai-insights`** with `{ analytics: computeAnalytics(transactions), currency }` → route cache / OpenAI (see API row). **`loadDashboard`** → **`fetchProfileBudget`** → **`fetchProfilePreferences`** (`profiles`: `monthly_budget`, `preferred_currency`); **`currency`** UI prop from **`CurrencyProvider`** (same prefs read for `preferred_currency`) | Main product surface |
| `src/app/(app)/settings/page.tsx` | Appearance, currency | User prefs |
| `src/app/(app)/tools/page.tsx` | Tools index grid | Navigation |
| `src/app/(app)/tools/credit-score/page.tsx` | Credit score tool page | Tool shell + client |
| `src/app/(app)/tools/tax-estimator/page.tsx` | Tax estimator page | Tool |
| `src/app/(app)/tools/decision-engine/page.tsx` | Decision engine page | Tool |
| `src/app/(app)/tools/rent-vs-buy/page.tsx` | Rent vs buy page | Tool |
| `src/app/(app)/tools/import-transactions/page.tsx` | CSV + PDF import entry | Import |

---

## Components

### Layout & chrome

| Path | Does |
|------|------|
| `src/components/layout/AppShell.tsx` | App chrome wrapper |
| `src/components/layout/AppNavbar.tsx` | Sticky nav, mobile drawer, sign-out |
| `src/components/layout/LandingNavbar.tsx` | Landing / guide nav |
| `src/components/layout/BrandLogoLink.tsx` | Wordmark → `/` |

### Dashboard

| Path | Does |
|------|------|
| `src/components/dashboard/SummaryCard.tsx` | Metric card; optional **`valueClassName`** (e.g. category accent on top-spending card) |
| `src/components/dashboard/NetSavingsCard.tsx` | Net savings (income − expenses) |
| `src/components/dashboard/MonthlyBudgetCard.tsx` | Budget vs spent |
| `src/components/dashboard/FinancialHealthCard.tsx` | Health score UI |
| `src/components/dashboard/FinancialInsights.tsx` | Sectioned insight lists. AI section renders **`AIInsightCard`** per `AIInsight`: emoji type icon (📉💰⚠️🚀) + type pill + priority badge (high→red, medium→amber, low→green) + title + description + hover glow keyed on type. Skeleton loader while `aiLoading`. Falls back to rule-based `expenseInsights` if no AI data. |
| `src/components/dashboard/CategoryPieChart.tsx` | Recharts donut; optional **`formatSegmentLabel`** for legend/tooltip (dashboard → **`getCategoryLabel`**) |
| `src/components/dashboard/SpendingBarChart.tsx` | Recharts bar (daily series) |
| `src/components/dashboard/TransactionEditModal.tsx` | Edit transaction |

**Transaction list rows** are implemented only in **`dashboard/page.tsx`** (`SelectableTransactionRow` + `TransactionEntryTypeBadge`). Badge tokens: see **Transaction type badges** under UI primitives.

### Tools

| Path | Does |
|------|------|
| `src/components/tools/ToolPageShell.tsx` | Shared tool page layout |
| `src/components/tools/CreditScoreSimClient.tsx` | Credit score interactive UI |
| `src/components/tools/TaxEstimatorClient.tsx` | Tax estimator UI |
| `src/components/tools/DecisionEngineClient.tsx` | Decision engine UI |
| `src/components/tools/RentVsBuyClient.tsx` | Rent vs buy UI |
| `src/components/tools/ImportTransactionsClient.tsx` | **Unified import UI**: single upload area for CSV+PDF; both paths produce `ParsedTransaction[]` → **`normalizeParsedTransactions`** (raw → normalize → validate → preview): merge short consecutive descriptions (< 5 chars), drop missing date/amount, multi-format date parsing (YYYY-MM-DD, DD-MMM-YYYY, DD-MM-YYYY, DD/MM/YYYY via `parsePdfStatementDateToIso`), infer type from amount sign (negative→credit), drop noise rows (balance/total/opening/closing keywords), replace empty descriptions with "Unknown transaction", title-case ALL_CAPS, deduplicate by date+amount+desc, sort date desc. Returns `{ transactions, droppedCount, dedupedCount }`. Warning: "X invalid or duplicate entries were removed automatically." Dev: logs `CLEANED TRANSACTIONS` + `REMOVED COUNT`. CSV→`parseTransactionCsvFile`→normalize; PDF→POST `/api/parse-file`→normalize. `parseSource` (`'csv'`\|`'ai'`) drives copy differences. Single `onPdfImport` confirm path for both. |
| `src/components/tools/PdfBankStatementUpload.tsx` | Legacy PDF upload component (superseded by unified `ImportTransactionsClient`) |

### Landing & guide

| Path | Does |
|------|------|
| `src/components/landing/*` | Hero, features, tools preview, CTA, footer |
| `src/components/guide/*` | Guide sidebar, sections, data |

### Auth & settings

| Path | Does |
|------|------|
| `src/components/auth/AuthShell.tsx` | Auth page layout |
| `src/components/auth/AuthBackLink.tsx` | Back navigation |
| `src/components/settings/SettingsShell.tsx` | Settings layout |
| `src/components/settings/ThemePreferenceSection.tsx` | Theme toggle |
| `src/components/settings/CurrencySelector.tsx` | Currency picker |

### UI primitives

| Path | Does |
|------|------|
| `src/components/ui/Modal.tsx` | Modal dialog |
| `src/components/ui/button.tsx` | Button |
| `src/components/ui/card.tsx` | Card |
| `src/components/ui/chart.tsx` | Chart helpers (shadcn-style) |
| `src/components/ui/calendar.tsx` / `date-picker.tsx` / `popover.tsx` | Date UI |
| `src/components/ui/AppToaster.tsx` | Toasts |

### Transaction type badges (Debit / Credit)

Implemented in **`src/app/(app)/dashboard/page.tsx`** as **`TransactionEntryTypeBadge`** (used by **`SelectableTransactionRow`** — not a separate file). Premium SaaS–style pills: **`rounded-full`**, **`text-xs font-medium tracking-wide uppercase`**, leading **status dot** (`w-1.5 h-1.5 rounded-full`), tinted background + hairline border — **Credit**: emerald (`bg-emerald-500/10`, `text-emerald-400`, `border-emerald-500/20`); **Debit**: red (`bg-red-500/10`, `text-red-400`, `border-red-500/20`). Spacing: **`gap-x-3`** between category label and badge so it stays secondary to the row. Dark mode: slightly stronger borders (`dark:border-*-500/25`).

### Session

| Path | Does |
|------|------|
| `src/components/session/SessionIdleTracker.tsx` | Idle timeout → sign out |
| `src/components/providers.tsx` | Context + idle tracker |

---

## Data layer

### API routes (`src/app/api`)

| Path | Does |
|------|------|
| `src/app/api/auth/attempt/route.ts` | Per-IP rate limit probe before login/signup (204 / 429) |
| `src/app/api/transactions/route.ts` | POST create transaction |
| `src/app/api/transactions/[id]/route.ts` | PATCH update transaction |
| `src/app/api/transactions/bulk/route.ts` | DELETE bulk |
| `src/app/api/transactions/import/route.ts` | POST CSV (validated rows) |
| `src/app/api/parse-pdf/route.ts` | Legacy: PDF → raw extracted text (deprecated; use `/api/parse-file`) |
| `src/app/api/parse-file/route.ts` | **PDF AI parser** (auth + rate-limit): pdf-parse → `mergeShortLines` (joins lines < 15 chars with next line) → `detectStructure` (`table` \| `ledger` based on header keywords / line count) → OpenAI with structure-hint prompt → **double-pass validation** (ISO date regex, description ≥ 3 chars, numeric amount > 0) → **`computeConfidence(tx)`** (scores 0–1: -0.3 invalid date, -0.4 invalid amount, -0.2 desc < 4 chars, -0.3 missing type, -0.5 noise words "total/balance/opening/closing/…") → safety cap 200 rows → `{ transactions: ParsedTransaction[] }`. `ParsedTransaction` includes `confidence?: number`. Debug: logs `RAW TEXT SAMPLE` + `PARSED COUNT`. Used by `ImportTransactionsClient`. |
| `src/app/api/profile/budget/route.ts` | PATCH monthly budget |
| `src/app/api/profile/currency/route.ts` | PATCH preferred currency |
| `src/app/api/ai-insights/route.ts` | POST `{ analytics, currency, anomalies? }`. **Flow:** rate-limit check → build **enriched `InsightsSummary`** (computes `avgDailySpend`, `unusualSpikes`, top-5 `categoryBreakdown`, passes through client-detected `anomalies`) → cache key = `month_key:hashAnalytics(analytics)` (hash busts cache when totals/count change) → read `ai_insights_cache` (validates `AIInsight[]`; skips legacy `string[]`) → on miss: logs `🔥 AI MODEL USED` → `generateAIInsights(summary, MODEL)` → upsert cache. Returns `{ insights, anomalies }`. Dev: logs `AI SUMMARY BUILT`. |
| `src/app/api/categorize/route.ts` | **AI category fallback** (auth + dual rate-limit: 5/min user, 20/min IP). POST `{ description }` → gpt-4o-mini with minimal prompt → returns `{ category, confidence }`. `confidence` is 0.75 for non-other AI picks, 0.4 for `other`. Client caches result in `category-memory` AI store to avoid repeat calls. Called by `TransactionEditModal` with 600ms debounce after typing stops, only when rules return nothing. |

**Flow:** Browser uses `authedFetch` + Bearer token → Route Handler uses `supabase-server` + RLS/user scoping + `rate-limit` + `sensitive-inputs` validation.

### Supabase

| Path | Does |
|------|------|
| `src/lib/supabase.ts` | Client singleton |
| `src/lib/supabase-server.ts` | Server auth + DB from access token |
| `supabase/migrations/*.sql` | Schema (profiles, transactions `transaction_type`, etc.) |

---

## Features (cross-cutting)

### Transactions

- **Logic:** `transactions.ts`, `category-backfill.ts`, `transaction-normalizer.ts`, `validation/sensitive-inputs.ts`, `transaction-flow.ts`, `transaction-analytics.ts`
- **Soft category backfill:** `normalizeTransaction` / `fixTransactionCategory` on fetch and after edit save so legacy `other` rows display inferred buckets from description (DB unchanged until a future backfill API).
- **API:** `api/transactions/*`, `api/transactions/import`
- **UI:** `dashboard/page.tsx` (list, add, filters, bulk), `TransactionEditModal.tsx`

### Dashboard

- **Logic:** `transaction-analytics.ts`, `spending-insights.ts`, `recurring-transactions.ts`, `financial-health-score.ts`, `profile-budget.ts`, `ai-insights.ts` (server)
- **UI:** Dashboard page + dashboard components (cards, charts, insights)
- **Profiles & currency:** `loadDashboard` → **`fetchProfileBudget`**; **`CurrencyProvider`** → **`fetchPreferredCurrency`** — both use **`fetchProfilePreferences`** (`profiles`: `monthly_budget`, `preferred_currency`, keyed by `id`). **`PROFILE FETCH ERROR`** logged on Supabase errors.
- **AI insights + anomaly detection (user-controlled):** No auto-fetch on page load. Toggle switch (`aiEnabled` state) above `FinancialInsights` card controls activation. **`handleToggleAI`**: sets `aiEnabled`; if turning ON and no data yet, calls `fetchAIInsights()`; if turning OFF, clears `aiAnomalies`. **`fetchAIInsights`**: calls `detectAnomalies(transactions, analytics, currency)` → `Anomaly[]` (max 3) → sends with `POST /api/ai-insights { analytics, currency, anomalies }` → `ai_insights_cache` → `generateAIInsights` on cache miss (AI prompt includes anomaly context); sets `aiLastUpdated` + `aiAnomalies` on success. When OFF: both `aiInsights` and `aiAnomalies` are null. When ON: `Anomaly[]` flows to `AnomalySection` (above AI cards); `AIInsight[]` flows to `AIInsightSection`. Regenerate button + last-updated timestamp shown while enabled. Zero token usage until user explicitly enables.

### Tools (tax, rent vs buy, credit, decision)

- **Logic:** `tax-estimator.ts`, `rent-vs-buy.ts`, `credit-score-sim.ts`, `decision-engine.ts`
- **UI:** `(app)/tools/*/page.tsx` + matching `*Client.tsx` + `ToolPageShell`

### Unified import (CSV + PDF)

- **UI:** `ImportTransactionsClient.tsx` — single upload area, single editable preview, single confirm path
- **CSV flow:** `parseTransactionCsvFile` (client) → `PreviewRow[]` → `ParsedTransaction[]` → **`normalizeParsedTransactions`** → editable `PdfPreviewRow[]`
- **PDF flow:** POST `/api/parse-file` (auth + rate-limit) → pdf-parse → `mergeShortLines` → `detectStructure` → OpenAI (structure-hint prompt, `temperature: 0.1`) → server-side double-pass validation (ISO date, description ≥ 3, numeric amount, cap 200) → `computeConfidence` per row → `ParsedTransaction[]` → **`normalizeParsedTransactions`** (client, preserves `confidence`) → editable `PdfPreviewRow[]`
- **Confidence UI:** rows with `confidence < 0.5` get red bg + red `AlertCircle` icon; `< 0.75` get amber bg + amber icon; `title` tooltip "Low/Moderate confidence — please verify"; `uncertainCount` drives **"Uncertain (N)"** filter toggle (amber when active) in preview header — filters to `confidence < 0.75` sorted lowest-first; CSV rows (no confidence) treated as 1.0
- **Normalizer** (`normalizeParsedTransactions`): raw → normalize → validate → preview. Merges consecutive short descriptions (< 5 chars), drops missing date/amount, multi-format date parsing (YYYY-MM-DD, DD-MMM-YYYY, DD-MM-YYYY, DD/MM/YYYY), infers type from amount sign, drops noise rows (balance/total/opening/closing), replaces empty descriptions with "Unknown transaction", title-cases ALL_CAPS, deduplicates (date+amount+desc key), sorts date desc, dev logs cleaned/removed counts. Returns `{ transactions, droppedCount, dedupedCount }`
- **API (parse):** `api/parse-file/route.ts` — PDF only; `api/parse-pdf/route.ts` — legacy, raw text
- **API (import):** `api/transactions/import/route.ts` — shared by both paths; uses `finalizeTransactionCategory` via `sensitive-inputs.ts`
- **Category:** `resolvePdfImportCategory` called on every row at import time (keywords → credit→income fallback)
- **`parseSource`** (`'csv'` | `'ai'`): drives copy differences in preview (neutral vs AI-caution)

### Auth & profile

- **UI:** `login`, `signup`, `AuthShell`
- **Context:** `contexts/auth-context.tsx`
- **API:** `api/auth/attempt`, profile routes

---

## Contexts

| Path | Does |
|------|------|
| `src/contexts/auth-context.tsx` | Supabase session, user |
| `src/contexts/currency-context.tsx` | Preferred currency for formatting; after auth, **`fetchPreferredCurrency`** → `profiles` (via `profile-budget`); logs **`PROFILE FETCH ERROR`** on failure; localStorage fallback |

---

## How modules relate (mental model)

```
User UI (app/*, components/*)
    → authed-api / supabase client
    → API routes (validation → supabase-server → DB)
    → lib/* analytics & insights ← same Transaction shape from DB
```

---

## Keeping this updated

1. After adding a **new route** or **API file**, add one row under **Pages** or **Data layer**.  
2. After adding **shared business logic**, add it under **Core Logic** and reference which feature uses it.  
3. Optional: run a quick `rg` or file search for `src/lib` / `src/app/api` when doing a periodic refresh.

No build step is required for this map; it is documentation only.

---

## UI Polish Phase – Premium Refinements

Changes applied across the UI to elevate from "clean" → "premium SaaS (Stripe/Linear level)". Only styling, layout, spacing, and micro-interactions were modified — no business logic, API, or state was changed.

| Component / File | Change |
|------------------|--------|
| `NetSavingsCard.tsx` | Added `scale-[1.02]`, conditional green glow shadow when savings are positive, `font-bold` on value for stronger hierarchy |
| `SummaryCard.tsx` | Added optional `subdued` prop — reduces value to `text-2xl font-medium` for secondary cards; applied to "Top spending category" card in dashboard |
| `FinancialHealthCard.tsx` | Converted from stacked layout to compact inline row: icon + label + score + sub-label on one line, explanation as small text below; reduced padding (`py-3.5`/`py-4`) |
| `FinancialInsights.tsx` | `line-clamp-3` on AI insight descriptions; reduced vertical spacing (`space-y-2`, `mt-2.5`); hover tint on insight/AI cards; anomaly cards upgraded to stronger colored border (`border-*-400/60`) + directional glow shadow; slightly larger anomaly icon (`text-lg`) |
| `dashboard/page.tsx` | Input `inputClass` now uses `focus:ring-1 focus:ring-blue-500/30` + subtle focus glow shadow; submit button `hover:scale-[0.98]`; transaction row unselected hover upgraded to `hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40` |
| `tools/page.tsx` | Lucide icons per tool (BarChart2, Calculator, GitCompare, Home, FileInput) in indigo icon container; `min-h-[140px]` cards; `hover:shadow-lg`; tightened header spacing |
| `settings/SettingsShell.tsx` | Active nav item: stronger highlight with `shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]` + `dark:bg-indigo-500/20`; inactive hover adds text color change; nav `pr-4 → pr-3` |
| `ImportTransactionsClient.tsx` | Upload box idle hover: brighter dashed border (`indigo-500/70`) + directional glow (`shadow-[0_0_16px_2px_rgba(99,102,241,0.08)]`) |
