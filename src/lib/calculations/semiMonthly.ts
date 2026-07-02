import type { PayrollInputs, PayrollResult } from "@/types/payroll"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import {
  HOURS_PER_DAY,
  PREMIUM_RATE,
  TAX_RATE,
  SEMI_MONTHLY_EXEMPTION,
  round,
  roundUp
} from "./shared"

export function getSemiMonthlyEarned(monthlyRate: number): number {
  return roundUp(monthlyRate / 2)
}

export function computeSemiMonthlyPayroll(inputs: PayrollInputs): PayrollResult {
  const { monthlyRate, workingDays, periodStart, periodEnd, lateMinutes, undertimeMinutes, absentDays } = inputs
  const overpayment = round(inputs.overpayment ?? 0)

  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRate = round(monthlyRate / workingDays)
  const hourlyRate = roundUp(dailyRate / HOURS_PER_DAY)
  const perMinRate = roundUp(dailyRate / HOURS_PER_DAY / 60)

  const earned = getSemiMonthlyEarned(monthlyRate)
  const absentDeduction = roundUp(dailyRate * absentDays)
  const lateDeduction = roundUp(perMinRate * lateMinutes)
  const undertimeDeduction = roundUp(perMinRate * (undertimeMinutes ?? 0))

  const total = round(Math.max(0, earned - absentDeduction - lateDeduction - undertimeDeduction))
  const premium = round(total * PREMIUM_RATE)
  const overpaymentPremium = round(overpayment * PREMIUM_RATE)

  const grossPay = round(total + premium - overpayment - overpaymentPremium)
  const taxableIncome = round(Math.max(0, grossPay - SEMI_MONTHLY_EXEMPTION))
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
    computationType: "semi-monthly",
    exemptionLimit: SEMI_MONTHLY_EXEMPTION,
  }
}
