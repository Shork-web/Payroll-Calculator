import { describe, it, expect, vi } from "vitest"
import jsPDF from "jspdf"
import fs from "fs"
import { computeTimeSlotsLayout, drawFittedCenterText, exportDtrPdf, getDtrContentHeight } from "./dtrPdf"
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

describe("drawFittedCenterText word stacking", () => {
  it("keeps short badges like 'CTO' or 'ABSENT' on 1 line at full size", () => {
    const doc = new jsPDF()
    const textSpy = vi.spyOn(doc, "text")

    drawFittedCenterText(doc, "CTO", 50, 20, 24, 7, 3.5, "bold", { rowY: 10, rowH: 4.6, scaleY: 1 })

    expect(textSpy).toHaveBeenCalledTimes(1)
    const call0 = textSpy.mock.calls[0]!
    expect(call0[0]).toBe("CTO")
    expect(call0[1]).toBe(50)
    expect(call0[2]).toBe(20)
    expect((call0[3] as { align?: string })?.align).toBe("center")
  })

  it("stacks long multi-word notes into multiple lines instead of turning tiny", () => {
    const doc = new jsPDF()
    const textSpy = vi.spyOn(doc, "text")

    const note = "ATTENDED DA WORKSHOP @ ASIA HOTEL CE"
    drawFittedCenterText(doc, note, 50, 20, 24, 5.5, 3.0, "bold", { rowY: 10, rowH: 4.6, scaleY: 1 })

    // Stacks across 2 lines
    expect(textSpy).toHaveBeenCalledTimes(2)
    const call0 = textSpy.mock.calls[0]!
    const call1 = textSpy.mock.calls[1]!
    expect(call0[0]).toBe("ATTENDED DA WORKSHOP")
    expect(call1[0]).toBe("@ ASIA HOTEL CE")

    // Both baselines should be safely within the row cell [10, 14.6]
    const y1 = call0[2] as number
    const y2 = call1[2] as number
    expect(y1).toBeGreaterThan(10)
    expect(y2).toBeLessThan(14.6)
    expect(y2).toBeGreaterThan(y1)
  })

  it("respects explicit newlines when present", () => {
    const doc = new jsPDF()
    const textSpy = vi.spyOn(doc, "text")

    const note = "Morning Seminar\nHotel Cebu"
    drawFittedCenterText(doc, note, 50, 20, 24, 5.5, 3.0, "bold", { rowY: 10, rowH: 4.6, scaleY: 1 })

    expect(textSpy).toHaveBeenCalledTimes(2)
    const call0 = textSpy.mock.calls[0]!
    const call1 = textSpy.mock.calls[1]!
    expect(call0[0]).toBe("Morning Seminar")
    expect(call1[0]).toBe("Hotel Cebu")
  })
})

describe("exportDtrPdf paper scaling", () => {
  const mockDays: DtrDayLog[] = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    dayName: "Monday",
    amIn: "8:00",
    amOut: "12:00",
    pmIn: "1:00",
    pmOut: "5:00",
    status: "regular" as const,
    lateMinutes: 0,
    undertimeMinutes: 0,
  }))

  it("exports PDF successfully for all paper sizes and layout options", () => {
    const saveSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {})

    const paperSizes: Array<"a4" | "letter" | "legal"> = ["a4", "letter", "legal"]
    const layouts: Array<"single" | "duplicate" | "split"> = ["single", "duplicate", "split"]

    for (const paper of paperSizes) {
      for (const layout of layouts) {
        expect(() => {
          exportDtrPdf(
            "Juan Dela Cruz",
            "October 2026",
            mockDays,
            "Supervisor Name",
            "Division Chief",
            "full-month",
            "12345",
            "FSR II",
            "Regional Office VII",
            "8:00 AM",
            "5:00 PM",
            "October",
            2026,
            paper,
            layout
          )
        }).not.toThrow()
      }
    }

    expect(saveSpy).toHaveBeenCalledTimes(paperSizes.length * layouts.length)
    saveSpy.mockRestore()
  })

  it("scales Region VII template height to fully fit each paper size with balanced margins", () => {
    const saveSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {})

    // Reference content height for Region VII should be accurate
    const contentH = getDtrContentHeight("split", "1st-half", 31)
    expect(contentH).toBeCloseTo(189.3, 1)

    const paperSpecs: Array<{ paper: "letter" | "a4" | "legal"; pageH: number }> = [
      { paper: "letter", pageH: 279.4 },
      { paper: "a4", pageH: 297 },
      { paper: "legal", pageH: 330.2 },
    ]

    for (const { paper, pageH } of paperSpecs) {
      const topMargin = 8
      const bottomMargin = 9
      const scaleY = (pageH - topMargin - bottomMargin) / contentH

      // Calculate total rendered height: header (67) + table (82.8) + footer (37) = 186.8 * scaleY + ~2.5mm title
      const renderedH = 186.8 * scaleY + 2.5
      const remainingBottomMargin = pageH - topMargin - renderedH

      // Assert bottom margin is balanced and printer-safe (~9 to 11mm) across all formats
      expect(remainingBottomMargin).toBeGreaterThanOrEqual(9.0)
      expect(remainingBottomMargin).toBeLessThanOrEqual(11.5)

      // Confirm exportDtrPdf executes without error for Region VII
      expect(() => {
        exportDtrPdf(
          "IVERSON G. MERTO",
          "September 2026",
          mockDays,
          "MIRASOL M. MAYORES",
          "OIC, Administrative Unit Head",
          "2nd-half",
          "12345",
          "Project Development Officer - I",
          "AFMD - MIS",
          "8:00 AM",
          "5:00 PM",
          "September",
          2026,
          paper,
          "split"
        )
      }).not.toThrow()
    }

    saveSpy.mockRestore()
  })
})
