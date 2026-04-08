import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type ProfileBudgetRow = {
  monthly_budget: number | null
}

/** Row shape for one-shot profile prefs read (matches `profiles` migrations). */
export type ProfilePreferencesRow = {
  monthly_budget: number | null
  preferred_currency: string | null
}

export type ProfilePreferencesResult = {
  data: ProfilePreferencesRow | null
  error: PostgrestError | null
}

const inflightPrefs = new Map<string, Promise<ProfilePreferencesResult>>()

/**
 * Single round-trip for dashboard + currency. Uses `.maybeSingle()` (not `.single()`)
 * so a missing profile row returns `data: null` instead of a client error.
 */
export async function fetchProfilePreferences(
  userId: string,
): Promise<ProfilePreferencesResult> {
  if (!userId?.trim()) {
    return { data: null, error: null }
  }

  const existing = inflightPrefs.get(userId)
  if (existing) return existing

  const p = (async (): Promise<ProfilePreferencesResult> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('monthly_budget, preferred_currency')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('PROFILE FETCH ERROR', error)
      return { data: null, error }
    }
    return { data: data as ProfilePreferencesRow | null, error: null }
  })().finally(() => {
    inflightPrefs.delete(userId)
  })

  inflightPrefs.set(userId, p)
  return p
}

export async function fetchProfileBudget(userId: string) {
  const { data, error } = await fetchProfilePreferences(userId)
  if (error) {
    return { data: null, error }
  }
  return {
    data: data ? { monthly_budget: data.monthly_budget } : null,
    error: null,
  }
}

export async function updateMonthlyBudget(userId: string, monthlyBudget: number | null) {
  return supabase
    .from('profiles')
    .update({ monthly_budget: monthlyBudget })
    .eq('id', userId)
}

export async function fetchPreferredCurrency(userId: string) {
  const { data, error } = await fetchProfilePreferences(userId)
  if (error) {
    return { data: null, error }
  }
  return {
    data: data ? { preferred_currency: data.preferred_currency } : null,
    error: null,
  }
}

export async function updatePreferredCurrency(userId: string, preferredCurrency: string) {
  return supabase
    .from('profiles')
    .update({ preferred_currency: preferredCurrency })
    .eq('id', userId)
}
