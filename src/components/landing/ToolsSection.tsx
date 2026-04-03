'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

/* ── icons ───────────────────────────────────────────────── */
function IconDecision() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 11h7M11 7.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 8.5l5 5M13.5 8.5l-5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity=".4" />
    </svg>
  )
}

function IconHouse() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 11.5L11 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5V18h11V9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="9" y="13" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  )
}

function IconTax() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3.75" y="3.75" width="14.5" height="14.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 14.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="14" cy="14" r="1.25" fill="currentColor" />
    </svg>
  )
}

function IconCredit() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M11 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 14.5a6.97 6.97 0 0 1 0-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".35"
      />
      <path
        d="M11 11V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="11" cy="13" r="1" fill="currentColor" />
    </svg>
  )
}

/* ── data ────────────────────────────────────────────────── */
const TOOLS = [
  {
    href: '/tools/decision-engine',
    Icon: IconDecision,
    label: 'Decision Engine',
    description: 'Know if a purchase is affordable before you commit—using your real income and monthly spend.',
    accentFrom: 'from-blue-500/20',
    iconColor: 'text-blue-400',
    iconRing: 'border-blue-800/50 bg-blue-950/40',
  },
  {
    href: '/tools/rent-vs-buy',
    Icon: IconHouse,
    label: 'Rent vs Buy',
    description: 'Total rent over your stay vs. a simplified all-in buying estimate—in one comparison.',
    accentFrom: 'from-violet-500/20',
    iconColor: 'text-violet-400',
    iconRing: 'border-violet-800/50 bg-violet-950/40',
  },
  {
    href: '/tools/tax-estimator',
    Icon: IconTax,
    label: 'Tax Estimator',
    description: 'Run your annual income through simplified Indian slabs and get a full per-slab breakdown.',
    accentFrom: 'from-amber-500/20',
    iconColor: 'text-amber-400',
    iconRing: 'border-amber-800/50 bg-amber-950/40',
  },
  {
    href: '/tools/credit-score',
    Icon: IconCredit,
    label: 'Credit Score Simulator',
    description: 'Explore how payment history, utilization, and credit age nudge a simulated score.',
    accentFrom: 'from-emerald-500/20',
    iconColor: 'text-emerald-400',
    iconRing: 'border-emerald-800/50 bg-emerald-950/40',
  },
] as const

/* ── animation ───────────────────────────────────────────── */
const ease = [0.23, 1, 0.32, 1] as const

/* ── component ───────────────────────────────────────────── */
export function ToolsSection() {
  const reduce = useReducedMotion()

  const gridParent = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  }

  const cardVariant = {
    hidden: { opacity: 0, y: reduce ? 0 : 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
  }

  return (
    <section id="tools" className="scroll-mt-14 bg-zinc-950 pb-32 pt-4">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {/* divider */}
        <div className="mb-20 h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* header */}
        <motion.div
          className="mx-auto mb-14 max-w-xl text-center"
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          viewport={{ once: true }}
        >
          <span className="mb-3 inline-flex items-center rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
            Powerful financial tools
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tools that make
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              hard decisions simpler
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Built for real questions — rent or buy, can I afford this, how much
            tax will I owe. Each tool gives a clear answer.
          </p>
        </motion.div>

        {/* cards */}
        <motion.div
          className="grid gap-5 sm:grid-cols-2"
          variants={gridParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {TOOLS.map(({ href, Icon, label, description, accentFrom, iconColor, iconRing }) => (
            <motion.div
              key={href}
              variants={cardVariant}
              whileHover={reduce ? {} : { scale: 1.015, transition: { duration: 0.2, ease: 'easeOut' } }}
              className={`
                group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60
                backdrop-blur-sm transition-shadow duration-300
                hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/50
              `}
            >
              {/* top accent gradient */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accentFrom} to-transparent opacity-60`}
              />

              <Link href={href} className="relative flex h-full flex-col gap-5 p-7">
                {/* icon */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconRing} ${iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon />
                </div>

                {/* content */}
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-zinc-100">{label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
                    {description}
                  </p>
                </div>

                {/* open indicator */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition-colors duration-200 group-hover:text-zinc-300">
                  <span>Open tool</span>
                  <span className="translate-x-0 transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
