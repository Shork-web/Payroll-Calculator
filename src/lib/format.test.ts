import { describe, expect, it } from "vitest"

import { formatPayPeriod } from "./format"

describe("formatPayPeriod", () => {
  it("formats same-month semi-monthly range", () => {
    expect(formatPayPeriod("2026-05-01", "2026-05-15")).toBe("May 1 - 15, 2026")
  })

  it("formats cross-month range", () => {
    expect(formatPayPeriod("2026-05-16", "2026-05-31")).toBe("May 16 - 31, 2026")
  })
})
