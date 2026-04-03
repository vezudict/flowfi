'use client'

import { CTASection } from '@/components/landing/CTASection'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { PreviewSection } from '@/components/landing/PreviewSection'
import { ToolsSection } from '@/components/landing/ToolsSection'
import { LandingNavbar } from '@/components/layout/LandingNavbar'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <LandingNavbar />
      <main>
        <Hero />
        <Features />
        <ToolsSection />
        <PreviewSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
