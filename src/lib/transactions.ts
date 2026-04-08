import { normalizeTransaction } from '@/lib/transaction-normalizer'
import { supabase } from '@/lib/supabase'

export type Transaction = {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  created_at: string
  /** debit = expense, credit = income (optional until row is refreshed after migration). */
  transaction_type?: 'debit' | 'credit'
}

export async function fetchTransactionsForUser(userId: string) {
  const res = await supabase
    .from('transactions')
    .select('id, user_id, amount, category, description, created_at, transaction_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (res.error || res.data == null) {
    return res
  }

  const data = (res.data as Transaction[]).map(normalizeTransaction)

  return { ...res, data }
}

export async function insertTransaction(payload: {
  userId: string
  amount: number
  category: string
  description: string | null
  transaction_type?: 'debit' | 'credit'
}) {
  return supabase.from('transactions').insert({
    user_id: payload.userId,
    amount: payload.amount,
    category: payload.category,
    description: payload.description,
    transaction_type: payload.transaction_type ?? 'debit',
  })
}

export async function updateTransaction(payload: {
  id: string
  userId: string
  amount: number
  category: string
  description: string | null
  transaction_type?: 'debit' | 'credit'
}) {
  return supabase
    .from('transactions')
    .update({
      amount: payload.amount,
      category: payload.category,
      description: payload.description,
      transaction_type: payload.transaction_type ?? 'debit',
    })
    .eq('id', payload.id)
    .eq('user_id', payload.userId)
    .select('id, user_id, amount, category, description, created_at, transaction_type')
    .single()
}

export async function deleteTransaction(id: string, userId: string) {
  return supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)
}

export type ImportedTransactionRow = {
  amount: number
  category: string
  description: string | null
  createdAt: string
  transaction_type: 'debit' | 'credit'
}

export async function insertImportedTransactions(
  userId: string,
  rows: ImportedTransactionRow[],
) {
  if (rows.length === 0) {
    return { data: null, error: null as null }
  }
  const payload = rows.map((r) => ({
    user_id: userId,
    amount: r.amount,
    category: r.category,
    description: r.description,
    created_at: r.createdAt,
    transaction_type: r.transaction_type,
  }))
  return supabase.from('transactions').insert(payload)
}
