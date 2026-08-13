import { describe, expect, it } from "vitest"

import { computePayroll, SEMI_MONTHLY_EXEMPTION } from "./payroll"
import { payrollSchema } from "./schema"

const MAY_FIRST_CUTOFF = {
  periodStart: "2026-05-01",
  periodEnd: "2026-05-15",
} as const

describe("computePayroll", () => {
  it("matches HR spreadsheet for May 1–15, 2026 (Iverson sample)", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 7,
      absentDays: 0,
      overpayment: 1_227.3,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.earned).toBe(13_500)
    expect(result.hourlyRate).toBe(160.71)
    expect(result.perMinRate).toBe(2.68)
    expect(result.lateDeduction).toBe(18.76)
    expect(result.total).toBe(13_481.24)
    expect(result.premium).toBe(2_696.25)
    expect(result.overpayment).toBe(1_227.3)
    expect(result.overpaymentPremium).toBe(245.46)
    expect(result.grossPay).toBe(14_704.73)
    expect(result.tax).toBe(214.4)
    expect(result.netPay).toBe(14_490.33)
  })

  it("uses semi-monthly earned (monthly rate ÷ 2) regardless of cutoff length", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.earned).toBe(13_500)
    expect(result.total).toBe(13_500)
    expect(result.premium).toBe(2_700)
    expect(result.grossPay).toBe(16_200)
    expect(result.netPay).toBe(15_910.83)
  })

  it("applies 20% premium on total after late and absent", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 22,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-15",
      lateMinutes: 0,
      absentDays: 1,
      overpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.earned).toBe(13_500)
    expect(result.absentDeduction).toBe(1_227.27)
    expect(result.total).toBe(12_272.73)
    expect(result.premium).toBe(2_454.55)
    expect(result.grossPay).toBe(14_727.28)
  })

  it("deducts overpayment and 20% premium on overpayment from gross", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 22,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 1_200,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.overpaymentPremium).toBe(240)
    expect(result.grossPay).toBe(14_760)
    expect(result.tax).toBe(217.17)
    expect(result.netPay).toBe(14_542.83)
  })

  it("charges zero tax when gross is below the semi-monthly exemption", () => {
    const result = computePayroll({
      monthlyRate: 15_000,
      workingDays: 22,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 5_000,
      undertimeMinutes: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.grossPay).toBe(3_000)
    expect(result.grossPay).toBeLessThan(SEMI_MONTHLY_EXEMPTION)
    expect(result.tax).toBe(0)
    expect(result.netPay).toBe(3_000)
  })

  it("calculates undertime deduction separately and applies premium", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 22,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-15",
      lateMinutes: 10,
      undertimeMinutes: 15,
      absentDays: 0,
      overpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    })

    expect(result.perMinRate).toBe(2.56)
    expect(result.lateDeduction).toBe(25.60)
    expect(result.undertimeDeduction).toBe(38.40)
    expect(result.earned).toBe(13_500)
    expect(result.total).toBe(13_436)
    expect(result.premium).toBe(2_687.2)
  })

  it("calculates using daily rate for daily computation mode", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 7,
      absentDays: 0,
      overpayment: 1_227.3,
      computationType: "daily",
      additionalTax: 0,
    })

    expect(result.dailyRate).toBe(1_285.71)
    expect(result.periodWorkingDays).toBe(11)
    expect(result.earned).toBe(14_142.86)
    expect(result.lateDeduction).toBe(18.76)
    expect(result.total).toBe(14_124.10)
    expect(result.premium).toBe(2_824.82)
    expect(result.grossPay).toBe(15_476.16)
    expect(result.tax).toBe(252.97)
    expect(result.netPay).toBe(15_223.19)
  })

  it("prevents daily rate fractional rounding loss over cutoffs (User 22-day month sample)", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 22,
      ...MAY_FIRST_CUTOFF, // 11 working days (May 1-15, 2026)
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      computationType: "daily",
      additionalTax: 0,
    })

    expect(result.dailyRate).toBe(1_227.27)
    expect(result.periodWorkingDays).toBe(11)
    expect(result.earned).toBe(13_500.00)
  })

  it("applies additionalTax to deductions and net pay correctly", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      ...MAY_FIRST_CUTOFF,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 500,
    })

    expect(result.tax).toBe(789.17)
    expect(result.netPay).toBe(15_410.83)
  })

  it("calculates using full monthly rate for monthly computation mode", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      lateMinutes: 7,
      absentDays: 0,
      overpayment: 1_227.3,
      computationType: "monthly",
      additionalTax: 0,
    })

    expect(result.earned).toBe(27_000)
    expect(result.exemptionLimit).toBe(20_833.33)
    expect(result.lateDeduction).toBe(18.76)
    expect(result.total).toBe(26_981.24)
    expect(result.premium).toBe(5_396.25)
    expect(result.grossPay).toBe(30_904.73)
    expect(result.tax).toBe(503.57)
    expect(result.netPay).toBe(30_401.16)
  })

  it("calculates using full monthly rate and no tax for monthly-no-tax computation mode", () => {
    const result = computePayroll({
      monthlyRate: 27_000,
      workingDays: 21,
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      lateMinutes: 7,
      absentDays: 0,
      overpayment: 1_227.3,
      computationType: "monthly-no-tax",
      additionalTax: 0,
    })

    expect(result.earned).toBe(27_000)
    expect(result.exemptionLimit).toBe(20_833.33)
    expect(result.lateDeduction).toBe(18.76)
    expect(result.total).toBe(26_981.24)
    expect(result.premium).toBe(5_396.25)
    expect(result.grossPay).toBe(30_904.73)
    expect(result.tax).toBe(0)
    expect(result.netPay).toBe(30_904.73)
  })
})

describe("payrollSchema overpayment validation", () => {
  it("rejects overpayment greater than semi-monthly earned plus premium", () => {
    const result = payrollSchema.safeParse({
      name: "Test User",
      position: "Staff",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-15",
      monthlyRate: 27_000,
      workingDays: 21,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 20_000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(" ")
      expect(messages).toMatch(/cannot exceed semi-monthly earned/i)
    }
  })

  it("rejects overpayment greater than daily earned plus premium", () => {
    const result = payrollSchema.safeParse({
      name: "Test User",
      position: "Staff",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-15",
      monthlyRate: 27_000,
      workingDays: 21,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 20_000,
      computationType: "daily",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(" ")
      expect(messages).toMatch(/cannot exceed daily earned/i)
    }
  })

  it("rejects overpayment greater than monthly earned plus premium", () => {
    const result = payrollSchema.safeParse({
      name: "Test User",
      position: "Staff",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      monthlyRate: 27_000,
      workingDays: 21,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 35_000,
      computationType: "monthly",
      additionalTax: 0,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(" ")
      expect(messages).toMatch(/cannot exceed monthly earned/i)
    }
  })

  it("rejects overpayment greater than monthly earned (no tax) plus premium", () => {
    const result = payrollSchema.safeParse({
      name: "Test User",
      position: "Staff",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      monthlyRate: 27_000,
      workingDays: 21,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 35_000,
      computationType: "monthly-no-tax",
      additionalTax: 0,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(" ")
      expect(messages).toMatch(/cannot exceed monthly earned \(no tax\)/i)
    }
  })
})
