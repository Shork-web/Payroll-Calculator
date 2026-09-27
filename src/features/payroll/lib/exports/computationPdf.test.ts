import { describe, expect, it } from "vitest"
import type { PayrollInputs } from "@/features/payroll/types/payroll"
import { computePayroll } from "@/features/payroll/lib/payroll"
import {
  parseDateToken,
  formatGroupedDates,
  formatIncidentDate,
  extractDateTokens,
  buildAbsentRowInfo,
  buildLateRowInfo,
  buildUndertimeRowInfo,
  buildAbsentDescription,
  buildLateDescription,
  buildUndertimeDescription,
  buildComputationRows,
} from "./computationPdf"

describe("computationPdf attendance formatting & table organization", () => {
  describe("parseDateToken & extractDateTokens", () => {
    it("parses full written dates with year", () => {
      const parsed = parseDateToken("September 25, 2026")
      expect(parsed.monthName).toBe("September")
      expect(parsed.day).toBe(25)
      expect(parsed.year).toBe(2026)
    })

    it("parses ISO dates", () => {
      const parsed = parseDateToken("2026-09-29")
      expect(parsed.monthName).toBe("September")
      expect(parsed.day).toBe(29)
      expect(parsed.year).toBe(2026)
    })

    it("extracts multiple written dates with internal commas cleanly", () => {
      const raw = "September 25, 2026, September 29, 2026"
      const tokens = extractDateTokens(raw)
      expect(tokens).toEqual(["September 25, 2026", "September 29, 2026"])
    })

    it("formats individual incident dates with formatIncidentDate", () => {
      expect(formatIncidentDate("September 25, 2026")).toBe("September 25, 2026")
      expect(formatIncidentDate("2026-09-25")).toBe("September 25, 2026")
      expect(formatIncidentDate("")).toBe("")
    })
  })

  describe("formatGroupedDates", () => {
    it("groups dates sharing the same month and year into a clean, non-repetitive format", () => {
      const items = [
        parseDateToken("September 25, 2026"),
        parseDateToken("September 29, 2026"),
      ]
      expect(formatGroupedDates(items)).toBe("September 25, 29, 2026")
    })

    it("handles 3 dates in the same month", () => {
      const items = [
        parseDateToken("September 22, 2026"),
        parseDateToken("September 25, 2026"),
        parseDateToken("September 29, 2026"),
      ]
      expect(formatGroupedDates(items)).toBe("September 22, 25, 29, 2026")
    })

    it("formats single date cleanly", () => {
      const items = [parseDateToken("September 25, 2026")]
      expect(formatGroupedDates(items)).toBe("September 25, 2026")
    })

    it("formats dates spanning across different months", () => {
      const items = [
        parseDateToken("September 29, 2026"),
        parseDateToken("October 2, 2026"),
      ]
      expect(formatGroupedDates(items)).toBe("September 29, 2026; October 2, 2026")
    })

    it("preserves suffixes such as minutes or AM/PM half-days", () => {
      const items = [
        { ...parseDateToken("September 22, 2026"), suffix: "15m" },
        { ...parseDateToken("September 28, 2026"), suffix: "30m" },
      ]
      expect(formatGroupedDates(items)).toBe("September 22 (15m), 28 (30m), 2026")
    })
  })

  describe("buildAbsentRowInfo & buildAbsentDescription", () => {
    const baseInputs: PayrollInputs = {
      monthlyRate: 27000,
      workingDays: 22,
      periodStart: "2026-09-16",
      periodEnd: "2026-09-30",
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      underpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    }

    it("returns 'Less: Absent' with no subDescription when absentDays is 0", () => {
      const info = buildAbsentRowInfo(baseInputs, 0)
      expect(info.description).toBe("Less: Absent")
      expect(info.subDescription).toBeUndefined()
    })

    it("organizes 2 absent days from the user's exact input (September 25, 2026, September 29, 2026)", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        absentDays: 2,
        absentDates: "September 25, 2026, September 29, 2026",
      }
      const info = buildAbsentRowInfo(inputs, 2454.54)
      expect(info.description).toBe("Less: Absent (2 days)")
      expect(info.subDescription).toBe("Dates: September 25, 29, 2026")
    })

    it("organizes absent days from lateIncidents array", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        absentDays: 2,
        lateIncidents: [
          { date: "2026-09-25", minutes: 0, days: 1, type: "absent" },
          { date: "2026-09-29", minutes: 0, days: 1, type: "absent" },
        ],
      }
      const info = buildAbsentRowInfo(inputs, 2454.54)
      expect(info.description).toBe("Less: Absent (2 days)")
      expect(info.subDescription).toBe("Dates: September 25, 29, 2026")
    })

    it("handles single absent day with singular 'Date:' label", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        absentDays: 1,
        lateIncidents: [
          { date: "2026-09-25", minutes: 0, days: 1, type: "absent" },
        ],
      }
      const info = buildAbsentRowInfo(inputs, 1227.27)
      expect(info.description).toBe("Less: Absent (1 day)")
      expect(info.subDescription).toBe("Date: September 25, 2026")
    })

    it("handles half-day absences with AM/PM indicators", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        absentDays: 1.5,
        lateIncidents: [
          { date: "2026-09-25", minutes: 0, days: 1, type: "absent" },
          { date: "2026-09-29", minutes: 0, days: 0.5, type: "halfday-am" },
        ],
      }
      const info = buildAbsentRowInfo(inputs, 1840.91)
      expect(info.description).toBe("Less: Absent (1.5 days)")
      expect(info.subDescription).toBe("Dates: September 25, 29 (AM), 2026")
    })

    it("falls back to count only if no dates are provided", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        absentDays: 2,
      }
      const info = buildAbsentRowInfo(inputs, 2454.54)
      expect(info.description).toBe("Less: Absent (2 days)")
      expect(info.subDescription).toBeUndefined()
    })
  })

  describe("buildLateRowInfo", () => {
    const baseInputs: PayrollInputs = {
      monthlyRate: 27000,
      workingDays: 22,
      periodStart: "2026-09-16",
      periodEnd: "2026-09-30",
      lateMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      underpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    }

    it("returns 'Less: Late' when lateMinutes is 0", () => {
      const info = buildLateRowInfo(baseInputs, 0)
      expect(info.description).toBe("Less: Late")
      expect(info.subDescription).toBeUndefined()
    })

    it("organizes single late incident with 'Date:' label", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        lateMinutes: 15,
        lateIncidents: [
          { date: "2026-09-22", minutes: 15, type: "late" },
        ],
      }
      const info = buildLateRowInfo(inputs, 38.35)
      expect(info.description).toBe("Less: Late (15 mins)")
      expect(info.subDescription).toBe("Date: September 22, 2026")
    })

    it("organizes multiple late incidents with per-date minute breakdowns", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        lateMinutes: 45,
        lateIncidents: [
          { date: "2026-09-22", minutes: 15, type: "late" },
          { date: "2026-09-28", minutes: 30, type: "late" },
        ],
      }
      const info = buildLateRowInfo(inputs, 115.05)
      expect(info.description).toBe("Less: Late (45 mins)")
      expect(info.subDescription).toBe("Dates: September 22 (15m), 28 (30m), 2026")
    })
  })

  describe("buildUndertimeRowInfo", () => {
    const baseInputs: PayrollInputs = {
      monthlyRate: 27000,
      workingDays: 22,
      periodStart: "2026-09-16",
      periodEnd: "2026-09-30",
      lateMinutes: 0,
      undertimeMinutes: 0,
      absentDays: 0,
      overpayment: 0,
      underpayment: 0,
      computationType: "semi-monthly",
      additionalTax: 0,
    }

    it("returns 'Less: Undertime' when undertimeMinutes is 0", () => {
      const info = buildUndertimeRowInfo(baseInputs, 0)
      expect(info.description).toBe("Less: Undertime")
      expect(info.subDescription).toBeUndefined()
    })

    it("organizes undertime with incident dates", () => {
      const inputs: PayrollInputs = {
        ...baseInputs,
        undertimeMinutes: 20,
        lateIncidents: [
          { date: "2026-09-24", minutes: 20, type: "undertime" },
        ],
      }
      const info = buildUndertimeRowInfo(inputs, 51.14)
      expect(info.description).toBe("Less: Undertime (20 mins)")
      expect(info.subDescription).toBe("Date: September 24, 2026")
    })
  })

  describe("buildComputationRows table organization", () => {
    it("separates primary description and subDescription into clean structured row objects", () => {
      const inputs: PayrollInputs = {
        monthlyRate: 27000,
        workingDays: 22,
        periodStart: "2026-09-16",
        periodEnd: "2026-09-30",
        lateMinutes: 45,
        undertimeMinutes: 20,
        absentDays: 2,
        overpayment: 0,
        underpayment: 0,
        computationType: "semi-monthly",
        additionalTax: 0,
        lateIncidents: [
          { date: "2026-09-25", minutes: 0, days: 1, type: "absent" },
          { date: "2026-09-29", minutes: 0, days: 1, type: "absent" },
          { date: "2026-09-22", minutes: 15, type: "late" },
          { date: "2026-09-28", minutes: 30, type: "late" },
          { date: "2026-09-24", minutes: 20, type: "undertime" },
        ],
      }

      const result = computePayroll(inputs)
      const rows = buildComputationRows(result, inputs)

      const absentRow = rows.find((r) => r.description.startsWith("Less: Absent"))
      const lateRow = rows.find((r) => r.description.startsWith("Less: Late"))
      const undertimeRow = rows.find((r) => r.description.startsWith("Less: Undertime"))

      // Primary row descriptions remain clean, concise, and aligned
      expect(absentRow?.description).toBe("Less: Absent (2 days)")
      expect(absentRow?.subDescription).toBe("Dates: September 25, 29, 2026")

      expect(lateRow?.description).toBe("Less: Late (45 mins)")
      expect(lateRow?.subDescription).toBe("Dates: September 22 (15m), 28 (30m), 2026")

      expect(undertimeRow?.description).toBe("Less: Undertime (20 mins)")
      expect(undertimeRow?.subDescription).toBe("Date: September 24, 2026")
    })

    it("verifies flat description helpers for backwards compatibility", () => {
      const inputs: PayrollInputs = {
        monthlyRate: 27000,
        workingDays: 22,
        periodStart: "2026-09-16",
        periodEnd: "2026-09-30",
        lateMinutes: 15,
        undertimeMinutes: 20,
        absentDays: 2,
        overpayment: 0,
        underpayment: 0,
        computationType: "semi-monthly",
        additionalTax: 0,
        absentDates: "September 25, 2026, September 29, 2026",
        lateDates: "September 22, 2026",
        undertimeDates: "September 24, 2026",
      }

      expect(buildAbsentDescription(inputs, 2454.54)).toBe("Less: Absent (2 days) — September 25, 29, 2026")
      expect(buildLateDescription(inputs, 38.35)).toBe("Less: Late (15 mins) — September 22, 2026")
      expect(buildUndertimeDescription(inputs, 51.14)).toBe("Less: Undertime (20 mins) — September 24, 2026")
    })
  })
})
