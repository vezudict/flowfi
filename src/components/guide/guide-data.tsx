import type { ReactNode } from 'react'

/* ── types ────────────────────────────────────────────────── */
export type GuideStep = {
  step: number
  text: string
}

export type GuideTip = {
  label: string
  text: string
}

export type GuideSectionData = {
  id: string
  title: string
  description: string
  icon: ReactNode
  steps: GuideStep[]
  mockUI: ReactNode
  tips?: GuideTip[]
}

/* ── icons ────────────────────────────────────────────────── */
export function IconRocket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

export function IconLayout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="9" x2="9" y1="21" y2="9" />
    </svg>
  )
}

export function IconPlusCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  )
}

export function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

export function IconPieChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}

export function IconLightbulb() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  )
}

export function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

export function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/* ── mock UI components ───────────────────────────────────── */
function MockInput({ label, placeholder, value }: { label: string; placeholder?: string; value?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300">
        {value ?? <span className="text-zinc-600">{placeholder}</span>}
      </div>
    </div>
  )
}

function MockSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300">
        <span>{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

function MockButton({ label, variant = 'primary' }: { label: string; variant?: 'primary' | 'ghost' }) {
  if (variant === 'ghost') {
    return (
      <button type="button" className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-2 text-sm font-medium text-zinc-300 pointer-events-none">
        {label}
      </button>
    )
  }
  return (
    <button type="button" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 pointer-events-none">
      {label}
    </button>
  )
}

function MockCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 ${className}`}>
      {children}
    </div>
  )
}

/* ── mock: getting started ───────────────────────────────── */
function MockSignupUI() {
  return (
    <MockCard>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 text-xs font-bold">F</div>
        <span className="text-sm font-semibold text-zinc-100">FlowFi</span>
      </div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Create your account</p>
      <div className="space-y-3">
        <MockInput label="Email" placeholder="you@example.com" />
        <MockInput label="Password" placeholder="••••••••" />
        <MockButton label="Create Account" />
      </div>
      <p className="mt-3 text-xs text-zinc-600">Already have an account? <span className="text-zinc-400">Sign in</span></p>
    </MockCard>
  )
}

/* ── mock: dashboard overview ─────────────────────────────── */
function MockDashboardUI() {
  const bars = [60, 85, 45, 90, 70, 55, 80]
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Income', value: '₹42,500', color: 'text-emerald-400' },
          { label: 'Expenses', value: '₹28,200', color: 'text-red-400' },
          { label: 'Net Balance', value: '₹14,300', color: 'text-zinc-100' },
        ].map((card) => (
          <MockCard key={card.label} className="!p-3">
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className={`mt-1 text-sm font-bold ${card.color}`}>{card.value}</p>
          </MockCard>
        ))}
      </div>
      <MockCard>
        <p className="mb-3 text-xs font-medium text-zinc-400">Weekly Spending</p>
        <div className="flex items-end gap-1.5 h-16">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-zinc-700 transition-all"
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] text-zinc-600">{labels[i]}</span>
            </div>
          ))}
        </div>
      </MockCard>
    </div>
  )
}

/* ── mock: add transaction ────────────────────────────────── */
function MockAddTransactionUI() {
  return (
    <MockCard>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Add Transaction</p>
      <div className="mb-4 flex rounded-lg border border-zinc-700 bg-zinc-800/40 p-0.5">
        <button type="button" className="flex-1 rounded-md bg-zinc-700 py-1.5 text-xs font-medium text-zinc-100 pointer-events-none">
          Expense
        </button>
        <button type="button" className="flex-1 py-1.5 text-xs font-medium text-zinc-500 pointer-events-none">
          Income
        </button>
      </div>
      <div className="space-y-3">
        <MockInput label="Amount" placeholder="0.00" value="2,400" />
        <MockSelect label="Category" value="Food & Dining" />
        <MockInput label="Description" placeholder="e.g. Lunch at cafe" value="Swiggy order" />
        <MockInput label="Date" value="Apr 3, 2026" />
        <MockButton label="Add Transaction" />
      </div>
    </MockCard>
  )
}

/* ── mock: csv import ─────────────────────────────────────── */
function MockCSVImportUI() {
  const rows = [
    { date: '2026-04-01', desc: 'Amazon', amount: '-1,299' },
    { date: '2026-04-02', desc: 'Salary', amount: '+42,500' },
    { date: '2026-04-03', desc: 'Electricity', amount: '-890' },
  ]

  return (
    <div className="space-y-3">
      <MockCard>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 py-6 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <p className="text-xs text-zinc-500">Drop CSV here or <span className="text-zinc-300">browse</span></p>
          <p className="text-[10px] text-zinc-600">date, description, amount columns required</p>
        </div>
      </MockCard>
      <MockCard className="!p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/40">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Description</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                <td className="px-3 py-2 text-zinc-400">{row.date}</td>
                <td className="px-3 py-2 text-zinc-300">{row.desc}</td>
                <td className={`px-3 py-2 text-right font-medium ${row.amount.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₹{row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MockCard>
    </div>
  )
}

/* ── mock: budgeting ──────────────────────────────────────── */
function MockBudgetUI() {
  const categories = [
    { name: 'Food & Dining', spent: 8200, budget: 10000, color: 'bg-amber-500' },
    { name: 'Transport', spent: 2100, budget: 3000, color: 'bg-blue-500' },
    { name: 'Shopping', spent: 5800, budget: 6000, color: 'bg-violet-500' },
    { name: 'Utilities', spent: 1200, budget: 2000, color: 'bg-emerald-500' },
  ]

  return (
    <MockCard>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Monthly Budget</p>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Apr 2026</span>
      </div>
      <div className="space-y-3.5">
        {categories.map((cat) => {
          const pct = Math.round((cat.spent / cat.budget) * 100)
          const isOver = pct >= 95
          return (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{cat.name}</span>
                <span className={isOver ? 'text-red-400' : 'text-zinc-500'}>
                  ₹{cat.spent.toLocaleString()} / ₹{cat.budget.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : cat.color}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </MockCard>
  )
}

/* ── mock: financial insights ─────────────────────────────── */
function MockInsightsUI() {
  const insights = [
    { icon: '📈', title: 'Spending up 12%', desc: 'vs last month across all categories' },
    { icon: '🍔', title: 'Top category', desc: 'Food & Dining accounts for 29% of spend' },
    { icon: '🔄', title: '3 recurring', desc: 'Netflix, Spotify, iCloud detected' },
    { icon: '💡', title: 'Avg daily spend', desc: '₹940/day so far this month' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {insights.map((ins) => (
        <MockCard key={ins.title} className="!p-3">
          <span className="text-lg leading-none">{ins.icon}</span>
          <p className="mt-2 text-xs font-semibold text-zinc-200">{ins.title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">{ins.desc}</p>
        </MockCard>
      ))}
    </div>
  )
}

/* ── mock: health score ───────────────────────────────────── */
function MockHealthScoreUI() {
  const score = 72
  const components = [
    { label: 'Savings Rate', value: 80, color: 'bg-emerald-500' },
    { label: 'Spending Control', value: 65, color: 'bg-amber-500' },
    { label: 'Budget Adherence', value: 70, color: 'bg-blue-500' },
    { label: 'Income Stability', value: 90, color: 'bg-violet-500' },
  ]

  return (
    <MockCard>
      <div className="mb-5 flex items-center gap-5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#27272a" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke="#10b981"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - score / 100)}`}
            />
          </svg>
          <div className="text-center">
            <span className="text-xl font-bold text-zinc-100">{score}</span>
            <span className="block text-[10px] text-zinc-500">/ 100</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Good</p>
          <p className="mt-0.5 text-xs text-zinc-500">Your finances are on track. Focus on spending control to improve.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {components.map((c) => (
          <div key={c.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">{c.label}</span>
              <span className="text-zinc-500">{c.value}/100</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </MockCard>
  )
}

/* ── mock: settings ───────────────────────────────────────── */
function MockSettingsUI() {
  return (
    <MockCard>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Settings</p>
      <div className="divide-y divide-zinc-800">
        <div className="py-3">
          <p className="text-xs font-medium text-zinc-300">Appearance</p>
          <div className="mt-2.5 flex gap-2">
            {['Light', 'Dark', 'System'].map((t, i) => (
              <button
                key={t}
                type="button"
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium pointer-events-none ${
                  i === 1
                    ? 'border-zinc-500 bg-zinc-700 text-zinc-100'
                    : 'border-zinc-800 text-zinc-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="py-3">
          <p className="text-xs font-medium text-zinc-300">Currency</p>
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🇮🇳</span>
              <span className="text-xs text-zinc-300">Indian Rupee (₹)</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        <div className="py-3">
          <p className="text-xs font-medium text-zinc-300">Monthly Budget Limit</p>
          <div className="mt-2.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300">
            ₹30,000
          </div>
        </div>
      </div>
    </MockCard>
  )
}

/* ── mock: tips ───────────────────────────────────────────── */
function MockTipsUI() {
  const tips = [
    { emoji: '🗓️', tip: 'Log transactions the same day — memory fades fast.' },
    { emoji: '📌', tip: 'Use consistent category names for cleaner analytics.' },
    { emoji: '🔄', tip: 'Review your insights every Sunday evening for weekly awareness.' },
  ]

  return (
    <div className="space-y-2">
      {tips.map(({ emoji, tip }) => (
        <div key={tip} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <span className="shrink-0 text-lg leading-none">{emoji}</span>
          <p className="text-sm text-zinc-300">{tip}</p>
        </div>
      ))}
    </div>
  )
}

/* ── section data ─────────────────────────────────────────── */
export const GUIDE_SECTIONS: GuideSectionData[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'FlowFi helps you track spending, understand your financial health, and make smarter money decisions — all in one clean interface. Here\'s how to get up and running in under 2 minutes.',
    icon: <IconRocket />,
    steps: [
      { step: 1, text: 'Go to the FlowFi landing page and click "Get Started".' },
      { step: 2, text: 'Enter your email and choose a password to create your account.' },
      { step: 3, text: 'You\'ll be redirected to the Dashboard — your financial home base.' },
      { step: 4, text: 'Add your first transaction to see the dashboard come alive.' },
    ],
    mockUI: <MockSignupUI />,
    tips: [
      { label: 'Pro tip', text: 'Start by importing a CSV export from your bank to populate historical data instantly.' },
    ],
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    description: 'The Dashboard is your financial command center. It surfaces your most important numbers at a glance — income, expenses, and net balance — backed by charts showing spending patterns over time.',
    icon: <IconLayout />,
    steps: [
      { step: 1, text: 'The three summary cards at the top show total income, total expenses, and net balance for the current month.' },
      { step: 2, text: 'The bar chart breaks down daily spending so you can spot high-cost days quickly.' },
      { step: 3, text: 'The donut chart shows your spending by category — hover to see exact amounts.' },
      { step: 4, text: 'Use the date range filter at the top to view any custom period.' },
    ],
    mockUI: <MockDashboardUI />,
    tips: [
      { label: 'Quick tip', text: 'Use the date filter to compare two months side by side — helps identify seasonal patterns.' },
    ],
  },
  {
    id: 'adding-transactions',
    title: 'Adding Transactions',
    description: 'Every purchase, payment, or income source becomes a transaction in FlowFi. The add form is designed to be fast — most fields have smart defaults and auto-suggestions.',
    icon: <IconPlusCircle />,
    steps: [
      { step: 1, text: 'Click "Add Transaction" on the Dashboard to open the form.' },
      { step: 2, text: 'Toggle between Expense and Income at the top of the form.' },
      { step: 3, text: 'Enter the amount (numbers only — use a decimal point for paise).' },
      { step: 4, text: 'Start typing in the Description field — FlowFi will suggest a category automatically.' },
      { step: 5, text: 'Confirm the category or pick a different one from the dropdown.' },
      { step: 6, text: 'Hit "Add Transaction" — it appears at the top of your ledger immediately.' },
    ],
    mockUI: <MockAddTransactionUI />,
    tips: [
      { label: 'Pro tip', text: 'Type "Netflix" in the description — FlowFi auto-suggests "Subscriptions" as the category.' },
      { label: 'Quick tip', text: 'Use the pencil icon next to any transaction to edit or correct it later.' },
    ],
  },
  {
    id: 'csv-import',
    title: 'CSV Import',
    description: 'Already have months of bank statements? Import them all at once using the CSV import tool. FlowFi accepts any CSV with date, description, and amount columns.',
    icon: <IconUpload />,
    steps: [
      { step: 1, text: 'Navigate to Tools → Import Transactions from the main menu.' },
      { step: 2, text: 'Export a CSV from your bank\'s web portal (most banks support this).' },
      { step: 3, text: 'Drop your CSV file into the upload zone or click to browse.' },
      { step: 4, text: 'FlowFi maps your columns automatically — review and confirm the mapping.' },
      { step: 5, text: 'Preview all rows before import. Deselect any rows you don\'t want to include.' },
      { step: 6, text: 'Click "Import X transactions" — they\'ll appear in your Dashboard instantly.' },
    ],
    mockUI: <MockCSVImportUI />,
    tips: [
      { label: 'Format tip', text: 'Your CSV needs at least three columns: a date column, a description column, and an amount column (negative for expenses).' },
      { label: 'Pro tip', text: 'Import 3 months of history to unlock more meaningful insights and trend data.' },
    ],
  },
  {
    id: 'budgeting',
    title: 'Budgeting System',
    description: 'Set a monthly budget and watch FlowFi track your progress in real time. When you\'re approaching your limit in a category, a warning indicator appears — so you always know where you stand.',
    icon: <IconPieChart />,
    steps: [
      { step: 1, text: 'Go to Settings → Budget to set your monthly spending limit.' },
      { step: 2, text: 'On the Dashboard, the Budget card shows per-category progress bars.' },
      { step: 3, text: 'Green bars mean you\'re on track. Amber means you\'re at 80%+ of budget.' },
      { step: 4, text: 'A red bar means you\'ve hit or exceeded the limit for that category.' },
      { step: 5, text: 'Your budget resets automatically at the start of each new month.' },
    ],
    mockUI: <MockBudgetUI />,
    tips: [
      { label: 'Strategy', text: 'Try the 50/30/20 rule: 50% on needs, 30% on wants, 20% on savings. Set budgets to match these ratios.' },
    ],
  },
  {
    id: 'financial-insights',
    title: 'Financial Insights',
    description: 'FlowFi automatically generates plain-language insights based on your transaction history. No spreadsheets needed — patterns are surfaced for you.',
    icon: <IconLightbulb />,
    steps: [
      { step: 1, text: 'Scroll past the charts on the Dashboard to reach the Insights section.' },
      { step: 2, text: 'Each insight card highlights a specific pattern — recurring charges, top spend category, spending trend.' },
      { step: 3, text: 'Recurring transactions are detected automatically — subscriptions, rent, utilities.' },
      { step: 4, text: 'Month-over-month comparison shows whether your spending is increasing or decreasing.' },
    ],
    mockUI: <MockInsightsUI />,
    tips: [
      { label: 'Pro tip', text: 'Insights become more accurate after 60 days of transaction history — so the sooner you start, the better they get.' },
    ],
  },
  {
    id: 'financial-health-score',
    title: 'Financial Health Score',
    description: 'Your Financial Health Score is a single number (0–100) that summarizes how well you\'re managing your money. It\'s calculated from savings rate, spending control, budget adherence, and income stability.',
    icon: <IconHeart />,
    steps: [
      { step: 1, text: 'Find the Health Score card on your Dashboard — it shows your current score and rating.' },
      { step: 2, text: 'Each component score is shown below the main score — tap to see what it measures.' },
      { step: 3, text: 'Scores update as you add new transactions, so they reflect your real-time situation.' },
      { step: 4, text: 'A rating of 70+ is "Good". Aim for 85+ to be in "Excellent" territory.' },
    ],
    mockUI: <MockHealthScoreUI />,
    tips: [
      { label: 'Improve your score', text: 'The fastest win is increasing your savings rate — even moving from 5% to 15% has a significant impact on your score.' },
    ],
  },
  {
    id: 'currency-settings',
    title: 'Currency & Settings',
    description: 'Personalize FlowFi to match your preferences. Set your currency, choose your theme, and configure your monthly budget limit — all from the Settings page.',
    icon: <IconSettings />,
    steps: [
      { step: 1, text: 'Click the gear icon in the top navigation bar to open Settings.' },
      { step: 2, text: 'Under Appearance, choose Light, Dark, or System theme.' },
      { step: 3, text: 'Under Currency, select your local currency — all amounts will display accordingly.' },
      { step: 4, text: 'Set your monthly budget limit to activate the budget tracking system.' },
    ],
    mockUI: <MockSettingsUI />,
    tips: [
      { label: 'Quick tip', text: '"System" theme follows your OS dark/light mode preference and switches automatically.' },
    ],
  },
  {
    id: 'tips-and-practices',
    title: 'Tips & Best Practices',
    description: 'Get the most out of FlowFi with these habits that experienced users swear by. Small consistencies compound into clear financial awareness over time.',
    icon: <IconStar />,
    steps: [
      { step: 1, text: 'Log transactions daily — not weekly. Memory fades and estimates introduce errors.' },
      { step: 2, text: 'Review your Dashboard every Sunday to reflect on the past week\'s spending.' },
      { step: 3, text: 'Use specific category names consistently ("Food & Dining" not "food" and "dining" separately).' },
      { step: 4, text: 'Check your Financial Health Score once a month and track the trend over time.' },
      { step: 5, text: 'Set a budget that\'s realistic — tight budgets you can\'t stick to are demotivating.' },
    ],
    mockUI: <MockTipsUI />,
    tips: [
      { label: 'Golden rule', text: 'Tracking is the foundation. You can\'t optimize what you don\'t measure. Start with just logging — insights follow naturally.' },
    ],
  },
]
