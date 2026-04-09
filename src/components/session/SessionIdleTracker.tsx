'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Modal } from '@/components/ui/Modal'

/** Total inactivity before sign-out */
const IDLE_LIMIT_MS = 15 * 60 * 1000 // 900_000
/** Show warning this long before idle logout */
const WARNING_BEFORE_MS = 60 * 1000
/** Fire warning at this idle duration */
const WARNING_AT_MS = IDLE_LIMIT_MS - WARNING_BEFORE_MS // 14 min
/** Throttle activity bumps (mousemove etc.) */
const ACTIVITY_THROTTLE_MS = 500

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/**
 * Global idle timeout for signed-in users: 15 min inactivity → sign out.
 * Warning modal with countdown 1 minute before logout. "Stay logged in" resets the window.
 */
export function SessionIdleTracker() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const extendSessionRef = useRef<() => void>(() => {})
  const logoutAtRef = useRef(0)

  useEffect(() => {
    if (loading || !user) {
      setShowWarning(false)
      return
    }

    let warnTimer: ReturnType<typeof setTimeout> | undefined
    let logoutTimer: ReturnType<typeof setTimeout> | undefined
    let countInterval: ReturnType<typeof setInterval> | undefined

    const clearTimers = () => {
      if (warnTimer !== undefined) clearTimeout(warnTimer)
      if (logoutTimer !== undefined) clearTimeout(logoutTimer)
      if (countInterval !== undefined) clearInterval(countInterval)
      warnTimer = undefined
      logoutTimer = undefined
      countInterval = undefined
    }

    const schedule = () => {
      clearTimers()
      setShowWarning(false)
      const logoutAt = Date.now() + IDLE_LIMIT_MS
      logoutAtRef.current = logoutAt

      warnTimer = setTimeout(() => {
        setShowWarning(true)
        setSecondsLeft(Math.max(0, Math.ceil((logoutAtRef.current - Date.now()) / 1000)))
        countInterval = setInterval(() => {
          const left = Math.max(0, Math.ceil((logoutAtRef.current - Date.now()) / 1000))
          setSecondsLeft(left)
        }, 1000)
      }, WARNING_AT_MS)

      logoutTimer = setTimeout(async () => {
        clearTimers()
        setShowWarning(false)
        try {
          await signOut()
        } catch (e) {
          console.error('[session-idle] signOut', e)
        }
        router.replace('/login?reason=idle')
      }, IDLE_LIMIT_MS)
    }

    extendSessionRef.current = schedule

    let lastBump = 0
    const onActivity = () => {
      const n = Date.now()
      if (n - lastBump < ACTIVITY_THROTTLE_MS) return
      lastBump = n
      schedule()
    }

    schedule()

    const opts = { capture: true, passive: true } as const
    window.addEventListener('mousemove', onActivity, opts)
    window.addEventListener('keydown', onActivity, opts)
    window.addEventListener('click', onActivity, opts)
    window.addEventListener('scroll', onActivity, opts)

    return () => {
      clearTimers()
      window.removeEventListener('mousemove', onActivity, true)
      window.removeEventListener('keydown', onActivity, true)
      window.removeEventListener('click', onActivity, true)
      window.removeEventListener('scroll', onActivity, true)
    }
  }, [user?.id, loading, router, signOut])

  if (!user || loading) return null

  function extendSession() {
    extendSessionRef.current()
  }

  return (
    <Modal
      open={showWarning}
      onClose={extendSession}
      title="You’ll be logged out soon"
      titleId="idle-session-title"
      description="You’ve been inactive. For your security, we’ll sign you out when the timer reaches zero."
      footer={
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-left">
            {formatCountdown(secondsLeft)}
          </p>
          <button
            type="button"
            onClick={extendSession}
            className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-indigo-500 active:scale-95 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Stay logged in
          </button>
        </div>
      }
    />
  )
}
