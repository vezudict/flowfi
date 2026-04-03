/** Educational only — not a bureau model */

export const CREDIT_SCORE_MIN = 300
export const CREDIT_SCORE_MAX = 900
export const MAX_CREDIT_AGE_YEARS = 50

export type CreditRating = 'excellent' | 'good' | 'average' | 'poor'

export type CreditSimInputs = {
  paymentHistoryPercent: number
  utilizationPercent: number
  creditAgeYears: number
  creditMix: boolean
}

export type CreditSimResult = {
  score: number
  rating: CreditRating
  ratingLabel: string
  suggestions: string[]
}

export function computeSimulatedScore(inputs: CreditSimInputs): CreditSimResult {
  const { paymentHistoryPercent, utilizationPercent, creditAgeYears, creditMix } =
    inputs

  let score =
    CREDIT_SCORE_MIN +
    paymentHistoryPercent * 0.35 +
    (100 - utilizationPercent) * 0.3 +
    creditAgeYears * 5 +
    (creditMix ? 50 : 0)

  score = Math.round(score)
  score = Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, score))

  const { rating, ratingLabel } = ratingFromScore(score)
  const suggestions = buildSuggestions(inputs)

  return { score, rating, ratingLabel, suggestions }
}

function ratingFromScore(score: number): {
  rating: CreditRating
  ratingLabel: string
} {
  if (score >= 750) return { rating: 'excellent', ratingLabel: 'Excellent' }
  if (score >= 650) return { rating: 'good', ratingLabel: 'Good' }
  if (score >= 500) return { rating: 'average', ratingLabel: 'Average' }
  return { rating: 'poor', ratingLabel: 'Poor' }
}

function buildSuggestions(inputs: CreditSimInputs): string[] {
  const out: string[] = []

  if (inputs.paymentHistoryPercent < 85) {
    out.push(
      'Pay every account on time — in real life, late payments weigh heavily.',
    )
  }
  if (inputs.utilizationPercent > 30) {
    out.push(
      'Lower revolving balances when you can; many models favor utilization well under 30%.',
    )
  }
  if (inputs.creditAgeYears < 3) {
    out.push(
      'Longer, healthy account history tends to help; avoid closing old cards without a reason.',
    )
  }
  if (!inputs.creditMix) {
    out.push(
      'A modest mix of credit types (e.g. card + installment) is one factor some scores consider.',
    )
  }
  if (out.length < 2) {
    out.push(
      'Keep monitoring balances and due dates; small habits compound over time.',
    )
  }
  if (out.length < 2) {
    out.push(
      'This toy formula is not your real score—check real reports for accuracy.',
    )
  }

  return out.slice(0, 3)
}
