import type { GuideSectionData } from './guide-data'

type Props = {
  section: GuideSectionData
}

export function GuideSection({ section }: Props) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 grid gap-8 lg:grid-cols-[1fr_320px]"
    >
      {/* Left: text content */}
      <div className="min-w-0">
        {/* Section header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/80 text-zinc-300">
            {section.icon}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            {section.title}
          </h2>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          {section.description}
        </p>

        {/* Steps */}
        <div className="mb-6 space-y-3">
          {section.steps.map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-400">
                {step}
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
            </div>
          ))}
        </div>

        {/* Tips */}
        {section.tips && section.tips.length > 0 && (
          <div className="space-y-2">
            {section.tips.map(({ label, text }) => (
              <div
                key={label}
                className="flex gap-2.5 rounded-xl border border-zinc-700/40 bg-zinc-800/30 px-4 py-3"
              >
                <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  {label}
                </span>
                <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: mock UI */}
      <div className="lg:pt-1">
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 shadow-xl shadow-black/20">
          <div className="mb-3 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-zinc-700" />
            <div className="h-2 w-2 rounded-full bg-zinc-700" />
            <div className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="ml-1.5 text-[10px] text-zinc-600">Preview</span>
          </div>
          {section.mockUI}
        </div>
      </div>
    </section>
  )
}
