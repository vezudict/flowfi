/** Simplified India income tax model. Not official tax advice. */

/** Boundaries in INR (2.5L = ₹2,50,000) */
const SLAB_1 = 250_000   // 0–2.5L at 0%
const SLAB_2 = 500_000   // 2.5L–5L at 5%
const SLAB_3 = 1_000_000 // 5L–10L at 20%

/** Max deductions allowed under each section */
export const MAX_80C = 150_000
export const MAX_STANDARD_DEDUCTION = 50_000

export type TaxSlabLine = {
  range: string
  taxableAmount: number
  ratePercent: number
  tax: number
}

export type TaxDeductions = {
  section80C?: number   // ELSS, PPF, LIC, etc. (max ₹1.5L)
  hra?: number          // HRA exemption claimed
  standardDeduction?: number // Fixed ₹50,000 for salaried
}

export type TaxEstimate = {
  grossIncome: number
  totalDeductions: number
  taxableIncome: number
  estimatedTax: number
  effectiveTaxRatePercent: number
  breakdown: TaxSlabLine[]
  suggestions: string[]
}

export function estimateIncomeTax(annualIncome: number, deductions: TaxDeductions = {}): TaxEstimate {
  if (!Number.isFinite(annualIncome) || annualIncome < 0) {
    return {
      grossIncome: 0,
      totalDeductions: 0,
      taxableIncome: 0,
      estimatedTax: 0,
      effectiveTaxRatePercent: 0,
      breakdown: [],
      suggestions: [],
    }
  }

  const d80c = Math.min(Math.max(deductions.section80C ?? 0, 0), MAX_80C)
  const dHra = Math.max(deductions.hra ?? 0, 0)
  const dStandard = Math.min(Math.max(deductions.standardDeduction ?? 0, 0), MAX_STANDARD_DEDUCTION)

  const totalDeductions = d80c + dHra + dStandard
  const taxableIncome = Math.max(annualIncome - totalDeductions, 0)

  const { tax, breakdown } = computeTaxFromSlabs(taxableIncome)

  const effectiveTaxRatePercent = annualIncome > 0 ? (tax / annualIncome) * 100 : 0
  const suggestions = buildSuggestions(annualIncome, taxableIncome, deductions, tax)

  return {
    grossIncome: annualIncome,
    totalDeductions,
    taxableIncome,
    estimatedTax: tax,
    effectiveTaxRatePercent,
    breakdown,
    suggestions,
  }
}

function computeTaxFromSlabs(income: number): { tax: number; breakdown: TaxSlabLine[] } {
  const breakdown: TaxSlabLine[] = []
  let remaining = income
  let tax = 0

  // 0–2.5L: 0%
  const slice1 = Math.min(remaining, SLAB_1)
  if (slice1 > 0) {
    breakdown.push({ range: '0–2.5L', taxableAmount: slice1, ratePercent: 0, tax: 0 })
    remaining -= slice1
  }

  // 2.5L–5L: 5%
  if (remaining > 0) {
    const slice2 = Math.min(remaining, SLAB_2 - SLAB_1)
    if (slice2 > 0) {
      const slabTax = slice2 * 0.05
      breakdown.push({ range: '2.5–5L', taxableAmount: slice2, ratePercent: 5, tax: slabTax })
      tax += slabTax
      remaining -= slice2
    }
  }

  // 5L–10L: 20%
  if (remaining > 0) {
    const slice3 = Math.min(remaining, SLAB_3 - SLAB_2)
    if (slice3 > 0) {
      const slabTax = slice3 * 0.2
      breakdown.push({ range: '5–10L', taxableAmount: slice3, ratePercent: 20, tax: slabTax })
      tax += slabTax
      remaining -= slice3
    }
  }

  // 10L+: 30%
  if (remaining > 0) {
    const slabTax = remaining * 0.3
    breakdown.push({ range: '10L+', taxableAmount: remaining, ratePercent: 30, tax: slabTax })
    tax += slabTax
  }

  return { tax, breakdown }
}

function buildSuggestions(
  grossIncome: number,
  taxableIncome: number,
  deductions: TaxDeductions,
  currentTax: number,
): string[] {
  const out: string[] = []

  // 80C headroom
  const used80c = Math.min(deductions.section80C ?? 0, MAX_80C)
  const remaining80c = MAX_80C - used80c
  if (remaining80c > 0 && grossIncome > SLAB_1) {
    // Compute tax saved if remaining80c used
    const potentialSaving = computeTaxFromSlabs(Math.max(taxableIncome - remaining80c, 0)).tax
    const saving = Math.round(currentTax - potentialSaving)
    if (saving > 0) {
      out.push(
        `Investing ₹${(remaining80c / 1000).toFixed(0)}K more in 80C instruments (PPF, ELSS) could save ~₹${(saving / 1000).toFixed(1)}K in tax.`,
      )
    }
  }

  // Standard deduction
  if (!deductions.standardDeduction && grossIncome > 0) {
    const potentialSaving = computeTaxFromSlabs(Math.max(taxableIncome - MAX_STANDARD_DEDUCTION, 0)).tax
    const saving = Math.round(currentTax - potentialSaving)
    if (saving > 0) {
      out.push(
        `Claiming the ₹50,000 standard deduction (salaried) could save ~₹${(saving / 1000).toFixed(1)}K.`,
      )
    }
  }

  // HRA not claimed
  if (!deductions.hra && grossIncome > SLAB_2) {
    out.push('If you pay rent, claim HRA exemption — it can significantly reduce taxable income.')
  }

  if (out.length === 0 && currentTax === 0) {
    out.push('Your income falls in the nil-tax slab — no immediate action needed.')
  } else if (out.length === 0) {
    out.push('Deductions are well-optimized. Review NPS (80CCD) for additional savings up to ₹50K.')
  }

  return out.slice(0, 3)
}
