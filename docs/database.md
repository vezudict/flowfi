# FlowFi database notes

Supabase **Postgres** with **Auth** and **Row Level Security (RLS)**. This document tracks what the repo’s migrations define; your hosted project may include earlier base tables (`profiles`, `transactions`) created outside these files—apply the full history in `supabase/migrations/` when provisioning a new environment.

---

## Tables touched by migrations in this repo

### `profiles`

Extensions:

- `monthly_budget` — `numeric(14,2)`, optional, non-negative; used for **budget** vs current-month spend.
- `preferred_currency` — constrained ISO codes (`INR`, `USD`, `GBP`, `EUR`, `JPY`, `CNY`); drives `formatCurrency` in the UI.

**Security:** Ensure policies allow each user to `select`/`update` only their own row (`id` = `auth.uid()`).

---

### `transactions`

Extensions:

- `transaction_type` — `text`, `not null`, `check in ('debit','credit')`; `debit` = expense, `credit` = income. Backfill migration sets values from legacy `category` heuristics where needed.

**Security:** Standard pattern: `user_id` column matches `auth.uid()` for all reads/writes. Align **RLS** with your insert/update/delete paths from the app and import API.

---

### `ai_insights_cache`

Stores cached **insights** JSON per user and key:

| Column | Purpose |
|--------|---------|
| `user_id` | Owner (`references auth.users`) |
| `month_key` | Composite key from app: includes month **and** analytics fingerprint (not only `YYYY-MM`) |
| `insights` | `jsonb` array of structured **insights** |
| `created_at` | Audit |

**RLS** (from migration): `select` / `insert` / `update` for rows where `auth.uid() = user_id`.

---

## Data isolation

- All ledger and profile reads should flow through Supabase with **RLS** so one account cannot read another’s **transactions**.
- Route Handlers use the user’s access token; do not accept `userId` from the client for authorization.

---

## Applying migrations

Run SQL in `supabase/migrations/` in chronological order on your Supabase SQL editor or via the Supabase CLI if that is your standard.

---

## Related

- [architecture.md](./architecture.md)
- Repository **`code-map.md`** — links validation and profile helpers to API routes
