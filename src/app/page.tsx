'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hero } from '@/components/landing/Hero'
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

  return <Hero />
}
