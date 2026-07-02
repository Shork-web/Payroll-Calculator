import type { PayrollInputs, PayrollResult } from "@/types/payroll"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import {
  HOURS_PER_DAY,
  PREMIUM_RATE,
  TAX_RATE,
  round,
  roundUp
} from "./shared"

// Monthly exemption: 250,000 / 12 = 20,833.333 -> roundUp is 20,833.34
export const MONTHLY_EXEMPTION = roundUp(250_000 / 12)

export function getMonthlyEarned(monthlyRate: number): number {
  return roundUp(monthlyRate)
}

export function computeMonthlyPayroll(inputs: PayrollInputs): PayrollResult {
  const { monthlyRate, workingDays, periodStart, periodEnd, lateMinutes, undertimeMinutes, absentDays } = inputs
  const overpayment = round(inputs.overpayment ?? 0)

  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRate = round(monthlyRate / workingDays)
  const hourlyRate = roundUp(dailyRate / HOURS_PER_DAY)
  const perMinRate = roundUp(dailyRate / HOURS_PER_DAY / 60)

  const earned = getMonthlyEarned(monthlyRate)
  const absentDeduction = roundUp(dailyRate * absentDays)
  const lateDeduction = roundUp(perMinRate * lateMinutes)
  const undertimeDeduction = roundUp(perMinRate * (undertimeMinutes ?? 0))

  const total = round(Math.max(0, earned - absentDeduction - lateDeduction - undertimeDeduction))
  const premium = round(total * PREMIUM_RATE)
  const overpaymentPremium = round(overpayment * PREMIUM_RATE)

  const grossPay = round(total + premium - overpayment - overpaymentPremium)
  const taxableIncome = round(Math.max(0, grossPay - MONTHLY_EXEMPTION))
  const additionalTax = round(inputs.additionalTax ?? 0)
  const baseTax = taxableIncome > 0 ? round(taxableIncome * TAX_RATE) : 0
  const tax = round(baseTax + additionalTax)

  const totalDeductions = round(absentDeduction + lateDeduction + undertimeDeduction + overpayment + overpaymentPremium + tax)
  const netPay = round(grossPay - tax)

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
    computationType: "monthly",
    exemptionLimit: MONTHLY_EXEMPTION,
  }
}
