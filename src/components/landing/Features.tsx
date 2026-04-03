'use client'

import { motion, useReducedMotion } from 'framer-motion'

/* ── icons ───────────────────────────────────────────────── */
function IconExpense() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="5" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="13" r="1.25" fill="currentColor" />
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="11" width="3" height="6" rx="1" fill="currentColor" opacity=".5" />
      <rect x="8.5" y="7" width="3" height="10" rx="1" fill="currentColor" opacity=".75" />
      <rect x="14.5" y="3" width="3" height="14" rx="1" fill="currentColor" />
      <path d="M2 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconInsights() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5a5.5 5.5 0 0 1 3.18 10.02l-.18.13V15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2.35l-.18-.13A5.5 5.5 0 0 1 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 17.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCsv() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M11.5 2H5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5 18h10a1.5 1.5 0 0 0 1.5-1.5V7.5L11.5 2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 2v5.5H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 11v4M8 13l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: IconExpense,
    title: 'Expense Tracking',
    description:
      'Log and review every transaction against your account. Create entries, filter by category, and keep a scrollable ledger of your entire history.',
  },
  {
    Icon: IconAnalytics,
    title: 'Analytics Dashboard',
    description:
      'Donut charts, daily bar charts, and three summary cards show monthly spending, transaction count, and top category at a glance.',
  },
  {
    Icon: IconInsights,
    title: 'Smart Financial Insights',
    description:
      'Month-over-month comparison, top spending category, and average daily spend surfaced as plain-language sentences—no digging required.',
  },
  {
    Icon: IconCsv,
    title: 'CSV Import',
    description:
      'Upload a CSV with date, description, and amount columns. Preview each row before it hits your ledger, with per-row validation and error messages.',
  },
] as const

/* ── animation helpers ───────────────────────────────────── */
const ease = [0.23, 1, 0.32, 1] as const

/* ── component ───────────────────────────────────────────── */
export function Features() {
  const reduce = useReducedMotion()

  const gridParent = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
  }

  const card = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease },
    },
  }

  return (
    <section className="bg-zinc-950 pb-28 pt-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {/* header */}
        <motion.div
          className="mx-auto mb-14 max-w-xl text-center"
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          viewport={{ once: true }}
        >
          <span className="mb-3 inline-flex items-center rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
            Core features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              manage money clearly
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            A focused set of tools—no noise, no bloat—built around the way
            people actually think about their finances.
          </p>
        </motion.div>

        {/* grid */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={gridParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map(({ Icon, title, description }) => (
            <motion.div
              key={title}
              variants={card}
              whileHover={
                reduce
                  ? {}
                  : {
                      y: -4,
                      transition: { duration: 0.2, ease: 'easeOut' },
                    }
              }
              className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm transition-colors duration-200 hover:border-zinc-600"
            >
              {/* hover glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  boxShadow: '0 0 0 1px rgba(161,161,170,0.15), 0 8px 32px -8px rgba(0,0,0,0.5)',
                }}
              />

              {/* icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/80 text-zinc-300 transition-[transform,border-color,color] duration-200 group-hover:scale-105 group-hover:border-zinc-600 group-hover:text-white">
                <Icon />
              </div>

              {/* text */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
