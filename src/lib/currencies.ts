export const DEFAULT_CURRENCY = 'USD' as const

/** Order matches product priority (India-first app). */
export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', sample: 50_000, locale: 'en-IN' },
  { code: 'USD', symbol: '$', sample: 600, locale: 'en-US' },
  { code: 'GBP', symbol: '£', sample: 480, locale: 'en-GB' },
  { code: 'EUR', symbol: '€', sample: 550, locale: 'de-DE' },
  { code: 'JPY', symbol: '¥', sample: 90_000, locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', sample: 4_200, locale: 'zh-CN' },
] as const

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

export type CurrencyDefinition = (typeof SUPPORTED_CURRENCIES)[number]

const codes = new Set<string>(SUPPORTED_CURRENCIES.map((c) => c.code))

export function isSupportedCurrency(value: string): value is SupportedCurrencyCode {
  return codes.has(value)
}

export function getCurrencyDefinition(
  code: SupportedCurrencyCode,
): (typeof SUPPORTED_CURRENCIES)[number] {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  return found ?? SUPPORTED_CURRENCIES[1]
}
