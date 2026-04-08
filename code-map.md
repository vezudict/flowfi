# FlowFi Code Map

Structured overview for humans and AI: **where logic lives**, **where UI renders**, and **how modules relate**.  
**Maintenance:** Update this file (and `code-map.ts` if you use it) when you add routes, API handlers, or major `src/lib` modules.

---

## Core Logic

| Path | Does | Affects / relates to |
|------|------|----------------------|
| `src/lib/transaction-analytics.ts` | Monthly totals, pie/bar series, net savings, income vs debit splits | Dashboard charts, summary cards |
| `src/lib/transaction-flow.ts` | `isExpenseForMetrics` / `isIncomeForMetrics` (debit vs credit rules) | Analytics, insights, charts |
| `src/lib/spending-insights.ts` | Savings, expense, income, recurring insight bullets | `FinancialInsights` |
| `src/lib/recurring-transactions.ts` | Detect recurring debits, insight copy | Dashboard insights, row badges |
| `src/lib/financial-health-score.ts` | Composite score from ledger + budget | `FinancialHealthCard` |
| `src/lib/category-suggestion.ts` | Description → category rules; analytics label normalization | Add form, charts |
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
| `src/lib/parse-transactions-from-text.ts` | Text → transaction candidates | PDF / parsing pipeline |
| `src/lib/transactions.ts` | Client fetch/delete helpers; `Transaction` type | Dashboard, modals |
| `src/lib/authed-api.ts` | Bearer `fetch` + JSON helpers | Client → API routes |
| `src/lib/supabase-server.ts` | Service role / user from token for Route Handlers | All `api/*` mutations |
| `src/lib/supabase.ts` | Browser Supabase client | Auth context, client data |
| `src/lib/ensure-profile.ts` | Ensure profile row exists | Auth flows |
| `src/lib/profile-budget.ts` | Fetch monthly budget | Dashboard |
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
| `src/app/(app)/dashboard/page.tsx` | Dashboard: analytics, charts, add tx, filters, bulk actions | Main product surface |
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
| `src/components/dashboard/SummaryCard.tsx` | Metric card |
| `src/components/dashboard/NetSavingsCard.tsx` | Net savings (income − expenses) |
| `src/components/dashboard/MonthlyBudgetCard.tsx` | Budget vs spent |
| `src/components/dashboard/FinancialHealthCard.tsx` | Health score UI |
| `src/components/dashboard/FinancialInsights.tsx` | Sectioned insight lists |
| `src/components/dashboard/CategoryPieChart.tsx` | Recharts donut (category breakdown) |
| `src/components/dashboard/SpendingBarChart.tsx` | Recharts bar (daily series) |
| `src/components/dashboard/TransactionEditModal.tsx` | Edit transaction |

### Tools

| Path | Does |
|------|------|
| `src/components/tools/ToolPageShell.tsx` | Shared tool page layout |
| `src/components/tools/CreditScoreSimClient.tsx` | Credit score interactive UI |
| `src/components/tools/TaxEstimatorClient.tsx` | Tax estimator UI |
| `src/components/tools/DecisionEngineClient.tsx` | Decision engine UI |
| `src/components/tools/RentVsBuyClient.tsx` | Rent vs buy UI |
| `src/components/tools/ImportTransactionsClient.tsx` | CSV import UI + API |
| `src/components/tools/PdfBankStatementUpload.tsx` | PDF upload → parse flow |

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
| `src/app/api/parse-pdf/route.ts` | PDF → extracted text / parse |
| `src/app/api/profile/budget/route.ts` | PATCH monthly budget |
| `src/app/api/profile/currency/route.ts` | PATCH preferred currency |

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

- **Logic:** `transactions.ts`, `validation/sensitive-inputs.ts`, `transaction-flow.ts`, `transaction-analytics.ts`
- **API:** `api/transactions/*`, `api/transactions/import`
- **UI:** `dashboard/page.tsx` (list, add, filters, bulk), `TransactionEditModal.tsx`

### Dashboard

- **Logic:** `transaction-analytics.ts`, `spending-insights.ts`, `recurring-transactions.ts`, `financial-health-score.ts`, `profile-budget.ts`
- **UI:** Dashboard page + dashboard components (cards, charts, insights)

### Tools (tax, rent vs buy, credit, decision)

- **Logic:** `tax-estimator.ts`, `rent-vs-buy.ts`, `credit-score-sim.ts`, `decision-engine.ts`
- **UI:** `(app)/tools/*/page.tsx` + matching `*Client.tsx` + `ToolPageShell`

### CSV import

- **Logic:** `csv-transactions.ts`, import validation in `sensitive-inputs.ts`
- **UI:** `ImportTransactionsClient.tsx`, `import-transactions/page.tsx`
- **API:** `api/transactions/import/route.ts`

### PDF import

- **Logic:** `parse-transactions-from-text.ts` (and related parsing)
- **UI:** `PdfBankStatementUpload.tsx`
- **API:** `api/parse-pdf/route.ts`

### Auth & profile

- **UI:** `login`, `signup`, `AuthShell`
- **Context:** `contexts/auth-context.tsx`
- **API:** `api/auth/attempt`, profile routes

---

## Contexts

| Path | Does |
|------|------|
| `src/contexts/auth-context.tsx` | Supabase session, user |
| `src/contexts/currency-context.tsx` | Preferred currency for formatting |

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
