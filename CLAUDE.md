@AGENTS.md

## Dark Mode

- **Strategy:** Tailwind v4 class-based (`@variant dark (&:where(.dark, .dark *))`). The `.dark` class on `<html>` activates all `dark:` utilities and CSS variable overrides.
- **Preference:** Settings → Appearance (`ThemePreferenceSection`) and `src/lib/theme-preference.ts` — `localStorage` key `theme` is `'dark'` | `'light'` | `'system'` (default); `system` follows `prefers-color-scheme` and listens for changes.
- **FOUC prevention:** Inline script in `src/app/layout.tsx` `<head>` runs before first paint. DO NOT remove it.
- **CSS vars:** `.dark { --background, --foreground, --chart-grid }` in `globals.css`.

## Layout

- **Page padding:** `px-4 sm:px-6 lg:px-8` on all page containers.
- **Vertical rhythm:** `py-8 sm:py-10` on page containers.
- **Max width:** `max-w-6xl` for dashboard/tools index; `max-w-2xl` for tool detail pages.
- **Nav padding** matches content: `px-4 sm:px-6 lg:px-8`.

## Design System

**Font:** Geist Sans (loaded via `next/font/google`, CSS var `--font-geist-sans`)  
**Colors:** Zinc neutral palette. Semantic: emerald=success, amber=warning, red=error, blue=rent, violet=buy  
**Cards:** `rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950`  
**Primary button:** `rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200`  
**Input:** `rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20`  
**Result panels:** add `result-panel` class — animates in via `@starting-style` (defined in globals.css)  
**Charts:** use `stroke="var(--chart-grid)"` for grid lines (CSS var handles dark mode)

## Routes

| Path | Description |
|------|-------------|
| `/` | Public landing (signed-in and signed-out users; no auto-redirect) |
| `/login` | Login page |
| `/signup` | Signup page |
| `/dashboard` | Main dashboard — transactions, analytics, charts |
| `/tools` | Tool index grid |
| `/tools/credit-score` | Credit Score Simulator — sliders, factor breakdown cards, delta, AI explain |
| `/tools/tax-estimator` | Tax Estimator (INR) — 80C/HRA/standard deductions, slab bars, AI optimize |
| `/tools/decision-engine` | Financial Decision Engine |
| `/tools/financial-report` | AI Monthly Financial Report — summary, risks, opportunities, recommendations |
| `/tools/import-transactions` | CSV Import |
| `/settings` | Settings (appearance, currency) |
| `/guide` | In-app guide / learn section — public, uses LandingNavbar + Footer |

## Architecture

