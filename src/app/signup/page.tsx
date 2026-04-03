'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthBackLink } from '@/components/auth/AuthBackLink'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'
import { preflightAuthAttempt } from '@/lib/authed-api'
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
      const gate = await preflightAuthAttempt()
      if (!gate.ok) {
        setError(gate.message)
        return
      }
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
      <div className="relative mx-auto flex min-h-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <AuthBackLink />
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
          <div className="mx-auto h-8 w-56 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="mx-auto h-4 w-full max-w-xs animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-indigo-100/80 dark:bg-indigo-950/50" />
        </div>
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
            className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-150 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 ease-in-out placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 ease-in-out placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
            placeholder="At least 6 characters"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-all duration-150 ease-in-out hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>Creating account…</span>
            </>
          ) : (
            'Sign up'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
