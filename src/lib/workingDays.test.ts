import { describe, expect, it } from "vitest"

import {
  computeWorkingDays,
  computeWorkingDaysInRange,
  getMonthFromDateString,
  computeWeekdaysInMonth,
} from "./workingDays"

describe("computeWorkingDaysInRange", () => {
  it("returns 11 for May 2026 first cutoff (May 1–15)", () => {
    expect(computeWorkingDaysInRange("2026-05-01", "2026-05-15")).toBe(11)
  })

  it("returns 10 for May 2026 second cutoff (May 16–31)", () => {
    expect(computeWorkingDaysInRange("2026-05-16", "2026-05-31")).toBe(10)
  })

  it("sums to 21 weekdays for the full month of May 2026", () => {
    const first = computeWorkingDaysInRange("2026-05-01", "2026-05-15")
    const second = computeWorkingDaysInRange("2026-05-16", "2026-05-31")
    expect(first + second).toBe(21)
  })
})

describe("computeWorkingDays", () => {
  it("returns 20 for May 2026 (21 weekdays minus Labor Day)", () => {
    expect(computeWorkingDays(2026, 5)).toBe(20)
  })

  it("returns 21 weekdays for May 2026 (without subtracting holidays)", () => {
    expect(computeWeekdaysInMonth(2026, 5)).toBe(21)
  })

  it("parses YYYY-MM-DD into year and month", () => {
    expect(getMonthFromDateString("2026-05-01")).toEqual({ year: 2026, month: 5 })
  })
})
