import { describe, it, expect } from "vitest"
import { computeTimeSlotsLayout } from "./dtrPdf"
import type { DtrDayLog } from "@/features/dtr/types/dtr"

describe("computeTimeSlotsLayout", () => {
  const l1 = 10
  const l2 = 25
  const l3 = 40
  const l4 = 55
  const l5 = 70
  const scaleX = 1

  const baseLog: DtrDayLog = {
    day: 22,
    dayName: "Wednesday",
    amIn: "",
    amOut: "",
    pmIn: "",
    pmOut: "",
    status: "regular",
    lateMinutes: 0,
    undertimeMinutes: 0,
  }

  it("handles middle gap event (e.g. 8:00 AM to 5:00 PM with DA event in between)", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "special",
      amIn: "8:00",
      amOut: "",
      pmIn: "",
      pmOut: "5:00",
      specialNote: "ATTENDED DA EVENT @ ASIA HOTEL",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(false) // Middle line must NOT be drawn
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.has(1)).toBe(true) // AM Out is merged
    expect(layout.mergedIndices.has(2)).toBe(true) // PM In is merged
    expect(layout.mergedIndices.has(0)).toBe(false) // AM In preserved
    expect(layout.mergedIndices.has(3)).toBe(false) // PM Out preserved
    expect(layout.mergedNote?.text).toBe("ATTENDED DA EVENT @ ASIA HOTEL")
    expect(layout.mergedNote?.startX).toBe(l2)
    expect(layout.mergedNote?.endX).toBe(l4)
    expect(layout.mergedNote?.centerX).toBe((l2 + l4) / 2)
  })

  it("automatically merges middle gap if all 4 times were default filled but specialNote is present", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "special",
      amIn: "8:00",
      amOut: "12:00",
      pmIn: "1:00",
      pmOut: "5:00",
      specialNote: "ATTENDED DA EVENT @ ASIA HOTEL",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(false)
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.has(1)).toBe(true)
    expect(layout.mergedIndices.has(2)).toBe(true)
    expect(layout.mergedNote?.startX).toBe(l2)
    expect(layout.mergedNote?.endX).toBe(l4)
  })

  it("handles afternoon gap (morning in office, afternoon on OB/event)", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "special",
      amIn: "8:00",
      amOut: "12:00",
      pmIn: "",
      pmOut: "",
      specialNote: "1-5 PM: Governor's Office",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, false)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(false) // Afternoon divider suppressed
    expect(layout.mergedIndices.has(0)).toBe(false)
    expect(layout.mergedIndices.has(1)).toBe(false)
    expect(layout.mergedIndices.has(2)).toBe(true)
    expect(layout.mergedIndices.has(3)).toBe(true)
    expect(layout.mergedNote?.startX).toBe(l3)
    expect(layout.mergedNote?.endX).toBe(l5)
  })

  it("handles morning gap (morning on OB/event, afternoon in office)", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "special",
      amIn: "",
      amOut: "",
      pmIn: "1:00",
      pmOut: "5:00",
      specialNote: "Morning Seminar",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, false)

    expect(layout.drawLineL2).toBe(false) // Morning divider suppressed
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.has(0)).toBe(true)
    expect(layout.mergedIndices.has(1)).toBe(true)
    expect(layout.mergedIndices.has(2)).toBe(false)
    expect(layout.mergedIndices.has(3)).toBe(false)
    expect(layout.mergedNote?.startX).toBe(l1)
    expect(layout.mergedNote?.endX).toBe(l3)
  })

  it("handles full day note (all 4 times empty)", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "special",
      amIn: "",
      amOut: "",
      pmIn: "",
      pmOut: "",
      specialNote: "Whole Day Travel to Regional Office",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)

    expect(layout.drawLineL2).toBe(false)
    expect(layout.drawLineL3).toBe(false)
    expect(layout.drawLineL4).toBe(false)
    expect(layout.mergedIndices.size).toBe(4)
    expect(layout.mergedNote?.startX).toBe(l1)
    expect(layout.mergedNote?.endX).toBe(l5)
  })

  it("handles CTO AM layout (merges AM In & Out into 'CTO')", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "leave-cto-am",
      pmIn: "1:00",
      pmOut: "5:00",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX)

    expect(layout.drawLineL2).toBe(false)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.has(0)).toBe(true)
    expect(layout.mergedIndices.has(1)).toBe(true)
    expect(layout.mergedNote?.text).toBe("CTO")
    expect(layout.mergedNote?.startX).toBe(l1)
    expect(layout.mergedNote?.endX).toBe(l3)
  })

  it("handles CTO PM layout (merges PM In & Out into 'CTO')", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "leave-cto-pm",
      amIn: "8:00",
      amOut: "12:00",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(false)
    expect(layout.mergedIndices.has(2)).toBe(true)
    expect(layout.mergedIndices.has(3)).toBe(true)
    expect(layout.mergedNote?.text).toBe("CTO")
    expect(layout.mergedNote?.startX).toBe(l3)
    expect(layout.mergedNote?.endX).toBe(l5)
  })

  it("handles Absent AM layout (merges AM In & Out into 'Absent' or 'ABSENT')", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "absent-am",
      pmIn: "1:00",
      pmOut: "5:00",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX)

    expect(layout.drawLineL2).toBe(false)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.has(0)).toBe(true)
    expect(layout.mergedIndices.has(1)).toBe(true)
    expect(layout.mergedNote?.text).toBe("Absent")
    expect(layout.mergedNote?.startX).toBe(l1)
    expect(layout.mergedNote?.endX).toBe(l3)

    const layoutUpper = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)
    expect(layoutUpper.mergedNote?.text).toBe("ABSENT")
  })

  it("handles Absent PM layout (merges PM In & Out into 'Absent' or 'ABSENT')", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "absent-pm",
      amIn: "8:00",
      amOut: "12:00",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(false)
    expect(layout.mergedIndices.has(2)).toBe(true)
    expect(layout.mergedIndices.has(3)).toBe(true)
    expect(layout.mergedNote?.text).toBe("Absent")
    expect(layout.mergedNote?.startX).toBe(l3)
    expect(layout.mergedNote?.endX).toBe(l5)

    const layoutUpper = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)
    expect(layoutUpper.mergedNote?.text).toBe("ABSENT")
  })

  it("handles regular working day (all dividers drawn, all times preserved)", () => {
    const log: DtrDayLog = {
      ...baseLog,
      status: "regular",
      amIn: "8:00",
      amOut: "12:00",
      pmIn: "1:00",
      pmOut: "5:00",
    }

    const layout = computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX)

    expect(layout.drawLineL2).toBe(true)
    expect(layout.drawLineL3).toBe(true)
    expect(layout.drawLineL4).toBe(true)
    expect(layout.mergedIndices.size).toBe(0)
    expect(layout.mergedNote).toBeUndefined()
  })
})
