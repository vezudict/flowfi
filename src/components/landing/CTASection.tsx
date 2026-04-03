'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.23, 1, 0.32, 1] as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
})

export function CTASection() {
  const reduce = useReducedMotion()
  const it = item(!!reduce)

  return (
    <section className="relative overflow-hidden bg-zinc-950 pb-32 pt-4">
      {/* top divider */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mb-20 h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* subtle radial wash */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800/10 blur-3xl" />
      </div>

      <motion.div
        className="mx-auto max-w-2xl px-6 text-center sm:px-10"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
      >
        <motion.h2
          variants={it}
          className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          Take control of your
          <br />
          <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            finances today
          </span>
        </motion.h2>

        <motion.p
          variants={it}
          className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg"
        >
          Start tracking, analyzing, and making smarter financial decisions.
        </motion.p>

        <motion.div variants={it} className="mt-10">
          <motion.div
            whileHover={reduce ? {} : { scale: 1.03, transition: { duration: 0.18, ease: 'easeOut' } }}
            className="inline-block"
          >
            <Link
              href="/signup"
              className="
                group relative inline-flex items-center gap-2 rounded-xl
                bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900
                shadow-[0_0_0_1px_rgba(255,255,255,0.12)]
                transition-shadow duration-300
                hover:shadow-[0_0_32px_6px_rgba(255,255,255,0.12)]
                active:scale-[0.97]
              "
            >
              Get Started
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                <path
                  d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </motion.div>
        </motion.div>

        <motion.p variants={it} className="mt-4 text-xs text-zinc-600">
          No credit card required &middot; Free to use
        </motion.p>
      </motion.div>
    </section>
  )
}
