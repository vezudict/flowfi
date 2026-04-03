/**
 * Restricts input to a non-negative decimal string (digits + at most one '.').
 * Use with controlled text inputs so users cannot type letters or multiple decimals.
 */
export function sanitizeUnsignedDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts[0]}.${parts.slice(1).join('')}`
}