- **Auth:** Supabase auth via `AuthContext` (`src/contexts/auth-context.tsx`)
- **Idle timeout:** `SessionIdleTracker` in `Providers` — after 15 minutes without pointer/keyboard/click/scroll (throttled), user is signed out and sent to `/login?reason=idle`; warning modal with countdown at 14 minutes. Client-only UX; enforce session limits server-side separately if needed.
- **Sensitive writes:** Prefer Route Handlers under `src/app/api/` with `Authorization: Bearer <access_token>` and `supabase.auth.getUser()` via `createSupabaseFromAccessToken` (`src/lib/supabase-server.ts`). Client helpers: `authedFetch` / `readAuthedJson` (`src/lib/authed-api.ts`). Rate limits: in-memory Map in `src/lib/rate-limit.ts` (fixed windows, auto reset after `resetAt`; auth = IP-only; mutations = per-user + per-IP dual caps).
- **Sign-out:** `AppNavbar` (`src/components/layout/AppNavbar.tsx`) — primary sign-out control in the global app header (keep a single obvious sign-out entry point).
- **App layout:** `src/app/(app)/layout.tsx` renders `AppShell`
- **AppShell:** `src/components/layout/AppShell.tsx` — client shell; renders sticky `AppNavbar` + page `<main>` (no sidebar inset).
- **AppNavbar:** `src/components/layout/AppNavbar.tsx` — logo links to `/`; centered Dashboard & Tools with active state; settings icon → `/settings`; sign-out on the right. Mobile: hamburger opens left drawer (Dashboard, Tools, Settings) with backdrop; sign-out stays visible in the header.
- **LandingNavbar:** `src/components/layout/LandingNavbar.tsx` — used on `/` and `/guide`. Nav links: Features (scroll), Tools (scroll), Guide (`/guide`). Primary CTA → `/dashboard` — label **Get Started** when signed out, **Go to Dashboard** when signed in; mobile keeps that CTA visible next to the menu button.
- **Brand wordmark:** `BrandLogoLink` (`src/components/layout/BrandLogoLink.tsx`) — **FlowFi** always links to `/` (landing). Use in navbars, footer, and any sidebar/mock sidebar so the target never drifts.
- **Mobile drawer (app):** in `AppNavbar`; `translate-x-0`/`-translate-x-full` with `cubic-bezier(0.32, 0.72, 0, 1)` (280ms)
- **AI insights:** `src/app/api/ai-insights/route.ts` (POST) — receives `{ analytics: AnalyticsBundle, currency }`, checks `ai_insights_cache` Supabase table (keyed on `user_id + month_key`), calls OpenAI `gpt-4o-mini` on cache miss, upserts result. Dashboard fetches this after transactions load; falls back to rule-based `buildExpenseInsights` on error. Needs `OPENAI_API_KEY` env var. Service layer: `src/lib/ai-insights.ts` (server-only).
- **Decision Engine API:** `src/app/api/decision-engine/route.ts` (POST) — receives `{ question: string }`, fetches user transactions, runs `computeAnalytics`, calls OpenAI `gpt-4o-mini` with `response_format: json_object`, returns `{ summary, verdict, confidence, reasons[], suggestions[] }`. Rate limits: 5/min per user, 20/min per IP. In-process cache (5 min TTL) keyed on hash(question + totalSpending + totalIncome + transactionCount). Falls back gracefully if transactionCount < 3. UI: `src/components/tools/DecisionEngineClient.tsx`.
- **Credit Score Explain API:** `src/app/api/credit-score-explain/route.ts` (POST) — receives `{ score, result: CreditSimResult }`, returns `{ insights: string[] }` (2–3 sharp AI insights). Rate limits: 5/min user, 20/min IP.
- **Tax Optimize API:** `src/app/api/tax-optimize/route.ts` (POST) — receives `{ estimate: TaxEstimate }`, returns `{ insights: string[] }` (2–3 optimization tips referencing specific rupee amounts). Rate limits: 5/min user, 20/min IP.
- **Financial Report API:** `src/app/api/financial-report/route.ts` (POST) — fetches user transactions, builds analytics snapshot, calls OpenAI `gpt-4o-mini`, returns `FinancialReport { summary, spendingAnalysis, incomeAnalysis, risks[], opportunities[], recommendations[], generatedAt }`. In-process cache (10 min TTL). Falls back if transactionCount < 5. UI: `src/components/tools/FinancialReportClient.tsx`.
- **Credit Score Simulator lib:** `src/lib/credit-score-sim.ts` — `CreditSimInputs` now includes `hardInquiries`. `CreditSimResult` now includes `delta` (vs baseline 650) and `factors: CreditFactor[]` (label, impact, explanation). Client uses real-time sliders (no form submit).
- **Tax Estimator lib:** `src/lib/tax-estimator.ts` — `estimateIncomeTax(income, deductions?)` accepts `TaxDeductions { section80C, hra, standardDeduction }`. Returns `TaxEstimate` with `grossIncome`, `totalDeductions`, `taxableIncome`, `suggestions[]`.
- **Categorize API:** `src/app/api/categorize/route.ts` (POST) — receives `{ description: string }`, calls OpenAI `gpt-4o-mini` to classify into: food, transport, entertainment, subscriptions, utilities, shopping, transfer, income, other. Rate limits: 5/min user, 20/min IP. Returns `{ category, confidence }`. Dashboard "Add transaction" form has an **Auto-detect category (AI)** toggle that debounces (600ms) description input → calls this API → updates the category field (only if user hasn't manually overridden). Cache: last 5 results in-memory per session.
- **Tools page:** `src/app/(app)/tools/page.tsx` — grouped into AI Tools / Simulators / Data sections with section headers and AI badge.
