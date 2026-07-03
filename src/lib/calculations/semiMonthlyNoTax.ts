import type { PayrollInputs, PayrollResult } from "@/types/payroll"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import {
  HOURS_PER_DAY,
  PREMIUM_RATE,
  SEMI_MONTHLY_EXEMPTION,
  round
} from "./shared"

export function getSemiMonthlyNoTaxEarned(monthlyRate: number): number {
  return round(monthlyRate / 2)
}

export function computeSemiMonthlyNoTaxPayroll(inputs: PayrollInputs): PayrollResult {
  const { monthlyRate, workingDays, periodStart, periodEnd, lateMinutes, undertimeMinutes, absentDays } = inputs
  const overpayment = round(inputs.overpayment ?? 0)

  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRate = round(monthlyRate / workingDays)
  const hourlyRate = round(dailyRate / HOURS_PER_DAY)
  const perMinRate = round(dailyRate / HOURS_PER_DAY / 60)

  const earned = getSemiMonthlyNoTaxEarned(monthlyRate)
  const absentDeduction = round(dailyRate * absentDays)
  const lateDeduction = round(perMinRate * lateMinutes)
  const undertimeDeduction = round(perMinRate * (undertimeMinutes ?? 0))

  const total = round(Math.max(0, earned - absentDeduction - lateDeduction - undertimeDeduction))
  const premium = round(total * PREMIUM_RATE)
  const overpaymentPremium = round(overpayment * PREMIUM_RATE)

  const grossPay = round(total + premium - overpayment - overpaymentPremium)
  
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
    absentDeduction,
    lateDeduction,
    undertimeDeduction,
    taxableIncome,
    tax,
    totalDeductions,
    netPay,
    computationType: "semi-monthly-no-tax",
    exemptionLimit: SEMI_MONTHLY_EXEMPTION,
  }
}
