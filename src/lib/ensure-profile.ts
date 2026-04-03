import { supabase } from '@/lib/supabase'

export async function ensureUserProfile(): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('[ensureUserProfile] getUser failed:', userError)
    return { error: userError.message }
  }
  if (!user) {
    console.error('[ensureUserProfile] no user from getUser()')
    return { error: 'Not authenticated' }
  }

  const email = user.email
  if (!email) {
    console.error('[ensureUserProfile] user missing email', user.id)
    return { error: 'Account has no email' }
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    { id: user.id, email },
    { onConflict: 'id' },
  )

  if (profileError) {
    console.error('[ensureUserProfile] upsert failed:', profileError)
    return { error: profileError.message }
  }

  return { error: null }
}
