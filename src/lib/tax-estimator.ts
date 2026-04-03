/** Boundaries in INR (2.5L = ₹2,50,000) */
const SLAB_1 = 250_000 // 0–2.5L at 0%
const SLAB_2 = 500_000 // 2.5L–5L at 5% (width SLAB_2 - SLAB_1)
const SLAB_3 = 1_000_000 // 5L–10L at 20%

export type TaxSlabLine = {
  range: string
  taxableAmount: number
  ratePercent: number
  tax: number
}

export type TaxEstimate = {
  estimatedTax: number
  effectiveTaxRatePercent: number
  breakdown: TaxSlabLine[]
}

export function estimateIncomeTax(annualIncome: number): TaxEstimate {
  if (!Number.isFinite(annualIncome) || annualIncome < 0) {
    return { estimatedTax: 0, effectiveTaxRatePercent: 0, breakdown: [] }
  }

  const breakdown: TaxSlabLine[] = []
  let income = annualIncome
  let tax = 0

  // 0–2.5L: 0%
  const slice1 = Math.min(income, SLAB_1)
  if (slice1 > 0) {
    const slabTax = slice1 * 0
    breakdown.push({
      range: '0–2.5L',
      taxableAmount: slice1,
      ratePercent: 0,
      tax: slabTax,
    })
    tax += slabTax
  }
  income -= slice1

  // 2.5L–5L: 5%
  if (income > 0) {
    const width = SLAB_2 - SLAB_1
    const slice2 = Math.min(income, width)
    if (slice2 > 0) {
      const slabTax = slice2 * 0.05
      breakdown.push({
        range: '2.5–5L',
        taxableAmount: slice2,
        ratePercent: 5,
        tax: slabTax,
      })
      tax += slabTax
    }
    income -= slice2
  }

  // 5L–10L: 20%
  if (income > 0) {
    const width = SLAB_3 - SLAB_2
    const slice3 = Math.min(income, width)
    if (slice3 > 0) {
      const slabTax = slice3 * 0.2
      breakdown.push({
        range: '5–10L',
        taxableAmount: slice3,
        ratePercent: 20,
        tax: slabTax,
      })
      tax += slabTax
    }
    income -= slice3
  }

  // 10L+: 30%
  if (income > 0) {
    const slabTax = income * 0.3
    breakdown.push({
      range: '10L+',
      taxableAmount: income,
      ratePercent: 30,
      tax: slabTax,
    })
    tax += slabTax
  }

  const effectiveTaxRatePercent =
    annualIncome > 0 ? (tax / annualIncome) * 100 : 0

  return {
    estimatedTax: tax,
    effectiveTaxRatePercent,
    breakdown,
  }
}
