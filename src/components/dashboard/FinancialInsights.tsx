import { Lightbulb } from 'lucide-react'
import Link from 'next/link'
import type { AIInsight } from '@/lib/ai-insights'
import type { Anomaly } from '@/lib/anomaly-detection'
import type { SpendingInsight } from '@/lib/spending-insights'

type FinancialInsightsProps = {
  savingsInsights: SpendingInsight[]
  expenseInsights: SpendingInsight[]
  incomeInsights: SpendingInsight[]
  recurringInsights: SpendingInsight[]
  aiInsights?: AIInsight[] | null
  aiAnomalies?: Anomaly[] | null
  aiLoading?: boolean
}

function InsightSection({
  title,
  insights,
}: {
  title: string
  insights: SpendingInsight[]
}) {
  if (insights.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5" role="list">
        {insights.map((insight) => (
          <li key={insight.id}>
            <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3.5 text-sm leading-relaxed text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-300">
              {insight.text}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── AI Insight card constants ────────────────────────────────────────────────

const TYPE_ICONS: Record<AIInsight['type'], string> = {
  spending: '📉',
  income: '💰',
  alert: '⚠️',
  opportunity: '🚀',
}

const TYPE_LABELS: Record<AIInsight['type'], string> = {
  spending: 'Spending',
  income: 'Income',
  alert: 'Alert',
  opportunity: 'Opportunity',
}

const TYPE_STYLES: Record<AIInsight['type'], string> = {
  spending:
    'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/25',
  income:
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/25',
  alert:
    'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/25',
  opportunity:
    'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/25',
}

// HIGH → red  |  MEDIUM → amber/yellow  |  LOW → green
const PRIORITY_STYLES: Record<AIInsight['priority'], string> = {
  high: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/25',
  medium:
    'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/25',
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/25',
}

const PRIORITY_LABELS: Record<AIInsight['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

// Hover glow tint keyed on type
const CARD_GLOW: Record<AIInsight['type'], string> = {
  spending: 'hover:border-amber-300/50 hover:shadow-amber-100/60 dark:hover:border-amber-600/30 dark:hover:shadow-amber-900/20',
  income: 'hover:border-emerald-300/50 hover:shadow-emerald-100/60 dark:hover:border-emerald-600/30 dark:hover:shadow-emerald-900/20',
  alert: 'hover:border-red-300/50 hover:shadow-red-100/60 dark:hover:border-red-600/30 dark:hover:shadow-red-900/20',
  opportunity: 'hover:border-blue-300/50 hover:shadow-blue-100/60 dark:hover:border-blue-600/30 dark:hover:shadow-blue-900/20',
}

// ─── AIInsightCard ────────────────────────────────────────────────────────────

function AIInsightCard({ insight }: { insight: AIInsight }) {
  return (
    <li>
      <div
        className={`group rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80 ${CARD_GLOW[insight.type]}`}
      >
        {/* Top row: icon + type badge + priority badge */}
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" role="img" aria-label={TYPE_LABELS[insight.type]}>
            {TYPE_ICONS[insight.type]}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide ${TYPE_STYLES[insight.type]}`}
          >
            {TYPE_LABELS[insight.type]}
          </span>
          <span
            className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide ${PRIORITY_STYLES[insight.priority]}`}
          >
            {PRIORITY_LABELS[insight.priority]}
          </span>
        </div>

        {/* Title */}
        <p className="mt-2.5 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
          {insight.title}
        </p>

        {/* Description */}
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {insight.description}
        </p>
      </div>
    </li>
  )
}

// ─── AIInsightSection ─────────────────────────────────────────────────────────

function AIInsightSection({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        AI Insights
      </h3>
      <ul className="mt-3 space-y-2.5" role="list">
        {insights.map((insight, i) => (
          <AIInsightCard key={i} insight={insight} />
        ))}
      </ul>
    </div>
  )
}

// ─── Anomaly cards ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Anomaly['severity'], string> = {
  high: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/25',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/25',
}

const ANOMALY_TYPE_LABELS: Record<Anomaly['type'], string> = {
  spike: 'Spending Spike',
  category: 'Dominant Category',
  income: 'Income Drop',
  large: 'Large Expense',
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  return (
    <li>
      <div
        className={`rounded-xl border px-4 py-3.5 shadow-sm ${
          anomaly.severity === 'high'
            ? 'border-red-200/70 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20'
            : 'border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" role="img" aria-label="anomaly">⚠️</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide ${SEVERITY_STYLES[anomaly.severity]}`}
          >
            {ANOMALY_TYPE_LABELS[anomaly.type]}
          </span>
          <span
            className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide ${SEVERITY_STYLES[anomaly.severity]}`}
          >
            {anomaly.severity === 'high' ? 'High' : 'Medium'}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {anomaly.message}
        </p>
      </div>
    </li>
  )
}

function AnomalySection({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Anomalies
      </h3>
      <ul className="mt-3 space-y-2.5" role="list">
        {anomalies.map((anomaly, i) => (
          <AnomalyCard key={i} anomaly={anomaly} />
        ))}
      </ul>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function AIInsightSkeleton() {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        AI Insights
      </h3>
      <ul className="mt-3 space-y-2.5">
        {[1, 2, 3].map((n) => (
          <li key={n}>
            <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
              {/* Badge row skeleton */}
              <div className="flex gap-2">
                <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="ml-auto h-5 w-12 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>
              {/* Title skeleton */}
              <div className="mt-2.5 h-3.5 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              {/* Description skeleton */}
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FinancialInsights({
  savingsInsights,
  expenseInsights,
  incomeInsights,
  recurringInsights,
  aiInsights,
  aiAnomalies,
  aiLoading = false,
}: FinancialInsightsProps) {
  const total =
    savingsInsights.length +
    expenseInsights.length +
    incomeInsights.length +
    recurringInsights.length

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm transition-all duration-150 ease-in-out hover:scale-[1.01] hover:shadow-md sm:p-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:hover:shadow-zinc-950/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent dark:from-indigo-400/[0.04]" />
      <div className="relative">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Financial insights
        </h2>
        <p className="mt-1 text-xs text-zinc-500/80 dark:text-zinc-400/80">
          Spending uses debits only (category "income" excluded). Income uses credits. Savings = income
          minus expenses.
        </p>

        {total === 0 ? (
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <Lightbulb className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No insights yet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500/90 dark:text-zinc-400/85">
              Add debits for spending and credits for income to see savings, spending, and income
              insights.
            </p>
            <Link
              href="#add-transaction"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Add transaction
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            <InsightSection title="Savings" insights={savingsInsights} />

            {/* Anomalies: shown when AI is enabled and anomalies detected */}
            {!aiLoading && aiAnomalies && aiAnomalies.length > 0 && (
              <div className="animate-fade-in">
                <AnomalySection anomalies={aiAnomalies} />
              </div>
            )}

            {/* AI insights: skeleton → structured cards → rule-based fallback */}
            {aiLoading ? (
              <AIInsightSkeleton />
            ) : aiInsights && aiInsights.length > 0 ? (
              <div className="animate-fade-in">
                <AIInsightSection insights={aiInsights} />
              </div>
            ) : (
              <InsightSection title="Spending" insights={expenseInsights} />
            )}

            <InsightSection title="Income" insights={incomeInsights} />
            <InsightSection title="Recurring" insights={recurringInsights} />
          </div>
        )}
      </div>
    </section>
  )
}
