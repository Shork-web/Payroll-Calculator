import type { PayrollInputs, PayrollResult } from "@/types/payroll"
import { computeSemiMonthlyPayroll, getSemiMonthlyEarned } from "./calculations/semiMonthly"
import { computeDailyPayroll, getDailyEarned } from "./calculations/daily"
import { computeMonthlyPayroll, getMonthlyEarned } from "./calculations/monthly"
import { round, roundUp, PREMIUM_RATE, SEMI_MONTHLY_EXEMPTION } from "./calculations/shared"

export { SEMI_MONTHLY_EXEMPTION, roundUp }

type PayrollComputationInput = Pick<
  PayrollInputs,
  | "monthlyRate"
  | "workingDays"
  | "periodStart"
  | "periodEnd"
  | "lateMinutes"
  | "undertimeMinutes"
  | "absentDays"
  | "overpayment"
  | "computationType"
>

/** Gross amount after HR rules (matches computePayroll). */
export function estimateGrossPay(input: PayrollComputationInput): number {
  const result = computePayroll({
    ...input,
    // Add defaults if they are missing
    undertimeMinutes: input.undertimeMinutes ?? 0,
    computationType: input.computationType ?? "semi-monthly",
    additionalTax: 0,
  })
  return result.grossPay
}

/** Max overpayment before gross would be wiped. */
export function estimateMaxOverpayment(
  monthlyRate: number,
  computationType: "semi-monthly" | "daily" | "monthly",
  workingDays: number,
  periodStart: string,
  periodEnd: string
): number {
  let earned = 0
  if (computationType === "daily") {
    earned = getDailyEarned(monthlyRate, workingDays, periodStart, periodEnd)
  } else if (computationType === "monthly") {
    earned = getMonthlyEarned(monthlyRate)
  } else {
    earned = getSemiMonthlyEarned(monthlyRate)
  }
  const premium = roundUp(earned * PREMIUM_RATE)
  return round(earned + premium)
}

export function computePayroll(inputs: PayrollInputs): PayrollResult {
  if (inputs.computationType === "daily") {
    return computeDailyPayroll(inputs)
  } else if (inputs.computationType === "monthly") {
    return computeMonthlyPayroll(inputs)
  }
  return computeSemiMonthlyPayroll(inputs)
}
