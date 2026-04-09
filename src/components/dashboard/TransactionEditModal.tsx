'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { getCategoryLabel, getCategoryStyleClass } from '@/lib/category-display'
import {
  isOtherLikeCategoryLabel,
  suggestCategoryFromDescription,
} from '@/lib/category-suggestion'
import {
  getAiCategoryCache,
  getCategoryFromMemory,
  setAiCategoryCache,
  setCategoryMemory,
} from '@/lib/category-memory'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { authedFetch, readAuthedJson } from '@/lib/authed-api'
import { transactionEntryType, type EntryType } from '@/lib/transaction-flow'
import type { Transaction } from '@/lib/transactions'
import { toast } from 'sonner'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 ease-in-out focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30'

type TransactionEditModalProps = {
  transaction: Transaction | null
  onClose: () => void
  onSaved: (updated: Transaction) => void
}

export function TransactionEditModal({
  transaction,
  onClose,
  onSaved,
}: TransactionEditModalProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<EntryType>('debit')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const aiAbortRef = useRef<AbortController | null>(null)

  const suggestedCategory = useMemo(
    () => suggestCategoryFromDescription(description),
    [description],
  )

  // AI fallback: when description has no rule match, try memory cache then API
  useEffect(() => {
    if (!transaction) return
    if (suggestedCategory) {
      setAiSuggestion(null)
      return
    }
    const desc = description.trim()
    if (!desc) {
      setAiSuggestion(null)
      return
    }

    // Check localStorage AI cache first (no API call)
    const cached = getAiCategoryCache(desc)
    if (cached && cached !== 'other') {
      setAiSuggestion(cached)
      return
    }

    // Check user memory (also no API call)
    const remembered = getCategoryFromMemory(desc)
    if (remembered && remembered !== 'other') {
      setAiSuggestion(null) // memory is already applied via backfill; don't show duplicate hint
      return
    }

    // Debounce: wait 600ms after typing stops before calling AI
    const timeout = setTimeout(async () => {
      aiAbortRef.current?.abort()
      const ctrl = new AbortController()
      aiAbortRef.current = ctrl

      try {
        const res = await authedFetch('/api/categorize', {
          method: 'POST',
          json: { description: desc },
          signal: ctrl.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { category?: string; confidence?: number }
        const cat = data.category
        if (cat && cat !== 'other') {
          setAiCategoryCache(desc, cat)
          setAiSuggestion(cat)
        } else {
          setAiSuggestion(null)
        }
      } catch {
        // Aborted or network error — ignore
      }
    }, 600)

    return () => {
      clearTimeout(timeout)
      aiAbortRef.current?.abort()
    }
  }, [description, suggestedCategory, transaction])

  useEffect(() => {
    if (!transaction) return
    setAmount(String(transaction.amount))
    setCategory(transaction.category)
    setDescription(transaction.description ?? '')
    setEntryType(transactionEntryType(transaction))
    setFormError(null)
    setAiSuggestion(null)
  }, [transaction])

  useEffect(() => {
    if (!transaction) return
    const suggestion = suggestedCategory
    if (!suggestion) return
    setCategory((prev) => (isOtherLikeCategoryLabel(prev) ? suggestion : prev))
  }, [suggestedCategory, transaction])

  useEffect(() => {
    if (!transaction) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [transaction, onClose])

  if (!transaction) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transaction) return
    setFormError(null)
    const parsed = Number.parseFloat(amount)
    if (!Number.isFinite(parsed)) {
      setFormError('Enter a valid amount.')
      return
    }
    const cat = category.trim()
    if (!cat) {
      setFormError('Category is required.')
      return
    }
    setSaving(true)
    const desc = description.trim()
    const res = await authedFetch(`/api/transactions/${transaction.id}`, {
      method: 'PATCH',
      json: {
        amount: parsed,
        category: cat,
        description: desc.length ? desc : null,
        transactionType: entryType,
      },
    })
    const result = await readAuthedJson<{ data: Transaction }>(res)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.message)
      setFormError(result.message)
      return
    }
    // Persist user's category choice so future transactions with same description auto-categorize
    if (desc) setCategoryMemory(desc, cat)
    onSaved(result.data.data)
    toast.success('Transaction updated')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] transition-opacity dark:bg-black/70"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tx-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="edit-tx-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Edit transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(transaction.created_at).toLocaleString()}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Entry type
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEntryType('debit')}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  entryType === 'debit'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-100'
                    : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
                }`}
              >
                Debit (expense)
              </button>
              <button
                type="button"
                onClick={() => setEntryType('credit')}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  entryType === 'credit'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
                }`}
              >
                Credit (income)
              </button>
            </div>
          </div>
          {formError ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {formError}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-amount" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Amount
            </label>
            <input
              id="edit-tx-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={amount}
              onChange={(e) => setAmount(sanitizeUnsignedDecimalInput(e.target.value))}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-category" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Category
            </label>
            <input
              id="edit-tx-category"
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-description" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Description
            </label>
            <textarea
              id="edit-tx-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Optional"
            />
            {suggestedCategory ? (
              <p className="text-xs text-zinc-500/90 dark:text-zinc-400/85">
                Suggested from description:{' '}
                <button
                  type="button"
                  onClick={() => setCategory(suggestedCategory)}
                  className={`font-medium underline-offset-2 hover:underline ${getCategoryStyleClass(suggestedCategory)}`}
                >
                  {getCategoryLabel(suggestedCategory)}
                </button>
              </p>
            ) : aiSuggestion ? (
              <p className="text-xs text-zinc-500/90 dark:text-zinc-400/85">
                AI suggested:{' '}
                <button
                  type="button"
                  onClick={() => setCategory(aiSuggestion)}
                  className={`font-medium underline-offset-2 hover:underline ${getCategoryStyleClass(aiSuggestion)}`}
                >
                  {getCategoryLabel(aiSuggestion)}
                </button>
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">(click to apply)</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
