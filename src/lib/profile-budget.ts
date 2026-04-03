import { supabase } from '@/lib/supabase'

export type ProfileBudgetRow = {
  monthly_budget: number | null
}

export async function fetchProfileBudget(userId: string) {
  return supabase
    .from('profiles')
    .select('monthly_budget')
    .eq('id', userId)
    .maybeSingle()
}

export async function updateMonthlyBudget(userId: string, monthlyBudget: number | null) {
  return supabase
    .from('profiles')
    .update({ monthly_budget: monthlyBudget })
    .eq('id', userId)
}
