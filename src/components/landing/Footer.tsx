'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

const LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tools', href: '/tools' },
  {
    label: 'GitHub',
    href: 'https://github.com/aaronaaroff/flowfi',
    external: true,
  },
] as const

export function Footer() {
  const reduce = useReducedMotion()

  return (
    <motion.footer
      className="border-t border-zinc-800 bg-zinc-950"
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      viewport={{ once: true }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between sm:px-10">
        {/* logo */}
        <span className="text-sm font-semibold tracking-tight text-zinc-300">
          Flowfi
        </span>

        {/* links */}
        <nav aria-label="Footer navigation">
          <ul className="flex items-center gap-6">
            {LINKS.map(({ label, href, external }) => (
              <li key={label}>
                <Link
                  href={href}
                  {...(external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-200"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* disclaimer + copyright */}
        <div className="flex flex-col items-center gap-1 text-center sm:items-end">
          <p className="text-xs font-medium text-zinc-600">
            Not financial advice
          </p>
          <p className="text-xs text-zinc-700">
            &copy; {new Date().getFullYear()} Flowfi
          </p>
        </div>
      </div>
    </motion.footer>
  )
}
