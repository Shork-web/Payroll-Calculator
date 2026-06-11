import type { PayrollInputs, PayrollResult } from "@/types/payroll"
import { computeWorkingDaysInRange } from "@/lib/workingDays"

export const ANNUAL_EXEMPTION = 250_000

export const HOURS_PER_DAY = 8
const PREMIUM_RATE = 0.2
const TAX_RATE = 0.05

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Round up to 2 decimal places (favors employee on earnings). */
export const roundUp = (n: number) => {
  if (n === 0 || Object.is(n, -0)) {
    return 0
  }
  return Math.ceil(n * 100 - 1e-9) / 100
}

export const SEMI_MONTHLY_EXEMPTION = roundUp(ANNUAL_EXEMPTION / 12 / 2)

type PayrollComputationInput = Pick<
  PayrollInputs,
  "monthlyRate" | "workingDays" | "periodStart" | "periodEnd" | "lateMinutes" | "undertimeMinutes" | "absentDays" | "overpayment"
>

/** Gross amount after HR rules (matches computePayroll). */
export function estimateGrossPay(input: PayrollComputationInput): number {
  const result = computePayroll({
    ...input,
    // Add defaults if they are missing
    undertimeMinutes: input.undertimeMinutes ?? 0,
  })
  return result.grossPay
}

/** Max overpayment before gross would be wiped (semi-monthly earned + premium, no late/absent). */
export function estimateMaxOverpayment(monthlyRate: number): number {
  const earned = roundUp(monthlyRate / 2)
  const premium = roundUp(earned * PREMIUM_RATE)
  return round(earned + premium)
}

export function computePayroll(inputs: PayrollInputs): PayrollResult {
  const { monthlyRate, workingDays, periodStart, periodEnd, lateMinutes, undertimeMinutes, absentDays } = inputs
  const overpayment = round(inputs.overpayment ?? 0)

  const periodWorkingDays = computeWorkingDaysInRange(periodStart, periodEnd)
  const dailyRate = round(monthlyRate / workingDays)
  const hourlyRate = roundUp(dailyRate / HOURS_PER_DAY)
  const perMinRate = roundUp(dailyRate / HOURS_PER_DAY / 60)

  const earned = roundUp(monthlyRate / 2)
  const absentDeduction = roundUp(dailyRate * absentDays)
  const lateDeduction = roundUp(perMinRate * lateMinutes)
  const undertimeDeduction = roundUp(perMinRate * (undertimeMinutes ?? 0))

  const total = round(Math.max(0, earned - absentDeduction - lateDeduction - undertimeDeduction))
  const premium = round(total * PREMIUM_RATE)
  const overpaymentPremium = round(overpayment * PREMIUM_RATE)

  const grossPay = round(total + premium - overpayment - overpaymentPremium)
  const taxableIncome = round(Math.max(0, grossPay - SEMI_MONTHLY_EXEMPTION))
  const tax = taxableIncome > 0 ? round(taxableIncome * TAX_RATE) : 0

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
  }
}
