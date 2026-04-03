'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CTASection } from '@/components/landing/CTASection'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { PreviewSection } from '@/components/landing/PreviewSection'
import { ToolsSection } from '@/components/landing/ToolsSection'
import { LandingNavbar } from '@/components/layout/LandingNavbar'
import { useAuth } from '@/contexts/auth-context'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-600">Loading…</p>
      </div>
    )
  }

  if (user) return null

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
