'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

/* ── mock data ───────────────────────────────────────────── */
const SUMMARY = [
  { title: 'Spending · this month', value: '₹24,500', hint: 'April 2026' },
  { title: 'Transactions', value: '18', hint: 'All time' },
  { title: 'Top category', value: 'Food', hint: '₹9,200' },
] as const

const BAR_HEIGHTS = [22, 48, 35, 70, 42, 58, 28, 65, 33, 55]

const PIE_LEGEND = [
  { label: 'Food', pct: '40%', tw: 'bg-zinc-400' },
  { label: 'Transport', pct: '25%', tw: 'bg-zinc-500' },
  { label: 'Shopping', pct: '20%', tw: 'bg-zinc-600' },
  { label: 'Other', pct: '15%', tw: 'bg-zinc-700' },
] as const

const TXS = [
  { category: 'Food', desc: 'Swiggy order', date: 'Apr 28', amount: '₹649' },
  { category: 'Transport', desc: 'Uber — office commute', date: 'Apr 27', amount: '₹312' },
  { category: 'Shopping', desc: 'Amazon — earphones', date: 'Apr 25', amount: '₹2,199' },
  { category: 'Food', desc: 'Blinkit groceries', date: 'Apr 23', amount: '₹1,840' },
  { category: 'Entertainment', desc: 'Netflix subscription', date: 'Apr 20', amount: '₹499' },
] as const

const NAV_ITEMS = ['Dashboard', 'Tools', 'Settings'] as const

/* ── inner chart components ──────────────────────────────── */
function MockDonut() {
  return (
    <div className="flex items-center gap-5">
      {/* conic-gradient ring */}
      <div className="relative h-[96px] w-[96px] shrink-0">
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'conic-gradient(#52525b 0% 40%, #71717a 40% 65%, #a1a1aa 65% 85%, #d4d4d8 85% 100%)',
          }}
        />
        {/* donut hole */}
        <div className="absolute inset-[20px] rounded-full bg-zinc-900" />
      </div>
      {/* legend */}
      <ul className="flex-1 space-y-2">
        {PIE_LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.tw}`} />
            <span className="text-zinc-400">{item.label}</span>
            <span className="ml-auto tabular-nums text-zinc-500">{item.pct}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MockBars() {
  const reduce = useReducedMotion()
  const max = Math.max(...BAR_HEIGHTS)
  return (
    <div className="flex h-[96px] items-end gap-[3px]">
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="min-h-[3px] flex-1 rounded-t-[3px] bg-zinc-700"
          style={{ height: `${(h / max) * 100}%`, originY: 1 }}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          transition={{
            duration: 0.5,
            delay: reduce ? 0 : 0.08 + i * 0.04,
            ease: [0.23, 1, 0.32, 1],
          }}
          viewport={{ once: true }}
        />
      ))}
    </div>
  )
}

/* ── card wrapper (matches real dashboard) ───────────────── */
function DashCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

/* ── main component ──────────────────────────────────────── */
export function PreviewSection() {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const cardY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [48, -48])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-zinc-950 py-32">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {/* header */}
        <motion.div
          className="mx-auto mb-14 max-w-lg text-center"
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          viewport={{ once: true }}
        >
          <span className="mb-3 inline-flex items-center rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
            Product preview
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your finances,{' '}
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              at a glance
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            One screen. Everything you need to understand where your money goes.
          </p>
        </motion.div>

        {/* parallax card */}
        <motion.div style={{ y: cardY }}>
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.04]"
          >
            {/* browser chrome */}
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/60" />
                <span className="h-3 w-3 rounded-full bg-amber-400/60" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="mx-auto flex h-6 w-52 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/70 px-3 text-[11px] text-zinc-600 select-none">
                flowfi.app/dashboard
              </div>
            </div>

            {/* dashboard body */}
            <div className="flex min-h-0">
              {/* ── sidebar (desktop only) ── */}
              <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-950/60 p-4 lg:flex">
                {/* logo */}
                <div className="mb-5 flex items-center gap-2 px-2">
                  <span className="text-sm font-semibold tracking-tight text-zinc-100">
                    Flowfi
                  </span>
                </div>
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
                      item === 'Dashboard'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500'
                    }`}
                  >
                    <NavDot active={item === 'Dashboard'} />
                    {item}
                  </div>
                ))}
              </aside>

              {/* ── main content ── */}
              <div className="flex-1 overflow-hidden p-5 sm:p-6">
                {/* page header */}
                <div className="mb-5">
                  <p className="text-base font-semibold text-zinc-100">Overview</p>
                  <p className="text-xs text-zinc-500">April 2026</p>
                </div>

                {/* summary cards */}
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  {SUMMARY.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        {card.title}
                      </p>
                      <p className="mt-1.5 text-xl font-semibold tabular-nums text-zinc-50">
                        {card.value}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{card.hint}</p>
                    </div>
                  ))}
                </div>

                {/* charts row */}
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  {/* donut */}
                  <DashCard>
                    <p className="mb-3 text-xs font-medium text-zinc-400">By category</p>
                    <MockDonut />
                  </DashCard>

                  {/* bar chart */}
                  <DashCard>
                    <p className="mb-3 text-xs font-medium text-zinc-400">
                      Over time · this month
                    </p>
                    <MockBars />
                    {/* x-axis labels */}
                    <div className="mt-1.5 flex justify-between px-0.5 text-[9px] text-zinc-700">
                      <span>Apr 1</span>
                      <span>Apr 15</span>
                      <span>Apr 30</span>
                    </div>
                  </DashCard>
                </div>

                {/* transaction list */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                  <div className="border-b border-zinc-800 px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-300">Recent activity</p>
                  </div>
                  <ul className="divide-y divide-zinc-800/60 px-4">
                    {TXS.map((tx, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-200">{tx.category}</p>
                          <p className="truncate text-[11px] text-zinc-500">{tx.desc}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium tabular-nums text-zinc-300">
                            {tx.amount}
                          </p>
                          <p className="text-[10px] text-zinc-600">{tx.date}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── tiny helper ─────────────────────────────────────────── */
function NavDot({ active }: { active: boolean }) {
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-zinc-300' : 'bg-zinc-700'}`}
    />
  )
}
