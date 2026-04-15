/** Educational only — not a bureau model */

export const CREDIT_SCORE_MIN = 300
export const CREDIT_SCORE_MAX = 900
export const MAX_CREDIT_AGE_YEARS = 50

export type CreditRating = 'excellent' | 'good' | 'average' | 'poor'

export type CreditFactor = {
  label: string
  impact: number
  explanation: string
}

export type CreditSimInputs = {
  paymentHistoryPercent: number
  utilizationPercent: number
  creditAgeYears: number
  creditMix: boolean
  hardInquiries: number
}

export type CreditSimResult = {
  score: number
  delta: number
  rating: CreditRating
  ratingLabel: string
  factors: CreditFactor[]
  suggestions: string[]
}

/** Baseline score representing "average" profile. */
const BASELINE_SCORE = 650

export function computeSimulatedScore(inputs: CreditSimInputs): CreditSimResult {
  const { paymentHistoryPercent, utilizationPercent, creditAgeYears, creditMix, hardInquiries } =
    inputs

  const factors: CreditFactor[] = []

  // Payment history — 35% weight
  const paymentBase = paymentHistoryPercent * 2.1
  const paymentImpact = Math.round(paymentBase - 210 + (paymentHistoryPercent >= 95 ? 30 : 0))
  factors.push({
    label: 'Payment history',
    impact: paymentImpact,
    explanation:
      paymentHistoryPercent >= 98
        ? 'Near-perfect on-time payments — the strongest positive factor.'
        : paymentHistoryPercent >= 85
          ? `${paymentHistoryPercent}% on-time payments. Occasional missed payments weigh on the score.`
          : `${paymentHistoryPercent}% on-time is below healthy levels. Late payments are a major negative signal.`,
  })

  // Utilization — 30% weight
  const utilizationImpact = Math.round((30 - utilizationPercent) * 1.5)
  factors.push({
    label: 'Credit utilization',
    impact: utilizationImpact,
    explanation:
      utilizationPercent <= 10
        ? 'Very low utilization — lenders see you as low-risk.'
        : utilizationPercent <= 30
          ? `${utilizationPercent}% utilization is in the healthy range (≤30%).`
          : `Using ${utilizationPercent}% of your credit limit is considered high — this drags down your score.`,
  })

  // Credit age — 15% weight
  const ageImpact = Math.round(Math.min(creditAgeYears, 20) * 3 - 30)
  factors.push({
    label: 'Credit age',
    impact: ageImpact,
    explanation:
      creditAgeYears >= 10
        ? `${creditAgeYears} year history shows stability.`
        : creditAgeYears >= 4
          ? `${creditAgeYears} year average age is developing — keep old accounts open.`
          : `${creditAgeYears} year history is thin. New credit takes time to build trust.`,
  })

  // Credit mix — 10% weight
  const mixImpact = creditMix ? 25 : -10
  factors.push({
    label: 'Credit mix',
    impact: mixImpact,
    explanation: creditMix
      ? 'Diverse credit types (e.g. card + loan) signal responsible management.'
      : 'Single credit type. A modest mix tends to help most scoring models.',
  })

  // Hard inquiries — 10% weight
  const inquiryImpact = Math.round(Math.min(hardInquiries, 6) * -12)
  if (hardInquiries > 0) {
    factors.push({
      label: 'Hard inquiries',
      impact: inquiryImpact,
      explanation:
        hardInquiries === 1
          ? '1 recent hard inquiry has a minor effect — it fades in ~12 months.'
          : `${hardInquiries} recent inquiries signal active credit-seeking, which lowers the score temporarily.`,
    })
  }

  // Compute score
  let score =
    CREDIT_SCORE_MIN +
    paymentHistoryPercent * 2.1 +
    (100 - utilizationPercent) * 1.8 +
    Math.min(creditAgeYears, 20) * 3 +
    (creditMix ? 50 : 0) +
    Math.min(hardInquiries, 6) * -12

  score = Math.round(score)
  score = Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, score))

  const delta = score - BASELINE_SCORE
  const { rating, ratingLabel } = ratingFromScore(score)
  const suggestions = buildSuggestions(inputs)

  return { score, delta, rating, ratingLabel, factors, suggestions }
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

  if (inputs.utilizationPercent > 30) {
    out.push(
      `Reduce utilization from ${inputs.utilizationPercent}% to below 30% — this is the fastest improvement lever.`,
    )
  }
  if (inputs.paymentHistoryPercent < 85) {
    out.push(
      'Set up autopay for every account to stop new missed payments immediately.',
    )
  }
  if (inputs.hardInquiries > 2) {
    out.push(
      'Pause new credit applications for 6 months — hard inquiries compound quickly.',
    )
  }
  if (inputs.creditAgeYears < 3) {
    out.push(
      'Avoid closing your oldest card — account age matters more as your profile grows.',
    )
  }
  if (!inputs.creditMix) {
    out.push(
      'Consider a small installment loan or secured card to diversify your credit mix.',
    )
  }
  if (out.length === 0) {
    out.push(
      'Strong profile — keep utilization low and maintain your on-time payment streak.',
    )
  }

  return out.slice(0, 3)
}
