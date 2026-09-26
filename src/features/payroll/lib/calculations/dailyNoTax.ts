import type { PayrollInputs, PayrollResult } from "@/features/payroll/types/payroll"
import { computeWorkingDaysInRange } from "@/features/payroll/lib/workingDays"
import {
  HOURS_PER_DAY,
  PREMIUM_RATE,
  SEMI_MONTHLY_EXEMPTION,
  round
} from "./shared"

export function getDailyNoTaxEarned(
  monthlyRate: number,
  workingDays: number,
  periodStart: string,
  periodEnd: string
): number {
  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRatePrecise = monthlyRate / workingDays
  return round(dailyRatePrecise * periodWorkingDays)
}

export function computeDailyNoTaxPayroll(inputs: PayrollInputs): PayrollResult {
  const { monthlyRate, workingDays, periodStart, periodEnd, lateMinutes, undertimeMinutes, absentDays } = inputs
  const overpayment = round(inputs.overpayment ?? 0)
  const underpayment = round(inputs.underpayment ?? 0)

  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRate = round(monthlyRate / workingDays)
  const hourlyRate = round(dailyRate / HOURS_PER_DAY)
  const perMinRate = round(dailyRate / HOURS_PER_DAY / 60)

  const earned = getDailyNoTaxEarned(monthlyRate, workingDays, periodStart, periodEnd)
  const absentDeduction = round(dailyRate * absentDays)
  const lateDeduction = round(perMinRate * lateMinutes)
  const undertimeDeduction = round(perMinRate * (undertimeMinutes ?? 0))

  const total = round(Math.max(0, earned - absentDeduction - lateDeduction - undertimeDeduction))
  const premium = round(total * PREMIUM_RATE)
  const overpaymentPremium = round(overpayment * PREMIUM_RATE)
  const underpaymentPremium = round(underpayment * PREMIUM_RATE)

  const grossPay = round(total + premium - overpayment - overpaymentPremium + underpayment + underpaymentPremium)

  // No tax calculations for this computation type
  const taxableIncome = 0
  const tax = 0
  const totalDeductions = round(absentDeduction + lateDeduction + undertimeDeduction + overpayment + overpaymentPremium)
  const netPay = grossPay

  return {
    workingDays,
    periodWorkingDays,
    dailyRate,
    hourlyRate,
    perMinRate,
    earned,
    total,
    premium,
    grossPay,
    overpayment,
    overpaymentPremium,
    underpayment,
    underpaymentPremium,
    absentDeduction,
    lateDeduction,
    undertimeDeduction,
    taxableIncome,
    tax,
    totalDeductions,
    netPay,
    computationType: "daily-no-tax",
    exemptionLimit: SEMI_MONTHLY_EXEMPTION,
  }
}
