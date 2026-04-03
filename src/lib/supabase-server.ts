import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase client that acts as the user from the Bearer access token.
 * Always call `auth.getUser()` — do not trust client-supplied user ids.
 */
export function createSupabaseFromAccessToken(accessToken: string | undefined) {
  if (!accessToken) return null
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  })
}

export async function requireUserFromBearer(
  accessToken: string | undefined,
): Promise<{ user: User; supabase: NonNullable<ReturnType<typeof createSupabaseFromAccessToken>> } | null> {
  const supabase = createSupabaseFromAccessToken(accessToken)
  if (!supabase) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return { user, supabase }
}

export function getBearerToken(request: Request): string | undefined {
  const h = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!h?.startsWith('Bearer ')) return undefined
  const t = h.slice(7).trim()
  return t || undefined
}
