'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/contexts/auth-context'
import { ensureUserProfile } from '@/lib/ensure-profile'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    router.replace('/dashboard')
  }, [user, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signError) {
        setError(signError.message)
        return
      }

      const { error: profileError } = await ensureUserProfile()
      if (profileError) {
        setError(profileError)
        return
      }

      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your email and password to continue."
      footer={
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
