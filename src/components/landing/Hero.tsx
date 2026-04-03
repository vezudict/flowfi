'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

/* ── mini chart data ─────────────────────────────────────── */
const BAR_DATA = [38, 62, 48, 77, 55, 88, 66, 82, 50, 71, 92, 58]
const MAX_BAR = Math.max(...BAR_DATA)

function MiniBarChart() {
  return (
    <svg viewBox={`0 0 ${BAR_DATA.length * 20} 64`} className="w-full">
      {BAR_DATA.map((h, i) => {
        const barH = (h / MAX_BAR) * 56
        const accent = i === BAR_DATA.length - 1
        return (
          <rect
            key={i}
            x={i * 20 + 3}
            y={64 - barH}
            width={14}
            height={barH}
            rx={3}
            fill={accent ? '#ffffff' : '#3f3f46'}
            opacity={accent ? 1 : 0.9}
          />
        )
      })}
    </svg>
  )
}

/* ── preview cards ───────────────────────────────────────── */
function SpendingCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Spending · this month
      </p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-white">
          $2,450.00
        </p>
        <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
          ↑ 12%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <span>
          Transactions
          <span className="ml-1 font-medium text-zinc-300">48</span>
        </span>
        <span>
          Top cat
          <span className="ml-1 font-medium text-zinc-300">Food</span>
        </span>
      </div>
    </div>
  )
}

function ChartCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">Over time · this month</p>
        <div className="flex gap-1">
          {['Food', 'Bills', 'Transport'].map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <MiniBarChart />
      </div>
    </div>
  )
}

function InsightsCard() {
  const lines = [
    'You spent 15% more this month compared to last month.',
    'Your average daily spending is $81.',
  ]
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 backdrop-blur-sm">
      <p className="text-xs font-medium text-zinc-400">Financial insights</p>
      <ul className="mt-3 space-y-2.5">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
            <span className="text-xs leading-relaxed text-zinc-300">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── hero ────────────────────────────────────────────────── */
const ease = [0.23, 1, 0.32, 1] as const

export function Hero() {
  const reduce = useReducedMotion()

  const textParent = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  }

  const textChild = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
  }

  function cardVariant(delay: number) {
    return {
      hidden: { opacity: 0, y: reduce ? 0 : 28 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease, delay: reduce ? 0 : delay },
      },
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-white">
      {/* ── nav ─────────────────────────────────────────── */}
      <nav className="flex h-14 items-center justify-between px-6 sm:px-10">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">
          Flowfi
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-all duration-150 hover:bg-zinc-100 active:scale-95"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── hero body ───────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-6 py-16 sm:px-10 lg:flex-row lg:items-center lg:gap-24 lg:py-20">
        {/* left: text */}
        <motion.div
          className="flex flex-col lg:flex-1"
          variants={textParent}
          initial="hidden"
          animate="show"
        >
          <motion.span
            variants={textChild}
            className="mb-4 inline-flex w-fit items-center rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400"
          >
            Financial Intelligence Platform
          </motion.span>

          <motion.h1
            variants={textChild}
            className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Make smarter{' '}
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              financial decisions
            </span>
          </motion.h1>

          <motion.p
            variants={textChild}
            className="mt-5 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Track your spending, analyze patterns, and use powerful tools to
            plan your financial future.
          </motion.p>

          <motion.div
            variants={textChild}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all duration-150 hover:bg-zinc-100 hover:shadow-xl active:scale-95"
            >
              Get Started →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-all duration-150 hover:border-zinc-500 hover:bg-zinc-800/60 hover:text-white active:scale-95"
            >
              View Dashboard
            </Link>
          </motion.div>

          <motion.div
            variants={textChild}
            className="mt-10 flex items-center gap-5 text-xs text-zinc-600"
          >
            {['Supabase-powered', 'RLS-secured', 'Real-time analytics'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* right: dashboard preview */}
        <motion.div
          className="relative flex flex-col gap-3 lg:flex-1"
          animate={reduce ? {} : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* glow */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-3xl opacity-30"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(161,161,170,0.15), transparent)',
            }}
          />

          <motion.div
            variants={cardVariant(0.25)}
            initial="hidden"
            animate="show"
          >
            <SpendingCard />
          </motion.div>

          <motion.div
            variants={cardVariant(0.38)}
            initial="hidden"
            animate="show"
          >
            <ChartCard />
          </motion.div>

          <motion.div
            variants={cardVariant(0.5)}
            initial="hidden"
            animate="show"
          >
            <InsightsCard />
          </motion.div>
        </motion.div>
      </div>

      {/* ── footer note ─────────────────────────────────── */}
      <p className="pb-6 text-center text-xs text-zinc-700">
        Educational demo — not financial advice
      </p>
    </div>
  )
}
