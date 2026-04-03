'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { suggestCategoryFromDescription } from '@/lib/category-suggestion'
import { sanitizeUnsignedDecimalInput } from '@/lib/numeric-input'
import { updateTransaction, type Transaction } from '@/lib/transactions'
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
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const suggestedCategory = useMemo(
    () => suggestCategoryFromDescription(description),
    [description],
  )

  useEffect(() => {
    if (!transaction) return
    setAmount(String(transaction.amount))
    setCategory(transaction.category)
    setDescription(transaction.description ?? '')
    setFormError(null)
  }, [transaction])

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
    const { data, error } = await updateTransaction({
      id: transaction.id,
      userId: transaction.user_id,
      amount: parsed,
      category: cat,
      description: desc.length ? desc : null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Something went wrong')
      setFormError(error.message)
      return
    }
    if (data) {
      onSaved(data as Transaction)
    }
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
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{suggestedCategory}</span>
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
