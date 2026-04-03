/** Stored in localStorage under `theme` (see root layout inline script). */
export type ThemePreference = 'light' | 'dark' | 'system'

export function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const t = localStorage.getItem('theme')
  if (t === 'dark' || t === 'light' || t === 'system') return t
  return 'system'
}

export function mediaPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveEffectiveDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return mediaPrefersDark()
}

export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === 'undefined') return
  localStorage.setItem('theme', preference)
  document.documentElement.classList.toggle('dark', resolveEffectiveDark(preference))
}
