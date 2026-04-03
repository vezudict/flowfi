const AFFORDABLE_MAX_RATIO = 0.3
const RISKY_MAX_RATIO = 0.7

export type DecisionVerdict =
  | 'affordable'
  | 'risky'
  | 'not-affordable'
  | 'no-disposable-income'

export type DecisionEvaluation = {
  verdict: DecisionVerdict
  disposableIncome: number
  /** Purchase as a fraction of disposable income, or null if not applicable */
  purchaseShareOfDisposable: number | null
  label: string
  explanation: string
}

export type NumericInputs = {
  purchaseAmount: number
  monthlyIncome: number
  monthlySpending: number
}

export function disposableIncome(monthlyIncome: number, monthlySpending: number) {
  return monthlyIncome - monthlySpending
}

export function evaluatePurchaseDecision(inputs: NumericInputs): DecisionEvaluation {
  const { purchaseAmount, monthlyIncome, monthlySpending } = inputs
  const disposable = disposableIncome(monthlyIncome, monthlySpending)

  if (disposable <= 0) {
    return {
      verdict: 'no-disposable-income',
      disposableIncome: disposable,
      purchaseShareOfDisposable: null,
      label: 'Not Affordable',
      explanation:
        disposable === 0
          ? 'Disposable income is exactly zero after spending, so there is no monthly buffer to absorb a purchase without changing income or expenses.'
          : 'Monthly spending exceeds income, so there is no positive disposable income. This purchase would require going further into deficit or relying on savings or debt.',
    }
  }

  const share = purchaseAmount / disposable

  if (share <= AFFORDABLE_MAX_RATIO) {
    return {
      verdict: 'affordable',
      disposableIncome: disposable,
      purchaseShareOfDisposable: share,
      label: 'Affordable',
      explanation:
        'This purchase is at most 30% of your estimated monthly disposable income, leaving most of your typical buffer available for savings and surprises.',
    }
  }

  if (share <= RISKY_MAX_RATIO) {
    return {
      verdict: 'risky',
      disposableIncome: disposable,
      purchaseShareOfDisposable: share,
      label: 'Risky',
      explanation:
        'This purchase would use more than 30% but at most 70% of your disposable income. It may be manageable, but it noticeably shrinks your cushion—consider timing, a smaller purchase, or trimming other costs.',
    }
  }

  return {
    verdict: 'not-affordable',
    disposableIncome: disposable,
    purchaseShareOfDisposable: share,
    label: 'Not Affordable',
    explanation:
      'This purchase would use more than 70% of your disposable income, which leaves very little room for emergencies or one-off bills without stress or borrowing.',
  }
}
