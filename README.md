# FlowFi — Financial Intelligence Platform

**A modular web app to track spending, visualize patterns, and run practical financial tools—all backed by secure auth and data you own.**

---

## Description

FlowFi is a **financial intelligence platform** built for clarity, not noise. Users sign in, log transactions, and see **analytics**, **plain-language insights**, and a growing set of **decision tools**. A **CSV import** path lets you bring historical activity into the same pipeline your dashboard already uses—no separate spreadsheets required.

---

## Features

- **Expense tracking** — Create and list transactions tied to your account (CRUD-oriented flows).
- **Analytics dashboard** — Summary cards, category and time-series **charts**, and month-over-month context.
- **Financial insights** — Readable takeaways from your data (e.g. spending pace, category focus).
- **Decision Engine** — **Affordability-style** analysis from income, spending, and a purchase amount.
- **Rent vs Buy** — Simple rent totals vs. a stylized purchase-cost estimate over your planned horizon.
- **Tax Estimator** — Illustrative **Indian slab** model with **per-slab breakdown** (educational only).
- **Credit Score Simulator** — **Toy weighted model** from payment history, utilization, age, and mix (not FICO/Vantage/bureau logic).
- **CSV transaction import** — Upload, **preview**, and batch-insert rows (`date`, `description`, `amount`) into `transactions`.

---

## Tech Stack

| Layer        | Technology |
| ------------ | ---------- |
| Frontend     | **Next.js** (App Router, React) |
| Backend / DB | **Supabase** (Postgres, Auth, Row Level Security) |
| Styling      | **Tailwind CSS** |
| Charts       | **Recharts** |
| CSV parsing  | **PapaParse** |

---

## Architecture Overview

- **Frontend:** Next.js client UI with route groups for the **app shell** (`/dashboard`, `/tools/*`) and **auth** pages (`/login`, `/signup`). Data flows through the Supabase JS client and React hooks/context where appropriate.
- **Backend:** Supabase hosts **Postgres**, **Auth**, and API access from the browser using the **anon** key. **Row Level Security (RLS)** is assumed on `transactions` (and related tables) so each user only reads/writes **their own rows**.
- **Modular tools:** Financial utilities live under **`/tools`** (e.g. tax, rent vs buy, decision engine, credit score simulator, CSV import)—each route is a focused surface so new tools can ship without rewiring the core dashboard.

---

## Key Highlights

- **Security-minded** — RLS-friendly design; secrets stay in env, not in the repo.
- **Practical tooling** — Calculators and simulators aimed at real decisions, clearly labeled as illustrative where needed.
- **Modular product shape** — Dashboard vs. tools vs. auth are separated for easier iteration.
- **Import pipeline** — Validate and preview CSV data **before** it hits your ledger.

---

## Live Demo

**[Add your deployment URL](https://example.com)** — *Replace with production or Vercel link when ready.*

---

## Screenshots

| Area | Preview |
| ---- | ------- |
| Dashboard & analytics | *Coming soon — add image* |
| Tools hub | *Coming soon — add image* |
| Tax / import / credit sim | *Coming soon — add image* |

---

## Getting Started

### Prerequisites

- Node.js **18+** (recommended: current LTS)
- npm (or compatible package manager)
- A [Supabase](https://supabase.com) project with Auth and tables your app expects (`profiles`, `transactions`, etc.)

### Local setup

```bash
git clone https://github.com/vezudict/flowfi.git
cd flowfi
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

### Build

```bash
npm run build
npm start
```

---

## Environment Variables

Create **`.env.local`** in the project root (never commit it):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the **Project URL** and **anon public** key from the Supabase dashboard (**Settings → API**).

---

## Future Improvements

- **AI-based insights** — Deeper, personalized narratives from transaction history.
- **PDF statement parsing** — Ingest bank exports beyond CSV.
- **Auto categorization** — Rules or ML-assisted category assignment.
- **Financial health score** — A single signal users can track over time.

---

## Disclaimer

FlowFi is **not financial, tax, or legal advice**. All numbers, calculators, and tax outputs are **approximate, simplified, or illustrative**—including the tax slabs, credit score **simulator** (not bureau-grade), and import mapping—**inappropriate substitutes** for a qualified professional, lender, or official filing rules. Use at your own discretion.

---

## License

This project is provided as-is for demonstration and learning. Add a `LICENSE` file if you plan to open-source under specific terms.
