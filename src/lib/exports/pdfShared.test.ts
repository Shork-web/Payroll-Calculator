import { describe, expect, it } from "vitest"

import { buildPayrollExportFilename, n } from "./pdfShared"

describe("pdfShared", () => {
  it("formats peso values for PDF output", () => {
    expect(n(14500.5)).toBe("14,500.50")
  })

  it("builds payroll export filenames from employee and period", () => {
    const filename = buildPayrollExportFilename(
      { name: "Dela Cruz, Juan", position: "Clerk", periodStart: "2026-05-01", periodEnd: "2026-05-15" },
      {
        monthlyRate: 27000,
        workingDays: 21,
        periodStart: "2026-05-01",
        periodEnd: "2026-05-15",
        lateMinutes: 0,
        absentDays: 0,
        overpayment: 0,
        underpayment: 0,
        computationType: "semi-monthly",
        additionalTax: 0,
      },
      "COMPUTATION",
    )

    expect(filename).toBe("DELACRUZ_COMPUTATION_MAY_1ST_CUTOFF_2026.pdf")
  })
})
