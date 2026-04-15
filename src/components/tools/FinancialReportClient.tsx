'use client'

import { useState } from 'react'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import type { FinancialReport } from '@/app/api/financial-report/route'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function ListCards({ items, variant }: { items: string[]; variant: 'risk' | 'opportunity' | 'action' }) {
  const styles = {
    risk: 'border-red-500/20 bg-red-500/10 text-red-200',
    opportunity: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    action: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-200',
  }
  const icons = { risk: '⚠', opportunity: '✦', action: '→' }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${styles[variant]}`}
        >
          <span className="mt-0.5 shrink-0 text-xs">{icons[variant]}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-slate-800/60 p-4 space-y-2">
          <div className="h-3 w-24 rounded bg-slate-700" />
          <div className="h-4 w-full rounded bg-slate-700/80" />
          <div className="h-4 w-4/5 rounded bg-slate-700/60" />
        </div>
      ))}
    </div>
  )
}

export function FinancialReportClient() {
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateReport() {
    setError(null)
    setLoading(true)
    try {
      const res = await authedFetch('/api/financial-report', { method: 'POST' })
      const parsed = await readAuthedJson<FinancialReport>(res)
      if (!parsed.ok) {
        setError(parsed.message)
      } else {
        setReport(parsed.data)
      }
    } catch {
      setError('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generatedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="mt-8 space-y-6">
      {/* Generate button */}
      {!report && !loading && (
        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50/80 p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            FlowFi will analyze your transactions and generate a structured monthly financial summary. Requires at least 5 transactions.
          </p>
          <button
            type="button"
            onClick={generateReport}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Generate report
          </button>
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-2xl border border-transparent bg-slate-900 p-6 text-white shadow-sm ring-1 ring-slate-700 dark:bg-slate-950">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-4">Generating report…</p>
          <Skeleton />
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="result-panel rounded-2xl border border-transparent bg-slate-900 text-white shadow-sm ring-1 ring-slate-700 dark:bg-slate-950 divide-y divide-slate-700/60">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Monthly Financial Report</p>
                {generatedDate && (
                  <p className="mt-0.5 text-xs text-slate-500">Generated {generatedDate}</p>
                )}
              </div>
              <button
                type="button"
                onClick={generateReport}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/20"
              >
                Regenerate
              </button>
            </div>
            <p className="mt-4 text-base leading-relaxed text-slate-100">{report.summary}</p>
            {report.fallback && (
              <p className="mt-2 text-xs text-amber-400">Add more transactions for a full AI report.</p>
            )}
          </div>

          {/* Spending analysis */}
          <div className="p-6">
            <Section title="Spending analysis">
              <p className="text-sm leading-relaxed text-slate-300">{report.spendingAnalysis}</p>
            </Section>
          </div>

          {/* Income analysis */}
          <div className="p-6">
            <Section title="Income analysis">
              <p className="text-sm leading-relaxed text-slate-300">{report.incomeAnalysis}</p>
            </Section>
          </div>

          {/* Risks */}
          {report.risks.length > 0 && (
            <div className="p-6">
              <Section title="Risks">
                <ListCards items={report.risks} variant="risk" />
              </Section>
            </div>
          )}

          {/* Opportunities */}
          {report.opportunities.length > 0 && (
            <div className="p-6">
              <Section title="Opportunities">
                <ListCards items={report.opportunities} variant="opportunity" />
              </Section>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="p-6">
              <Section title="Recommendations">
                <ListCards items={report.recommendations} variant="action" />
              </Section>
            </div>
          )}
        </div>
      )}

      {/* Error after report attempt */}
      {error && report && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
