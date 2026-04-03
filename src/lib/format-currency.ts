import {
  DEFAULT_CURRENCY,
  getCurrencyDefinition,
  type SupportedCurrencyCode,
} from '@/lib/currencies'

/**
 * Format a number with the user’s preferred ISO currency (or an explicit code).
 */
export function formatCurrency(
  value: number,
  currency: SupportedCurrencyCode = DEFAULT_CURRENCY,
  options?: { maximumFractionDigits?: 0 | 2 },
) {
  const meta = getCurrencyDefinition(currency)
  const defaultFrac = currency === 'JPY' ? (0 as const) : (2 as const)
  const maxFrac =
    options?.maximumFractionDigits !== undefined
      ? options.maximumFractionDigits
      : defaultFrac

  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: maxFrac,
    maximumFractionDigits: maxFrac,
  }).format(value)
}

export function formatAmountPlain(value: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** INR for India-specific tools (e.g. tax slabs in INR). */
export function formatRupee(
  value: number,
  maximumFractionDigits: 0 | 2 = 0,
) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
    maximumFractionDigits,
  }).format(value)
}
