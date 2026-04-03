export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatAmountPlain(value: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** INR for insight copy (e.g. ₹500) */
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
