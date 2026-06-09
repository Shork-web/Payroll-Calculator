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
    })

    expect(result.earned).toBe(13_500)
    expect(result.hourlyRate).toBe(160.72)
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
    })

    expect(result.grossPay).toBe(3_000)
    expect(result.grossPay).toBeLessThan(SEMI_MONTHLY_EXEMPTION)
    expect(result.tax).toBe(0)
    expect(result.netPay).toBe(3_000)
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
})
