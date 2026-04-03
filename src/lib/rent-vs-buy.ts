const BUY_MULTIPLIER = 1.2

export type RentVsBuyRecommendation = 'rent' | 'buy'

export type RentVsBuyResult = {
  totalRentPaid: number
  estimatedBuyingCost: number
  recommendation: RentVsBuyRecommendation
  recommendationLabel: string
  summary: string
}

export type RentVsBuyInputs = {
  monthlyRent: number
  propertyPrice: number
  yearsPlanningToStay: number
}

export function totalRentPaid(
  monthlyRent: number,
  yearsPlanningToStay: number,
) {
  return monthlyRent * 12 * yearsPlanningToStay
}

export function estimatedBuyingCost(propertyPrice: number) {
  return propertyPrice * BUY_MULTIPLIER
}

export function compareRentVsBuy(inputs: RentVsBuyInputs): RentVsBuyResult {
  const { monthlyRent, propertyPrice, yearsPlanningToStay } = inputs
  const rentTotal = totalRentPaid(monthlyRent, yearsPlanningToStay)
  const buyTotal = estimatedBuyingCost(propertyPrice)

  const rentCheaper = rentTotal < buyTotal
  const recommendation: RentVsBuyRecommendation = rentCheaper ? 'rent' : 'buy'
  const recommendationLabel = rentCheaper ? 'Rent' : 'Buy'

  const summary = rentCheaper
    ? `Over ${yearsPlanningToStay} year(s), total rent is lower than the simplified all-in buy estimate—renting may cost less in this rough comparison, before equity and tax effects.`
    : `Over ${yearsPlanningToStay} year(s), the simplified all-in buy estimate is lower than total rent—buying may cost less in this rough comparison, before equity and tax effects.`

  return {
    totalRentPaid: rentTotal,
    estimatedBuyingCost: buyTotal,
    recommendation,
    recommendationLabel,
    summary,
  }
}
