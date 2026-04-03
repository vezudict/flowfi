@AGENTS.md

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
| `/` | Public landing (redirects auth users to `/dashboard`) |
| `/login` | Login page |
| `/signup` | Signup page |
| `/dashboard` | Main dashboard — transactions, analytics, charts |
| `/tools` | Tool index grid |
| `/tools/credit-score` | Credit Score Simulator |
| `/tools/tax-estimator` | Tax Estimator (INR) |
| `/tools/decision-engine` | Financial Decision Engine |
| `/tools/rent-vs-buy` | Rent vs Buy Calculator |
| `/tools/import-transactions` | CSV Import |

## Architecture

- **Auth:** Supabase auth via `AuthContext` (`src/contexts/auth-context.tsx`)
- **Sign-out:** Lives in `AppNav` — do not add it elsewhere
- **App layout:** `src/app/(app)/layout.tsx` wraps all authenticated pages with `AppNav`
- **Nav:** `src/components/layout/AppNav.tsx` — sticky, shows Flowfi logo + Dashboard/Tools links + sign out
