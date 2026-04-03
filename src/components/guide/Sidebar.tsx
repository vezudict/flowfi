'use client'

import type { GuideSectionData } from './guide-data'

type Props = {
  sections: GuideSectionData[]
  activeId: string
  onSelect: (id: string) => void
}

export function GuideSidebar({ sections, activeId, onSelect }: Props) {
  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 96 // sticky navbar + some breathing room
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
    onSelect(id)
  }

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Contents
        </p>
        <nav aria-label="Guide sections">
          <ul className="space-y-0.5">
            {sections.map((section) => {
              const isActive = activeId === section.id
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(section.id)}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-zinc-800/70 text-zinc-100'
                        : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                    }`}
                  >
                    <span
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-400'
                      }`}
                    >
                      {section.icon}
                    </span>
                    <span className="truncate leading-snug">{section.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
          <p className="text-xs font-semibold text-zinc-300">Need help?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Questions or feedback? Reach out and we&apos;ll get back to you promptly.
          </p>
          <a
            href="mailto:support@flowfi.app"
            className="mt-2.5 block text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            support@flowfi.app →
          </a>
        </div>
      </div>
    </aside>
  )
}
