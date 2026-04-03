import { supabase } from '@/lib/supabase'

export type Transaction = {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  created_at: string
}

export async function fetchTransactionsForUser(userId: string) {
  return supabase
    .from('transactions')
    .select('id, user_id, amount, category, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function insertTransaction(payload: {
  userId: string
  amount: number
  category: string
  description: string | null
}) {
  return supabase.from('transactions').insert({
    user_id: payload.userId,
    amount: payload.amount,
    category: payload.category,
    description: payload.description,
  })
}

export type ImportedTransactionRow = {
  amount: number
  description: string | null
  createdAt: string
}

export async function insertImportedTransactions(
  userId: string,
  category: string,
  rows: ImportedTransactionRow[],
) {
  if (rows.length === 0) {
    return { data: null, error: null as null }
  }
  const payload = rows.map((r) => ({
    user_id: userId,
    amount: r.amount,
    category,
    description: r.description,
    created_at: r.createdAt,
  }))
  return supabase.from('transactions').insert(payload)
}
