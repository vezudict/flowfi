'use client'

import { useEffect, useRef, useState } from 'react'
import { LandingNavbar } from '@/components/layout/LandingNavbar'
import { Footer } from '@/components/landing/Footer'
import { GuideSidebar } from '@/components/guide/Sidebar'
import { GuideSection } from '@/components/guide/Section'
import { GUIDE_SECTIONS } from '@/components/guide/guide-data'

export default function GuidePage() {
  const [activeId, setActiveId] = useState(GUIDE_SECTIONS[0].id)
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const targets = GUIDE_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      {
        rootMargin: '-20% 0px -65% 0px',
      },
    )

    targets.forEach((el) => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  const activeSection = GUIDE_SECTIONS.find((s) => s.id === activeId) ?? GUIDE_SECTIONS[0]

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveId(id)
    setMobileSectionOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <LandingNavbar />

      <main className="flex-1">
        {/* Page header */}
        <div className="border-b border-zinc-800/60 bg-zinc-950 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
                Documentation
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              FlowFi Guide
            </h1>
            <p className="mt-3 max-w-xl text-base text-zinc-500 leading-relaxed">
              Everything you need to know to get the most out of FlowFi — from your first transaction to understanding your Financial Health Score.
            </p>
          </div>
        </div>

        {/* Mobile section picker */}
        <div className="sticky top-14 z-30 border-b border-zinc-800/60 bg-zinc-950/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSectionOpen((o) => !o)}
            className="flex w-full items-center justify-between py-3 text-sm"
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-zinc-500">{activeSection.icon}</span>
              <span className="font-medium">{activeSection.title}</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-zinc-500 transition-transform duration-200 ${mobileSectionOpen ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {mobileSectionOpen && (
            <div className="absolute inset-x-0 top-full border-b border-zinc-800 bg-zinc-950 px-4 pb-3 shadow-xl">
              <ul className="space-y-0.5">
                {GUIDE_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left ${
                        activeId === section.id
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="text-zinc-500">{section.icon}</span>
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main two-column layout */}
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex gap-12 lg:gap-16">
            {/* Sidebar (desktop) */}
            <GuideSidebar
              sections={GUIDE_SECTIONS}
              activeId={activeId}
              onSelect={setActiveId}
            />

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-20">
              {GUIDE_SECTIONS.map((section, i) => (
                <div key={section.id}>
                  <GuideSection section={section} />
                  {i < GUIDE_SECTIONS.length - 1 && (
                    <div className="mt-20 h-px bg-zinc-800/60" />
                  )}
                </div>
              ))}

              {/* Bottom CTA */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
                <h3 className="text-lg font-semibold text-zinc-100">Ready to take control?</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Start tracking your finances today — it takes less than 2 minutes to set up.
                </p>
                <a
                  href="/dashboard"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-[transform,background-color] duration-150 hover:bg-white active:scale-95"
                >
                  Go to Dashboard
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
