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
| `/settings` | Settings placeholder |

## Architecture

- **Auth:** Supabase auth via `AuthContext` (`src/contexts/auth-context.tsx`)
- **Sign-out:** `AppNavbar` (`src/components/layout/AppNavbar.tsx`) — primary sign-out control in the global app header (keep a single obvious sign-out entry point).
- **App layout:** `src/app/(app)/layout.tsx` renders `AppShell`
- **AppShell:** `src/components/layout/AppShell.tsx` — client shell; renders sticky `AppNavbar` + page `<main>` (no sidebar inset).
- **AppNavbar:** `src/components/layout/AppNavbar.tsx` — logo links to `/`; centered Dashboard & Tools with active state; settings icon → `/settings`; theme toggle + sign-out on the right. Mobile: hamburger opens left drawer (Dashboard, Tools, Settings) with backdrop; sign-out stays visible in the header.
- **LandingNavbar:** `src/components/layout/LandingNavbar.tsx` — used on `/` only (composed in `src/app/page.tsx`). Logo → `/`; Features & Tools scroll to `#features` / `#tools`; **Get Started** → `/dashboard`; mobile keeps **Get Started** visible next to the menu button.
- **Brand wordmark:** `BrandLogoLink` (`src/components/layout/BrandLogoLink.tsx`) — **FlowFi** always links to `/` (landing). Use in navbars, footer, and any sidebar/mock sidebar so the target never drifts.
- **Mobile drawer (app):** in `AppNavbar`; `translate-x-0`/`-translate-x-full` with `cubic-bezier(0.32, 0.72, 0, 1)` (280ms)
