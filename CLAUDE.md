@AGENTS.md

## Dark Mode

- **Strategy:** Tailwind v4 class-based (`@variant dark (&:where(.dark, .dark *))`). The `.dark` class on `<html>` activates all `dark:` utilities and CSS variable overrides.
- **Toggle:** `ThemeToggle` component (`src/components/layout/ThemeToggle.tsx`) — reads/writes `localStorage` key `theme` (`'dark'` | `'light'`), falls back to system preference.
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
- **Sign-out:** Lives in `Sidebar` (`src/components/layout/Sidebar.tsx`) — do not add it elsewhere
- **App layout:** `src/app/(app)/layout.tsx` renders `AppShell`
- **AppShell:** `src/components/layout/AppShell.tsx` — client component managing mobile sidebar state; renders desktop `Sidebar` + mobile drawer + `AppNav` + page content
- **Sidebar:** `src/components/layout/Sidebar.tsx` — desktop fixed sidebar (`lg:w-60`); exports `SidebarNav` (shared nav content) and `Sidebar` (desktop container). Nav items: Dashboard, Tools, Settings. Sign-out and ThemeToggle at bottom.
- **AppNav:** `src/components/layout/AppNav.tsx` — mobile-only top bar (`lg:hidden`); hamburger + Flowfi logo + ThemeToggle. Accepts `onMenuClick` prop.
- **Mobile drawer:** rendered in `AppShell`; uses `translate-x-0`/`-translate-x-full` CSS transition with `cubic-bezier(0.32, 0.72, 0, 1)` easing (iOS drawer curve, 280ms)
- **Desktop content offset:** `lg:pl-60` on content wrapper in `AppShell` compensates for fixed sidebar
