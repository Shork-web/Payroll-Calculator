import { describe, expect, it } from "vitest"

import { payrollNumericSchema, payrollSchema } from "./schema"

describe("payrollSchema", () => {
  it("accepts numeric fields as strings from HTML inputs", () => {
    const result = payrollSchema.safeParse({
      name: "Iverson G. Merto",
      position: "Project Development Office - I",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-15",
      monthlyRate: "27000",
      workingDays: "22",
      lateMinutes: "8",
      undertimeMinutes: "12",
      absentDays: "0",
      overpayment: "0",
      lateIncidents: [
        { date: "June 4", minutes: "5", type: "late" },
        { date: "June 5", minutes: "7", type: "undertime" },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.monthlyRate).toBe(27_000)
      expect(result.data.workingDays).toBe(22)
      expect(result.data.lateMinutes).toBe(8)
      expect(result.data.undertimeMinutes).toBe(12)
      expect(result.data.lateIncidents).toEqual([
        { date: "June 4", minutes: 5, type: "late", days: 0 },
        { date: "June 5", minutes: 7, type: "undertime", days: 0 },
      ])
    }
  })

  it("rejects invalid working days", () => {
    const result = payrollSchema.safeParse({
      name: "Test",
      position: "Staff",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-15",
      monthlyRate: 27_000,
      workingDays: 0,
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
    })

    expect(result.success).toBe(false)
  })

  it("parses absentDays independently for live payroll computation", () => {
    const result = payrollNumericSchema.safeParse({
      monthlyRate: 27_000,
      workingDays: 22,
      lateMinutes: 0,
      absentDays: 1,
      overpayment: 0,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.absentDays).toBe(1)
    }
  })

  it("coerces empty absentDays input to zero", () => {
    const result = payrollNumericSchema.safeParse({
      monthlyRate: 27_000,
      workingDays: 22,
      lateMinutes: 0,
      absentDays: "",
      overpayment: "",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.absentDays).toBe(0)
      expect(result.data.overpayment).toBe(0)
    }
  })

  it("parses absent incidents with days in the incidents log list", () => {
    const result = payrollSchema.safeParse({
      name: "Iverson G. Merto",
      position: "Project Development Office - I",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-15",
      monthlyRate: "27000",
      workingDays: "22",
      lateMinutes: "0",
      absentDays: "0",
      overpayment: "0",
      lateIncidents: [
        { date: "June 4", minutes: "0", type: "absent", days: "1" },
        { date: "June 5", minutes: "0", type: "absent", days: "0.5" },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lateIncidents).toEqual([
        { date: "June 4", minutes: 0, type: "absent", days: 1 },
        { date: "June 5", minutes: 0, type: "absent", days: 0.5 },
      ])
    }
  })
})
