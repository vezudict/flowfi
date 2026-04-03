'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/contexts/auth-context'
import { ensureUserProfile } from '@/lib/ensure-profile'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    router.replace('/dashboard')
  }, [user, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signError) {
        setError(signError.message)
        return
      }

      if (!data.user?.id) {
        setError('Account could not be created. Try again.')
        return
      }

      if (data.session) {
        const { error: profileError } = await ensureUserProfile()
        if (profileError) {
          setError(profileError)
          return
        }
        router.replace('/dashboard')
      } else {
        setInfo('Check your email to confirm your account, then sign in.')
      }
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
      title="Create account"
      subtitle="Sign up with your email and a password."
      footer={
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Sign in
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
        {info ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            role="status"
          >
            {info}
          </div>
        ) : null}
        <div className="space-y-2">
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10"
            placeholder="At least 6 characters"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthShell>
  )
}
