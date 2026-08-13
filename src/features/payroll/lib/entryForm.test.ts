import { describe, expect, it } from "vitest"

import { entryToFormValues } from "./entryForm"
import type { PayrollEntry } from "@/features/payroll/types/payroll"

const sampleEntry: PayrollEntry = {
  id: "entry-1",
  employee: {
    name: "Juan Dela Cruz",
    position: "Clerk",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-15",
    signatoryName: "Officer A",
    signatoryTitle: "HR",
  },
  inputs: {
    monthlyRate: 27000,
    workingDays: 21,
    periodStart: "2026-05-01",
    periodEnd: "2026-05-15",
    lateMinutes: 15,
    undertimeMinutes: 5,
    absentDays: 1,
    overpayment: 0,
    computationType: "semi-monthly",
    additionalTax: 100,
    lateIncidents: [{ date: "2026-05-02", minutes: 15, type: "late" }],
  },
  result: {
    computationType: "semi-monthly",
    workingDays: 21,
    dailyRate: 1285.71,
    hourlyRate: 160.71,
    perMinRate: 2.68,
    earned: 13500,
    absentDeduction: 1285.71,
    lateDeduction: 40.2,
    undertimeDeduction: 13.4,
    total: 12160.69,
    premium: 2432.14,
    grossPay: 14592.83,
    exemptionLimit: 125000,
    taxableIncome: 0,
    tax: 0,
    overpayment: 0,
    overpaymentPremium: 0,
    totalDeductions: 1339.31,
    netPay: 13253.52,
    periodWorkingDays: 11,
  },
}

describe("entryToFormValues", () => {
  it("maps payroll entry fields into calculator form defaults", () => {
    const form = entryToFormValues(sampleEntry)

    expect(form.name).toBe("Juan Dela Cruz")
    expect(form.position).toBe("Clerk")
    expect(form.monthlyRate).toBe(27000)
    expect(form.lateMinutes).toBe(15)
    expect(form.undertimeMinutes).toBe(5)
    expect(form.absentDays).toBe(1)
    expect(form.additionalTax).toBe(100)
    expect(form.computationType).toBe("semi-monthly")
    expect(form.lateIncidents).toHaveLength(1)
  })

  it("fills empty signatory and date fields with safe defaults", () => {
    const minimalEntry: PayrollEntry = {
      ...sampleEntry,
      employee: {
        name: "Ana",
        position: "Staff",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-15",
      },
      inputs: {
        ...sampleEntry.inputs,
        undertimeMinutes: undefined,
        lateIncidents: undefined,
        computationType: undefined,
        additionalTax: undefined,
      },
    }

    const form = entryToFormValues(minimalEntry)
    expect(form.signatoryName).toBe("")
    expect(form.undertimeMinutes).toBe(0)
    expect(form.additionalTax).toBe(0)
    expect(form.computationType).toBe("semi-monthly")
    expect(form.payslipSignatories).toEqual([{ label: "Certified Correct:", name: "", title: "" }])
  })
})
