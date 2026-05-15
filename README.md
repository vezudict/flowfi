# FlowFi — AI-Powered Personal Finance WebApp

FlowFi is a production-style web app for people who want **one surface** for cash flow, categorization, and decisions—not another passive tracker.

---

## Overview

FlowFi behaves like a **financial operating system**: your **transactions** feed analytics, **budget** context, a composite **health score**, and **AI insights** that react to how you actually spend. Imports (CSV and PDF) land in the same ledger as manual entries. The product goal is **clarity under auth**: your data stays tied to your account, scoped by Supabase **RLS**, with server routes for anything sensitive.

**Why it exists:** spreadsheets and bank UIs optimize for institutions. FlowFi optimizes for a single user who wants premium UX (Stripe/Linear-level polish), honest tooling labels, and automation where it helps—**insights**, **categorization**, and **statement parsing**—without training models on your ledger.

---

## Features

### Core

- **Transactions** — Manual create, edit, delete, bulk actions; list with filters and category-aware presentation.
- **Analytics** — Month view, category mix, savings vs spend; drives the dashboard and **insights** context.
- **Budget** — Monthly cap on **profiles**; compared to current-month expense totals.
- **Financial health score** — Composite signal from ledger + **budget** (see `financial-health-score`).
- **Import** — CSV pipeline with preview and validation; PDF path via extract + structured parse.

### AI

- **Insights** — On-demand **insights** from `POST /api/ai-insights` using OpenAI; cache keyed per user and month + analytics fingerprint.
- **Categorization** — Keyword + memory-assisted categories; optional `POST /api/categorize` for AI-assisted labels when configured.
- **Anomaly detection** — Rule-based signals (spikes, concentration, income drop, large purchases) fed into **insights** context.
- **PDF parsing** — `POST /api/parse-file` extracts text and uses OpenAI to return structured rows for review before commit.

### UX

- Dark/light **system** appearance, responsive shell, accessible forms, charts with theme-aware grid lines.
- Dedicated **tools** (tax estimator, rent vs buy, decision engine, credit score simulator) isolated from the core dashboard.
- Session UX with idle awareness; rate limits on sensitive API routes.

---

## AI capabilities

| Capability | What happens |
|------------|----------------|
| **Insights** | Server builds an enriched summary (totals, top categories, spikes, optional anomalies). OpenAI returns structured JSON **insights**; weak phrasing is filtered; sparse data skips the API. |
| **Anomaly detection** | Client-side `detectAnomalies` runs on the analytics bundle; results optionally inform the **insights** prompt—no black-box “magic score.” |
| **Categorization** | Keywords, user **category memory** (local), and backfill normalization keep **transactions** consistent; AI categorization is an adjunct, not the source of truth. |
| **PDF parsing** | pdf-parse extracts text; OpenAI maps lines to `{ date, description, amount, type }` for user review—data is not auto-saved until validated through your import flow. |

**Privacy:** User payloads are sent to OpenAI only for the routes you enable with `OPENAI_API_KEY`. FlowFi does not use your **transactions** to train foundation models; it invokes the API as a configured third-party service under your keys.

---

## Architecture

```
Browser (Next.js App Router)
    ├─ Supabase Auth (anon client, session)
    ├─ authedFetch → Route Handlers (/api/*)
    │       └─ Bearer token → createSupabaseFromAccessToken → auth.getUser()
    │       └─ Postgres via RLS-scoped client
    └─ OpenAI (server-only): ai-insights, parse-file, categorize

Supabase: Postgres + Auth + RLS on user-owned tables
```

See **[docs/architecture.md](./docs/architecture.md)** for a deeper pass.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| App framework | **Next.js 16** (App Router, React 19) |
| Auth & database | **Supabase** (Postgres, Auth, RLS) |
| Styling | **Tailwind CSS v4** |
| Charts | **Recharts** |
| CSV | **PapaParse** |
| PDF text | **pdf-parse** |
| AI | **OpenAI** Chat Completions (HTTP) |
| Motion / UI primitives | **Framer Motion**, **Radix**, **Sonner** |

---

## Screenshots

Add PNG/WebP previews under **`public/screenshots/`** (e.g. `dashboard.png`, `tools.png`, `import.png`) and link them here when you want the README to pop on GitHub.

```text
public/screenshots/
  dashboard.png   — main ledger + charts + insights
  tools.png       — tools index
  import.png      — CSV / PDF import flow
```

---

## Setup

1. **Clone**

   ```bash
   git clone https://github.com/vezudict/flowfi.git
   cd flowfi
   ```

2. **Install**

   ```bash
   npm install
   ```

3. **Environment** — Copy [`.env.example`](./.env.example) to `.env.local` and fill in values (see below).

4. **Database** — Create a Supabase project; apply migrations under `supabase/migrations/` in order (or use the Supabase CLI if you use it for your workflow).

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Production build**

   ```bash
   npm run build
   npm start
   ```

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon (public) key |
| `OPENAI_API_KEY` | For AI routes | **Insights**, PDF parse, categorize |
| `OPENAI_MODEL` | No | Overrides default chat model (e.g. `gpt-4o-mini`) |
| `NEXT_PUBLIC_DEBUG_FLOWFI_TX` | No | Set to `1` for verbose transaction/debug logging in dev |

Never commit `.env.local`. Use **`.env.example`** as the template only.

---

## Data & security

- **RLS** — `ai_insights_cache` policies in migrations scope rows by `auth.uid()`. Your `transactions` and **profiles** tables should follow the same pattern in your Supabase project so users only read/write their own data.
- **API** — Mutations and AI routes expect `Authorization: Bearer <access_token>`; the server verifies the user with `supabase.auth.getUser()` and does not trust client-supplied user IDs for authorization.
- **Rate limits** — Selected routes use in-memory fixed windows (per IP / per user) to limit abuse.
- **Training** — FlowFi does not ship user **transactions** to OpenAI for model training; it uses request/response APIs you configure.

Details: **[docs/database.md](./docs/database.md)**.

---

## Project structure

| Path | Role |
|------|------|
| `src/app/` | Routes: landing, auth, `(app)` dashboard, **tools**, API route handlers |
| `src/components/` | UI: layout, dashboard cards, **transactions** list/modals, import client |
| `src/lib/` | Analytics, **insights**, categories, formatters, Supabase helpers, validation |
| `src/contexts/` | Auth and related providers |
| `supabase/migrations/` | SQL for **profiles**, **transactions**, **insights** cache |
| `public/` | Static assets; add **`screenshots/`** for README images |

---

## Roadmap

- Bank-linking or OFX (if you want regulated-grade ingestion).
- Multi-account / multi-currency ledgers beyond display currency.
- Export (CSV/Sheets) from filtered **transactions**.
- Deeper **budget** envelopes and roll-ups.
- Optional self-hosted or regional AI backends for enterprises.

---

## Contributing

Issues and PRs welcome. Keep changes focused; match existing patterns for **transactions**, API auth, and Tailwind tokens. Update **`code-map.md`** when you add major routes or libraries.

---

## Disclaimer

FlowFi is **not** financial, tax, or legal advice. Calculators and **insights** are illustrative. The credit score path is a **simulator**, not a bureau score.

---

## License

[MIT](./LICENSE)
