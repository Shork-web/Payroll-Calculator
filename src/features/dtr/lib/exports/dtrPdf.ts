import jsPDF from "jspdf"

import type { DtrDayLog } from "@/features/dtr/types/dtr"
import { LEAVE_NAMES_MAP } from "@/features/dtr/lib/dtrConstants"
import type { PdfDoc } from "@/lib/exports/pdfShared"

const DTR_MARGIN_X = 7
const DTR_MARGIN_Y = 8
const DTR_CARD_GAP = 2
/** Shrink content slightly so borders/text stay inside typical printer no-print zones. */
const DTR_PRINT_SAFE_BUFFER = 0.93
/** Reference half-card width (mm) on A4 â€” used to compute horizontal scale. */
const DTR_REF_CARD_W = 95

export function getDtrContentHeight(
  layoutOption: "single" | "duplicate" | "split",
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month",
  daysInMonth: number
): number {
  const isRegion7 = layoutOption === "split"
  const headerBlock = isRegion7 ? 67 : 56

  let dataRows: number
  if (layoutOption === "split") {
    dataRows = 16
  } else if (cutoffPeriod === "1st-half") {
    dataRows = 15
  } else if (cutoffPeriod === "2nd-half") {
    dataRows = 16
  } else {
    dataRows = daysInMonth
  }

  const rowH = isRegion7 ? 4.6 : 4.8
  const tableBlock = rowH * (2 + dataRows)
  const footerBlock = isRegion7 ? 39.5 : 58

  return headerBlock + tableBlock + footerBlock
}

/** Reference vertical size (mm) of Civil Service Form No. 48 at scaleY = 1. */
function getForm48ContentHeight(): number {
  return 10 + 52 + 4.1 * 34 + 32
}

function formatRegion7PeriodDate(monthLabel: string, day: number, year: number): string {
  const abbr = `${monthLabel.substring(0, 3)}.`
  return `${abbr} ${day.toString().padStart(2, "0")}, ${year}`
}

function formatRegion7ScheduleTime(time: string): string {
  return time
    .trim()
    .replace(/\s*A\.?\s*M\.?\s*$/i, " A.M")
    .replace(/\s*P\.?\s*M\.?\s*$/i, " P.M")
    .replace(/^0(\d:)/, "$1")
}

function formatRegion7LogTime(time: string | undefined): string {
  if (!time) return "-"
  const [hStr, mStr] = time.split(":")
  const hour = parseInt(hStr || "0", 10)
  const mins = (mStr || "00").padStart(2, "0")
  return `${hour}:${mins}`
}

/**
 * Draws text centered horizontally at `x`.
 * If `rowContext` is provided and the text contains multiple words (or newlines) that would
 * otherwise shrink below a comfortable font size, the words are cleanly stacked across
 * 2 (or 3) lines vertically centered within the row.
 */
export function drawFittedCenterText(
  doc: PdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize = 3.5,
  fontStyle: "normal" | "bold" | "italic" = "bold",
  rowContext?: { rowY: number; rowH: number; scaleY?: number }
): void {
  if (!text || !text.trim()) return

  doc.setFont("helvetica", fontStyle)
  const trimmed = text.trim()

  const fitSingleLine = (line: string, targetSize: number, minSz: number): { text: string; size: number } => {
    let sz = targetSize
    let disp = line
    doc.setFontSize(sz)
    while (sz > minSz && doc.getTextWidth(disp) > maxWidth) {
      sz -= 0.2
      doc.setFontSize(sz)
    }
    if (doc.getTextWidth(disp) > maxWidth) {
      while (disp.length > 4 && doc.getTextWidth(`${disp}...`) > maxWidth) {
        disp = disp.substring(0, disp.length - 1)
      }
      if (doc.getTextWidth(disp) > maxWidth) {
        disp = `${disp.substring(0, Math.max(1, disp.length - 3))}...`
      }
    }
    return { text: disp, size: sz }
  }

  if (!rowContext) {
    const single = fitSingleLine(trimmed, startSize, minSize)
    doc.setFontSize(single.size)
    doc.text(single.text, x, y, { align: "center" })
    return
  }

  const { rowY, rowH, scaleY = 1 } = rowContext
  const hasManualBreaks = trimmed.includes("\n")
  const words = hasManualBreaks ? [] : trimmed.split(/\s+/).filter(Boolean)

  doc.setFontSize(startSize)
  const singleLineWidth = doc.getTextWidth(trimmed)
  const singleLineFitsComfortably =
    !hasManualBreaks &&
    (singleLineWidth <= maxWidth ||
      (startSize >= 6.5 && (startSize * (maxWidth / singleLineWidth)) >= 5.6) ||
      (startSize < 6.5 && (startSize * (maxWidth / singleLineWidth)) >= 5.0) ||
      words.length <= 1)

  if (singleLineFitsComfortably) {
    const single = fitSingleLine(trimmed, startSize, minSize)
    doc.setFontSize(single.size)
    doc.text(single.text, x, y, { align: "center" })
    return
  }

  // Multi-line stacking
  let lines: string[] = []

  if (hasManualBreaks) {
    lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean)
  } else if (words.length >= 2) {
    // Evaluate 2-line splits
    let bestSplitIndex = 1
    let bestScore = -Infinity
    let bestFs = 0
    const target2LineSize = Math.min(startSize, 5.4)

    for (let k = 1; k < words.length; k++) {
      const l1 = words.slice(0, k).join(" ")
      const l2 = words.slice(k).join(" ")

      let sz = target2LineSize
      doc.setFontSize(sz)
      const w1 = doc.getTextWidth(l1)
      const w2 = doc.getTextWidth(l2)
      const maxW = Math.max(w1, w2)
      if (maxW > maxWidth) {
        sz = target2LineSize * (maxWidth / maxW)
      }

      const diff = Math.abs(w1 - w2)
      const score = sz * 100 - diff

      if (score > bestScore) {
        bestScore = score
        bestSplitIndex = k
        bestFs = sz
      }
    }

    const twoLine1 = words.slice(0, bestSplitIndex).join(" ")
    const twoLine2 = words.slice(bestSplitIndex).join(" ")

    if (bestFs >= 4.2 || words.length < 4) {
      lines = [twoLine1, twoLine2]
    } else {
      // Evaluate 3-line splits for very long text
      let bestI = 1
      let bestJ = 2
      let best3Score = -Infinity
      let best3Fs = 0
      const target3LineSize = Math.min(startSize, 3.8)

      for (let i = 1; i < words.length - 1; i++) {
        for (let j = i + 1; j < words.length; j++) {
          const l1 = words.slice(0, i).join(" ")
          const l2 = words.slice(i, j).join(" ")
          const l3 = words.slice(j).join(" ")

          let sz = target3LineSize
          doc.setFontSize(sz)
          const w1 = doc.getTextWidth(l1)
          const w2 = doc.getTextWidth(l2)
          const w3 = doc.getTextWidth(l3)
          const maxW = Math.max(w1, w2, w3)
          if (maxW > maxWidth) {
            sz = target3LineSize * (maxWidth / maxW)
          }

          const diff = Math.max(w1, w2, w3) - Math.min(w1, w2, w3)
          const score = sz * 100 - diff
          if (score > best3Score) {
            best3Score = score
            bestI = i
            bestJ = j
            best3Fs = sz
          }
        }
      }

      if (best3Fs > bestFs * 1.1) {
        lines = [
          words.slice(0, bestI).join(" "),
          words.slice(bestI, bestJ).join(" "),
          words.slice(bestJ).join(" "),
        ]
      } else {
        lines = [twoLine1, twoLine2]
      }
    }
  } else {
    lines = [trimmed]
  }

  if (lines.length === 1) {
    const single = fitSingleLine(lines[0] ?? "", startSize, minSize)
    doc.setFontSize(single.size)
    doc.text(single.text, x, y, { align: "center" })
    return
  }

  const numLines = Math.min(lines.length, 3)
  const activeLines = lines.slice(0, numLines)

  const targetStackedSize = numLines === 2 ? Math.min(startSize, 5.4) : Math.min(startSize, 3.8)
  let stackedFontSize = targetStackedSize
  doc.setFontSize(stackedFontSize)

  for (const line of activeLines) {
    const w = doc.getTextWidth(line)
    if (w > maxWidth) {
      const fitted = targetStackedSize * (maxWidth / w)
      if (fitted < stackedFontSize) {
        stackedFontSize = fitted
      }
    }
  }

  const effectiveMin = numLines === 2 ? Math.max(minSize, 3.2) : Math.max(minSize, 2.8)
  stackedFontSize = Math.max(effectiveMin, stackedFontSize)
  doc.setFontSize(stackedFontSize)

  const capHeight = stackedFontSize * 0.247 * scaleY
  const cellCenterY = rowY + rowH / 2

  let lineSpacing: number
  let firstBaseline: number

  if (numLines === 2) {
    lineSpacing = Math.min(rowH * 0.42, 2.1 * scaleY)
    firstBaseline = cellCenterY - lineSpacing / 2 + capHeight / 2
  } else {
    lineSpacing = Math.min(rowH * 0.29, 1.45 * scaleY)
    firstBaseline = cellCenterY - lineSpacing + capHeight / 2
  }

  for (let idx = 0; idx < numLines; idx++) {
    let lineToDraw = activeLines[idx] ?? ""
    if (!lineToDraw) continue
    if (doc.getTextWidth(lineToDraw) > maxWidth) {
      while (lineToDraw.length > 3 && doc.getTextWidth(`${lineToDraw}...`) > maxWidth) {
        lineToDraw = lineToDraw.substring(0, lineToDraw.length - 1)
      }
      if (doc.getTextWidth(lineToDraw) > maxWidth) {
        lineToDraw = `${lineToDraw.substring(0, Math.max(1, lineToDraw.length - 2))}...`
      }
    }
    const baseline = firstBaseline + idx * lineSpacing
    doc.text(lineToDraw, x, baseline, { align: "center" })
  }
}

function drawRegion7CellTime(
  doc: PdfDoc,
  time: string | undefined,
  x: number,
  y: number,
  scaleY: number
) {
  doc.text(formatRegion7LogTime(time), x, y + 3.6 * scaleY, { align: "center" })
}

export interface DtrTimeSlotLayout {
  drawLineL2: boolean
  drawLineL3: boolean
  drawLineL4: boolean
  mergedIndices: Set<number> // 0: amIn, 1: amOut, 2: pmIn, 3: pmOut
  mergedNote?: {
    text: string
    startX: number
    endX: number
    centerX: number
    maxWidth: number
  }
}

export function computeTimeSlotsLayout(
  log: DtrDayLog,
  l1: number,
  l2: number,
  l3: number,
  l4: number,
  l5: number,
  scaleX: number,
  uppercase = false
): DtrTimeSlotLayout {
  // If CTO AM: AM columns (amIn and amOut) are merged into "CTO", PM columns have normal times
  if (log.status === "leave-cto-am") {
    return {
      drawLineL2: false,
      drawLineL3: true,
      drawLineL4: true,
      mergedIndices: new Set([0, 1]),
      mergedNote: {
        text: "CTO",
        startX: l1,
        endX: l3,
        centerX: (l1 + l3) / 2,
        maxWidth: l3 - l1 - 2 * scaleX,
      },
    }
  }

  // If CTO PM: PM columns (pmIn and pmOut) are merged into "CTO", AM columns have normal times
  if (log.status === "leave-cto-pm") {
    return {
      drawLineL2: true,
      drawLineL3: true,
      drawLineL4: false,
      mergedIndices: new Set([2, 3]),
      mergedNote: {
        text: "CTO",
        startX: l3,
        endX: l5,
        centerX: (l3 + l5) / 2,
        maxWidth: l5 - l3 - 2 * scaleX,
      },
    }
  }

  // If Absent AM: AM columns (amIn and amOut) are merged into "ABSENT", PM columns have normal times
  if (log.status === "absent-am") {
    return {
      drawLineL2: false,
      drawLineL3: true,
      drawLineL4: true,
      mergedIndices: new Set([0, 1]),
      mergedNote: {
        text: uppercase ? "ABSENT" : "Absent",
        startX: l1,
        endX: l3,
        centerX: (l1 + l3) / 2,
        maxWidth: l3 - l1 - 2 * scaleX,
      },
    }
  }

  // If Absent PM: PM columns (pmIn and pmOut) are merged into "ABSENT", AM columns have normal times
  if (log.status === "absent-pm") {
    return {
      drawLineL2: true,
      drawLineL3: true,
      drawLineL4: false,
      mergedIndices: new Set([2, 3]),
      mergedNote: {
        text: uppercase ? "ABSENT" : "Absent",
        startX: l3,
        endX: l5,
        centerX: (l3 + l5) / 2,
        maxWidth: l5 - l3 - 2 * scaleX,
      },
    }
  }

  // If Special Case with a note:
  if (log.status === "special" && log.specialNote && log.specialNote.trim()) {
    const rawText = log.specialNote.trim()
    const text = uppercase ? rawText.toUpperCase() : rawText

    const has0 = Boolean(log.amIn && log.amIn.trim() && log.amIn !== "-")
    const has1 = Boolean(log.amOut && log.amOut.trim() && log.amOut !== "-")
    const has2 = Boolean(log.pmIn && log.pmIn.trim() && log.pmIn !== "-")
    const has3 = Boolean(log.pmOut && log.pmOut.trim() && log.pmOut !== "-")

    // Case 1: Middle gap (amIn and pmOut present, amOut and pmIn empty)
    // OR if all 4 are present with a specialNote (user didn't clear 12:00 and 1:00 lunch)
    if ((has0 && has3 && !has1 && !has2) || (has0 && has1 && has2 && has3)) {
      return {
        drawLineL2: true,
        drawLineL3: false,
        drawLineL4: true,
        mergedIndices: new Set([1, 2]),
        mergedNote: {
          text,
          startX: l2,
          endX: l4,
          centerX: (l2 + l4) / 2,
          maxWidth: l4 - l2 - 2 * scaleX,
        },
      }
    }

    // Case 2: Afternoon gap (amIn and amOut present, pmIn and pmOut empty)
    if (has0 && has1 && !has2 && !has3) {
      return {
        drawLineL2: true,
        drawLineL3: true,
        drawLineL4: false,
        mergedIndices: new Set([2, 3]),
        mergedNote: {
          text,
          startX: l3,
          endX: l5,
          centerX: (l3 + l5) / 2,
          maxWidth: l5 - l3 - 2 * scaleX,
        },
      }
    }

    // Case 3: Morning gap (amIn and amOut empty, pmIn and pmOut present)
    if (!has0 && !has1 && has2 && has3) {
      return {
        drawLineL2: false,
        drawLineL3: true,
        drawLineL4: true,
        mergedIndices: new Set([0, 1]),
        mergedNote: {
          text,
          startX: l1,
          endX: l3,
          centerX: (l1 + l3) / 2,
          maxWidth: l3 - l1 - 2 * scaleX,
        },
      }
    }

    // Case 4: Only amIn is present (rest of day is OB/special)
    if (has0 && !has1 && !has2 && !has3) {
      return {
        drawLineL2: true,
        drawLineL3: false,
        drawLineL4: false,
        mergedIndices: new Set([1, 2, 3]),
        mergedNote: {
          text,
          startX: l2,
          endX: l5,
          centerX: (l2 + l5) / 2,
          maxWidth: l5 - l2 - 2 * scaleX,
        },
      }
    }

    // Case 5: Only pmOut is present (OB/special until end-of-day return)
    if (!has0 && !has1 && !has2 && has3) {
      return {
        drawLineL2: false,
        drawLineL3: false,
        drawLineL4: true,
        mergedIndices: new Set([0, 1, 2]),
        mergedNote: {
          text,
          startX: l1,
          endX: l4,
          centerX: (l1 + l4) / 2,
          maxWidth: l4 - l1 - 2 * scaleX,
        },
      }
    }

    // Case 6: All empty (entire day is special note)
    if (!has0 && !has1 && !has2 && !has3) {
      return {
        drawLineL2: false,
        drawLineL3: false,
        drawLineL4: false,
        mergedIndices: new Set([0, 1, 2, 3]),
        mergedNote: {
          text,
          startX: l1,
          endX: l5,
          centerX: (l1 + l5) / 2,
          maxWidth: l5 - l1 - 2 * scaleX,
        },
      }
    }

    // Case 7: Only amOut is empty
    if (!has1 && has0 && has2 && has3) {
      return {
        drawLineL2: true,
        drawLineL3: true,
        drawLineL4: true,
        mergedIndices: new Set([1]),
        mergedNote: {
          text,
          startX: l2,
          endX: l3,
          centerX: (l2 + l3) / 2,
          maxWidth: l3 - l2 - 1.5 * scaleX,
        },
      }
    }

    // Case 8: Only pmIn is empty
    if (!has2 && has0 && has1 && has3) {
      return {
        drawLineL2: true,
        drawLineL3: true,
        drawLineL4: true,
        mergedIndices: new Set([2]),
        mergedNote: {
          text,
          startX: l3,
          endX: l4,
          centerX: (l3 + l4) / 2,
          maxWidth: l4 - l3 - 1.5 * scaleX,
        },
      }
    }

    // Fallback: merge across contiguous empty slots
    const hasList = [has0, has1, has2, has3]
    const emptyIndices = [0, 1, 2, 3].filter((i) => !hasList[i])
    if (emptyIndices.length > 0) {
      const minIdx = Math.min(...emptyIndices)
      const maxIdx = Math.max(...emptyIndices) + 1
      const bounds = [l1, l2, l3, l4, l5]
      const startX = bounds[minIdx] ?? l1
      const endX = bounds[maxIdx] ?? l5
      return {
        drawLineL2: minIdx > 1 || maxIdx <= 1,
        drawLineL3: minIdx > 2 || maxIdx <= 2,
        drawLineL4: minIdx > 3 || maxIdx <= 3,
        mergedIndices: new Set(emptyIndices),
        mergedNote: {
          text,
          startX,
          endX,
          centerX: (startX + endX) / 2,
          maxWidth: endX - startX - 2 * scaleX,
        },
      }
    }
  }

  // Regular work day or special case without note
  return {
    drawLineL2: true,
    drawLineL3: true,
    drawLineL4: true,
    mergedIndices: new Set<number>(),
  }
}

/** Region VII (PHILFIDA RO VII) Civil Service Form No. 48 layout â€” split PDF option only. */
function drawDtrCardRegion7(
  doc: PdfDoc,
  startX: number,
  employeeName: string,
  daysList: DtrDayLog[],
  supervisorName: string,
  supervisorTitle: string,
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month",
  dtrNo: string,
  designation: string,
  department: string,
  timeScheduleFrom: string,
  timeScheduleTo: string,
  periodFromLabel: string,
  periodToLabel: string,
  cardW: number,
  scaleX: number,
  scaleY: number,
  pageMargin: number,
  isCrossedOut: boolean
) {
  const margin = startX
  const RM = margin + cardW
  const center = margin + cardW / 2

  let y = pageMargin

  // Header â€” Civil Service Form No. 48
  doc.setFont("helvetica", "italic")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.text("Civil Service Form No. 48", margin, y)

  y += 4 * scaleY
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT", center, y, { align: "center" })
  y += 3.5 * scaleY
  doc.text("AUTHORITY", center, y, { align: "center" })

  y += 3 * scaleY
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin + 8 * scaleX, y, RM - 8 * scaleX, y)
  y += 3.5 * scaleY
  doc.setFontSize(8)
  doc.text("REGIONAL OFFICE VII", center, y, { align: "center" })
  y += 3 * scaleY
  doc.line(margin + 8 * scaleX, y, RM - 8 * scaleX, y)
  y += 3.5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.text("C.O. / R.O.", center, y, { align: "center" })

  y += 5 * scaleY
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("DAILY TIME RECORD", center, y, { align: "center" })

  // Employee info
  y += 6 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("NO.", margin, y)
  if (dtrNo) {
    doc.setFont("helvetica", "bold")
    doc.text(dtrNo, margin + 8 * scaleX, y)
  }
  doc.line(margin + 8 * scaleX, y + 0.6 * scaleY, margin + cardW * 0.35, y + 0.6 * scaleY)

  y += 5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.text("NAME:", margin, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.text(employeeName.toUpperCase(), margin + 12 * scaleX, y - 0.2 * scaleY)
  doc.line(margin + 12 * scaleX, y + 0.6 * scaleY, RM, y + 0.6 * scaleY)

  y += 5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("DESIGNATION:", margin, y)
  doc.text(designation, margin + 24 * scaleX, y - 0.2 * scaleY)
  doc.line(margin + 24 * scaleX, y + 0.6 * scaleY, RM, y + 0.6 * scaleY)

  y += 6 * scaleY
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.text(department.toUpperCase(), center, y - 0.2 * scaleY, { align: "center" })
  doc.line(margin, y + 0.6 * scaleY, RM, y + 0.6 * scaleY)
  y += 3.5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("DEPARTMENT", center, y, { align: "center" })

  y += 5.5 * scaleY
  doc.text("PERIOD", margin, y)
  doc.text("FROM", margin + 15 * scaleX, y)
  doc.setFont("helvetica", "bold")
  doc.text(periodFromLabel, margin + 26 * scaleX, y)
  doc.line(margin + 26 * scaleX, y + 0.6 * scaleY, margin + cardW * 0.55, y + 0.6 * scaleY)
  doc.setFont("helvetica", "normal")
  doc.text("TO", margin + 54 * scaleX, y)
  doc.setFont("helvetica", "bold")
  doc.text(periodToLabel, margin + 61 * scaleX, y)
  doc.line(margin + 61 * scaleX, y + 0.6 * scaleY, RM, y + 0.6 * scaleY)

  y += 5.5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.text("TIME", margin, y)
  y += 3 * scaleY
  doc.text("SCHEDULE", margin, y)
  doc.text("FROM", margin + 18 * scaleX, y)
  doc.setFont("helvetica", "bold")
  doc.text(formatRegion7ScheduleTime(timeScheduleFrom), margin + 29 * scaleX, y)
  doc.line(margin + 29 * scaleX, y + 0.6 * scaleY, margin + cardW * 0.58, y + 0.6 * scaleY)
  doc.setFont("helvetica", "normal")
  doc.text("TO", margin + 55 * scaleX, y)
  doc.setFont("helvetica", "bold")
  doc.text(formatRegion7ScheduleTime(timeScheduleTo), margin + 61 * scaleX, y)
  doc.line(margin + 61 * scaleX, y + 0.6 * scaleY, RM, y + 0.6 * scaleY)

  y += 6 * scaleY

  // Table
  const rowH = 4.6 * scaleY
  const colW = {
    date: cardW * 0.08,
    amIn: cardW * 0.13,
    amOut: cardW * 0.13,
    pmIn: cardW * 0.13,
    pmOut: cardW * 0.13,
    otIn: cardW * 0.11,
    otOut: cardW * 0.11,
    underTime: cardW * 0.18,
  }

  const tableY = y
  const startD = cutoffPeriod === "1st-half" ? 1 : 16
  const endD = cutoffPeriod === "1st-half" ? 15 : 31
  const totalRows = 16

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)
  doc.rect(margin, tableY, cardW, rowH * 2 + totalRows * rowH)

  const l1 = margin + colW.date
  const l2 = l1 + colW.amIn
  const l3 = l2 + colW.amOut
  const l4 = l3 + colW.pmIn
  const l5 = l4 + colW.pmOut
  const l6 = l5 + colW.otIn
  const l7 = l6 + colW.otOut
  const tableBottomY = tableY + rowH * 2 + totalRows * rowH

  doc.setLineWidth(0.12)
  doc.line(l1, tableY, l1, tableBottomY)
  doc.line(l3, tableY, l3, tableY + rowH * 2)
  doc.line(l5, tableY, l5, tableBottomY)
  doc.line(l7, tableY, l7, tableBottomY)
  doc.line(l2, tableY + rowH, l2, tableY + rowH * 2)
  doc.line(l4, tableY + rowH, l4, tableY + rowH * 2)
  doc.line(l6, tableY + rowH, l6, tableY + rowH * 2)
  doc.line(l1, tableY + rowH, l7, tableY + rowH)
  doc.line(margin, tableY + rowH * 2, RM, tableY + rowH * 2)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("DATE", margin + colW.date / 2, tableY + 6 * scaleY, { align: "center" })
  doc.text("MORNING", l1 + (colW.amIn + colW.amOut) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("IN", l1 + colW.amIn / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("OUT", l2 + colW.amOut / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("AFTERNOON", l3 + (colW.pmIn + colW.pmOut) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("IN", l3 + colW.pmIn / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("OUT", l4 + colW.pmOut / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("OVERTIME", l5 + (colW.otIn + colW.otOut) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("IN", l5 + colW.otIn / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("OUT", l6 + colW.otOut / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("UNDER", l7 + colW.underTime / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("TIME", l7 + colW.underTime / 2, tableY + 7 * scaleY, { align: "center" })

  let rowY = tableY + rowH * 2
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    const d = startD + rowIdx
    const log = daysList.find((l) => l.day === d)
    const inMonth = d <= endD && d <= daysList.length

    if (rowIdx < totalRows - 1) {
      doc.line(margin, rowY + rowH, RM, rowY + rowH)
    }

    if (!isCrossedOut && inMonth) {
      doc.setFont("helvetica", "bold")
      doc.text(d.toString(), margin + colW.date / 2, rowY + 3.6 * scaleY, { align: "center" })
      doc.setFont("helvetica", "normal")
    }

    const isSpanned =
      !isCrossedOut &&
      inMonth &&
      log &&
      (log.status === "weekend" ||
        log.status === "holiday" ||
        log.status === "special-holiday" ||
        log.status === "absent" ||
        (log.status.startsWith("leave") && log.status !== "leave-cto-am" && log.status !== "leave-cto-pm") ||
        log.status === "ob")

    const slotLayout =
      !isCrossedOut && inMonth && log
        ? computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, true)
        : null

    if (!isSpanned) {
      if (!slotLayout || slotLayout.drawLineL2) doc.line(l2, rowY, l2, rowY + rowH)
      if (!slotLayout || slotLayout.drawLineL3) doc.line(l3, rowY, l3, rowY + rowH)
      if (!slotLayout || slotLayout.drawLineL4) doc.line(l4, rowY, l4, rowY + rowH)
    }
    // Overtime IN/OUT divider on every data row
    doc.line(l6, rowY, l6, rowY + rowH)

    if (!isCrossedOut && inMonth && log) {
      const spanCenterX = l1 + (l5 - l1) / 2

      if (log.status === "weekend") {
        doc.setFont("helvetica", "bold")
        const dayLabel = log.dayName.toUpperCase().startsWith("SAT")
          ? "SATURDAY"
          : log.dayName.toUpperCase().startsWith("SUN")
            ? "SUNDAY"
            : log.dayName.toUpperCase()
        doc.text(dayLabel, spanCenterX, rowY + 3.6 * scaleY, { align: "center" })
        doc.setFont("helvetica", "normal")
      } else if (log.status === "holiday" || log.status === "special-holiday") {
        const baseTitle = log.status === "special-holiday" ? "SPECIAL HOLIDAY" : "HOLIDAY"
        const reasonText = (log.reason || log.specialNote || "").trim()
        const label = reasonText ? `${baseTitle} (${reasonText.toUpperCase()})` : baseTitle
        drawFittedCenterText(doc,
          label,
          spanCenterX,
          rowY + 3.6 * scaleY,
          l5 - l1 - 3 * scaleX,
          7,
          4,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
      } else if (log.status === "absent") {
        doc.setFont("helvetica", "bold")
        doc.text("ABSENT", spanCenterX, rowY + 3.6 * scaleY, { align: "center" })
        doc.setFont("helvetica", "normal")
      } else if (
        (log.status === "leave" || log.status.startsWith("leave-")) &&
        log.status !== "leave-cto-am" &&
        log.status !== "leave-cto-pm"
      ) {
        doc.setFont("helvetica", "bold")
        const leaveKey = log.status.startsWith("leave-") ? log.status.substring(6) : ""
        const label = leaveKey
          ? (LEAVE_NAMES_MAP[leaveKey] ?? leaveKey).toUpperCase()
          : "LEAVE"
        drawFittedCenterText(doc,
          label,
          spanCenterX,
          rowY + 3.6 * scaleY,
          l5 - l1 - 3 * scaleX,
          6.5,
          3.5,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
      } else if (log.status === "ob") {
        const locationText = log.location ? ` - ${log.location.toUpperCase()}` : ""
        const rawLabel = `OB${locationText}`
        drawFittedCenterText(doc,
          rawLabel,
          spanCenterX,
          rowY + 3.6 * scaleY,
          l5 - l1 - 3 * scaleX,
          6.5,
          3.5,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
      } else {
        if (!slotLayout?.mergedIndices.has(0)) {
          drawRegion7CellTime(doc, log.amIn, l1 + colW.amIn / 2, rowY, scaleY)
        }
        if (!slotLayout?.mergedIndices.has(1)) {
          drawRegion7CellTime(doc, log.amOut, l2 + colW.amOut / 2, rowY, scaleY)
        }
        if (!slotLayout?.mergedIndices.has(2)) {
          drawRegion7CellTime(doc, log.pmIn, l3 + colW.pmIn / 2, rowY, scaleY)
        }
        if (!slotLayout?.mergedIndices.has(3)) {
          drawRegion7CellTime(doc, log.pmOut, l4 + colW.pmOut / 2, rowY, scaleY)
        }
        drawRegion7CellTime(doc, undefined, l5 + colW.otIn / 2, rowY, scaleY)
        drawRegion7CellTime(doc, undefined, l6 + colW.otOut / 2, rowY, scaleY)

        if (slotLayout?.mergedNote) {
          const isBadge =
            slotLayout.mergedNote.text === "CTO" ||
            slotLayout.mergedNote.text === "ABSENT" ||
            slotLayout.mergedNote.text === "Absent"
          drawFittedCenterText(
            doc,
            slotLayout.mergedNote.text,
            slotLayout.mergedNote.centerX,
            rowY + 3.6 * scaleY,
            slotLayout.mergedNote.maxWidth,
            isBadge ? 7 : 5.5,
            3.0,
            "bold",
            { rowY, rowH, scaleY }
          )
          doc.setFont("helvetica", "normal")
          doc.setFontSize(7)
        }

        const totalUtMins = log.lateMinutes + log.undertimeMinutes
        if (totalUtMins > 0) {
          doc.text(totalUtMins.toString(), l7 + colW.underTime / 2, rowY + 3.6 * scaleY, { align: "center" })
        }
      }
    } else if (!isCrossedOut && inMonth && !log) {
      drawRegion7CellTime(doc, undefined, l1 + colW.amIn / 2, rowY, scaleY)
      drawRegion7CellTime(doc, undefined, l2 + colW.amOut / 2, rowY, scaleY)
      drawRegion7CellTime(doc, undefined, l3 + colW.pmIn / 2, rowY, scaleY)
      drawRegion7CellTime(doc, undefined, l4 + colW.pmOut / 2, rowY, scaleY)
      drawRegion7CellTime(doc, undefined, l5 + colW.otIn / 2, rowY, scaleY)
      drawRegion7CellTime(doc, undefined, l6 + colW.otOut / 2, rowY, scaleY)
    }

    rowY += rowH
  }

  if (isCrossedOut) {
    doc.setLineWidth(0.3)
    doc.line(l1, tableY + rowH * 2, l7, tableBottomY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("NOT APPLICABLE", l1 + (l7 - l1) / 2, tableY + rowH * 2 + (totalRows * rowH) / 2 + 1 * scaleY, {
      align: "center",
    })
    doc.setFont("helvetica", "normal")
  }

  // Footer â€” CERTIFIED CORRECT / APPROVED BY
  let yFooter = tableBottomY + 4 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("CERTIFIED CORRECT:", margin, yFooter)
  yFooter += 8 * scaleY
  doc.setLineWidth(0.2)
  doc.line(margin + 2 * scaleX, yFooter, RM - 2 * scaleX, yFooter)
  yFooter += 3 * scaleY
  doc.setFontSize(7)
  doc.text("(SIGNATURE)", center, yFooter, { align: "center" })

  yFooter += 7 * scaleY
  doc.setFontSize(8)
  doc.text("APPROVED BY:", margin, yFooter)
  yFooter += 8 * scaleY
  doc.line(margin + 2 * scaleX, yFooter, RM - 2 * scaleX, yFooter)
  yFooter += 3.5 * scaleY
  if (supervisorName) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(supervisorName.toUpperCase(), center, yFooter, { align: "center" })
    yFooter += 3.5 * scaleY
  }
  if (supervisorTitle) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text(supervisorTitle, center, yFooter, { align: "center" })
  }
}

function drawDtrCard(
  doc: PdfDoc,
  startX: number,
  employeeName: string,
  monthYearLabel: string,
  daysList: DtrDayLog[],
  supervisorName: string,
  supervisorTitle: string,
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month",
  _dtrNo: string,
  _designation: string,
  _department: string,
  timeScheduleFrom: string,
  timeScheduleTo: string,
  _periodFromLabel: string,
  _periodToLabel: string,
  cardW: number,
  scaleX: number,
  scaleY: number
) {
  const margin = startX
  const RM = margin + cardW
  const center = margin + cardW / 2

  const scheduleLabel =
    timeScheduleFrom && timeScheduleTo
      ? `${timeScheduleFrom} - ${timeScheduleTo}`
      : timeScheduleFrom || timeScheduleTo || ""

  let y = 10 * scaleY

  // --- Header (Civil Service Form No. 48) ---
  doc.setFont("helvetica", "italic")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.text("Civil Service Form No. 48", margin, y)

  y += 5 * scaleY
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("DAILY TIME RECORD", center, y, { align: "center" })

  y += 4.5 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.text("-----o0o-----", center, y, { align: "center" })

  y += 5 * scaleY
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, RM, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  if (employeeName) {
    doc.text(employeeName.toUpperCase(), center, y - 0.8 * scaleY, { align: "center" })
  }
  y += 3 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.text("(Name)", center, y, { align: "center" })

  y += 5 * scaleY
  doc.setFontSize(7.5)
  doc.text("For the month of", margin, y)
  doc.setFont("helvetica", "bold")
  doc.text(monthYearLabel, margin + 28 * scaleX, y)
  doc.setFont("helvetica", "normal")
  doc.line(margin + 28 * scaleX, y + 0.5 * scaleY, RM, y + 0.5 * scaleY)

  y += 5 * scaleY
  const hoursColX = margin + cardW * 0.52
  doc.setFontSize(6.5)
  doc.text("Official hours for", margin, y)
  doc.text("Regular days", hoursColX, y)
  if (scheduleLabel) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.text(scheduleLabel, hoursColX + 22 * scaleX, y)
    doc.setFont("helvetica", "normal")
  }
  doc.line(hoursColX + 22 * scaleX, y + 0.5 * scaleY, RM, y + 0.5 * scaleY)

  y += 3.5 * scaleY
  doc.text("arrival and departure", margin, y)
  doc.text("Saturdays", hoursColX, y)
  doc.line(hoursColX + 22 * scaleX, y + 0.5 * scaleY, RM, y + 0.5 * scaleY)

  y += 4.5 * scaleY

  // --- Table (31 days + total row) ---
  const form48DataRows = 31
  const tableRowCount = 2 + form48DataRows + 1
  const rowH = 4.1 * scaleY
  const colW = {
    day: cardW * 0.08,
    amIn: cardW * 0.15,
    amOut: cardW * 0.15,
    pmIn: cardW * 0.15,
    pmOut: cardW * 0.15,
    utHrs: cardW * 0.16,
    utMins: cardW * 0.16,
  }

  const tableY = y
  const l1 = margin + colW.day
  const l2 = l1 + colW.amIn
  const l3 = l2 + colW.amOut
  const l4 = l3 + colW.pmIn
  const l5 = l4 + colW.pmOut
  const l6 = l5 + colW.utHrs
  const tableBottomY = tableY + rowH * tableRowCount

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)
  doc.rect(margin, tableY, cardW, rowH * tableRowCount)

  doc.setLineWidth(0.12)
  doc.line(l1, tableY, l1, tableBottomY)
  doc.line(l5, tableY, l5, tableBottomY)
  doc.line(l6, tableY + rowH, l6, tableBottomY)
  doc.line(l2, tableY + rowH, l2, tableY + rowH * 2)
  doc.line(l3, tableY, l3, tableY + rowH * 2)
  doc.line(l4, tableY + rowH, l4, tableY + rowH * 2)
  doc.line(l1, tableY + rowH, l5, tableY + rowH)
  doc.line(l5, tableY + rowH, RM, tableY + rowH)
  doc.line(margin, tableY + rowH * 2, RM, tableY + rowH * 2)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("Day", margin + colW.day / 2, tableY + 6 * scaleY, { align: "center" })
  doc.text("A.M.", l1 + (colW.amIn + colW.amOut) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("Arrival", l1 + colW.amIn / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("Departure", l2 + colW.amOut / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("P.M.", l3 + (colW.pmIn + colW.pmOut) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("Arrival", l3 + colW.pmIn / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("Departure", l4 + colW.pmOut / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("Undertime", l5 + (colW.utHrs + colW.utMins) / 2, tableY + 3 * scaleY, { align: "center" })
  doc.text("Hours", l5 + colW.utHrs / 2, tableY + 7.5 * scaleY, { align: "center" })
  doc.text("Minutes", l6 + colW.utMins / 2, tableY + 7.5 * scaleY, { align: "center" })

  const dayInCutoff = (day: number) => {
    if (cutoffPeriod === "1st-half") return day <= 15
    if (cutoffPeriod === "2nd-half") return day >= 16
    return true
  }

  let rowY = tableY + rowH * 2
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)

  for (let d = 1; d <= form48DataRows; d++) {
    const log = daysList.find((l) => l.day === d)
    const inRange = d <= daysList.length && dayInCutoff(d)

    if (d < form48DataRows) {
      doc.line(margin, rowY + rowH, RM, rowY + rowH)
    }

    doc.setFont("helvetica", "normal")
    doc.text(d.toString(), margin + colW.day / 2, rowY + 3.2 * scaleY, { align: "center" })

    const isSpanned =
      inRange &&
      log &&
      (log.status === "weekend" ||
        log.status === "holiday" ||
        log.status === "special-holiday" ||
        log.status === "absent" ||
        (log.status.startsWith("leave") && log.status !== "leave-cto-am" && log.status !== "leave-cto-pm") ||
        log.status === "ob")

    const slotLayout =
      inRange && log
        ? computeTimeSlotsLayout(log, l1, l2, l3, l4, l5, scaleX, false)
        : null

    if (!isSpanned) {
      if (!slotLayout || slotLayout.drawLineL2) doc.line(l2, rowY, l2, rowY + rowH)
      if (!slotLayout || slotLayout.drawLineL3) doc.line(l3, rowY, l3, rowY + rowH)
      if (!slotLayout || slotLayout.drawLineL4) doc.line(l4, rowY, l4, rowY + rowH)
    }

    if (inRange && log) {
      const spanCenterX = l1 + (l5 - l1) / 2

      if (log.status === "weekend") {
        doc.setFont("helvetica", "bold")
        doc.text(log.dayName.toUpperCase(), spanCenterX, rowY + 3.2 * scaleY, { align: "center" })
        doc.setFont("helvetica", "normal")
      } else if (log.status === "holiday" || log.status === "special-holiday") {
        const baseTitle = log.status === "special-holiday" ? "Special Holiday" : "Holiday"
        const reasonText = (log.reason || log.specialNote || "").trim()
        const label = reasonText ? `${baseTitle} (${reasonText})` : baseTitle
        drawFittedCenterText(doc,
          label,
          spanCenterX,
          rowY + 3.2 * scaleY,
          l5 - l1 - 2 * scaleX,
          6.5,
          3.5,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
      } else if (log.status === "absent") {
        doc.setFont("helvetica", "bold")
        doc.text("Absent", spanCenterX, rowY + 3.2 * scaleY, { align: "center" })
        doc.setFont("helvetica", "normal")
      } else if (
        (log.status === "leave" || log.status.startsWith("leave-")) &&
        log.status !== "leave-cto-am" &&
        log.status !== "leave-cto-pm"
      ) {
        doc.setFont("helvetica", "bold")
        const leaveKey = log.status.startsWith("leave-") ? log.status.substring(6) : ""
        const label = leaveKey ? (LEAVE_NAMES_MAP[leaveKey] ?? leaveKey) : "Leave"
        drawFittedCenterText(doc,
          label,
          spanCenterX,
          rowY + 3.2 * scaleY,
          l5 - l1 - 2 * scaleX,
          6.5,
          3.5,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
      } else if (log.status === "ob") {
        const locationText = log.location ? ` - ${log.location}` : ""
        const rawLabel = `OB${locationText}`
        drawFittedCenterText(doc,
          rawLabel,
          spanCenterX,
          rowY + 3.2 * scaleY,
          l5 - l1 - 2 * scaleX,
          6.5,
          3.5,
          "bold",
          { rowY, rowH, scaleY }
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
      } else {
        if (!slotLayout?.mergedIndices.has(0) && log.amIn) {
          doc.text(log.amIn, l1 + colW.amIn / 2, rowY + 3.2 * scaleY, { align: "center" })
        }
        if (!slotLayout?.mergedIndices.has(1) && log.amOut) {
          doc.text(log.amOut, l2 + colW.amOut / 2, rowY + 3.2 * scaleY, { align: "center" })
        }
        if (!slotLayout?.mergedIndices.has(2) && log.pmIn) {
          doc.text(log.pmIn, l3 + colW.pmIn / 2, rowY + 3.2 * scaleY, { align: "center" })
        }
        if (!slotLayout?.mergedIndices.has(3) && log.pmOut) {
          doc.text(log.pmOut, l4 + colW.pmOut / 2, rowY + 3.2 * scaleY, { align: "center" })
        }

        if (slotLayout?.mergedNote) {
          const isBadge =
            slotLayout.mergedNote.text === "CTO" ||
            slotLayout.mergedNote.text === "ABSENT" ||
            slotLayout.mergedNote.text === "Absent"
          drawFittedCenterText(
            doc,
            slotLayout.mergedNote.text,
            slotLayout.mergedNote.centerX,
            rowY + 3.2 * scaleY,
            slotLayout.mergedNote.maxWidth,
            isBadge ? 6.5 : 5.5,
            3.0,
            "bold",
            { rowY, rowH, scaleY }
          )
          doc.setFont("helvetica", "normal")
          doc.setFontSize(6.5)
        }

        const totalUtMins = log.lateMinutes + log.undertimeMinutes
        if (totalUtMins > 0) {
          const hrs = Math.floor(totalUtMins / 60)
          const mins = totalUtMins % 60
          if (hrs > 0) doc.text(hrs.toString(), l5 + colW.utHrs / 2, rowY + 3.2 * scaleY, { align: "center" })
          if (mins > 0) doc.text(mins.toString(), l6 + colW.utMins / 2, rowY + 3.2 * scaleY, { align: "center" })
        }
      }
    }

    rowY += rowH
  }

  // Divider between day 31 and the Total row
  doc.setLineWidth(0.12)
  doc.line(margin, rowY, RM, rowY)

  // Total row
  doc.line(l1, rowY, l1, rowY + rowH)
  doc.line(l5, rowY, l5, rowY + rowH)
  doc.line(l6, rowY, l6, rowY + rowH)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("Total", l5 - 1.5 * scaleX, rowY + 3.2 * scaleY, { align: "right" })

  const activeDaysList = daysList.filter((log) => dayInCutoff(log.day))
  const totalLateUt = activeDaysList.reduce((sum, item) => sum + item.lateMinutes + item.undertimeMinutes, 0)
  const totalHrs = Math.floor(totalLateUt / 60)
  const totalMins = totalLateUt % 60
  doc.setFont("helvetica", "normal")
  if (totalHrs > 0) doc.text(totalHrs.toString(), l5 + colW.utHrs / 2, rowY + 3.2 * scaleY, { align: "center" })
  if (totalMins > 0) doc.text(totalMins.toString(), l6 + colW.utMins / 2, rowY + 3.2 * scaleY, { align: "center" })

  rowY += rowH

  // --- Footer ---
  y = rowY + 3 * scaleY
  doc.setFont("helvetica", "italic")
  doc.setFontSize(6.5)
  const certText =
    "I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office."
  const certLines = doc.splitTextToSize(certText, cardW)
  doc.text(certLines, margin, y)

  y += certLines.length * 2.8 * scaleY + 2 * scaleY
  doc.setLineWidth(0.2)
  doc.line(margin, y, RM, y)
  y += 3 * scaleY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.text("VERIFIED as to the prescribed office hours:", margin, y)

  y += 8 * scaleY
  doc.line(margin + 4 * scaleX, y, RM - 4 * scaleX, y)
  y += 3 * scaleY
  if (supervisorName) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(supervisorName, center, y - 0.5 * scaleY, { align: "center" })
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.text(supervisorTitle || "In Charge", center, y + 2.5 * scaleY, { align: "center" })
}

export function exportDtrPdf(
  employeeName: string,
  monthYearLabel: string,
  daysList: DtrDayLog[],
  supervisorName: string,
  supervisorTitle: string,
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month",
  dtrNo: string,
  designation: string,
  department: string,
  timeScheduleFrom: string,
  timeScheduleTo: string,
  monthLabel: string,
  yearNum: number,
  paperSize: "a4" | "letter" | "legal" = "a4",
  layoutOption: "single" | "duplicate" | "split" = "single"
): void {
  let formatArg: string | number[] = "a4"
  if (paperSize === "letter") {
    formatArg = "letter"
  } else if (paperSize === "legal") {
    formatArg = [215.9, 330.2] // Folio Long in mm
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: formatArg
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const daysInMonth = daysList.length

  let leftX: number
  let rightX: number
  let cardW: number
  let scaleX: number
  let scaleY: number
  let region7TopMargin = DTR_MARGIN_Y

  if (layoutOption === "split") {
    const pageMarginX = DTR_MARGIN_X
    const pageMarginY = DTR_MARGIN_Y
    region7TopMargin = pageMarginY
    const availableW = pageW - 2 * pageMarginX - DTR_CARD_GAP
    const slotW = availableW / 2
    cardW = slotW * DTR_PRINT_SAFE_BUFFER
    const cardInset = (slotW - cardW) / 2
    scaleX = cardW / DTR_REF_CARD_W
    const contentH = getDtrContentHeight(layoutOption, cutoffPeriod, daysInMonth)
    const bottomMargin = 9
    scaleY = (pageH - pageMarginY - bottomMargin) / contentH
    leftX = pageMarginX + cardInset
    rightX = pageMarginX + slotW + DTR_CARD_GAP + cardInset
  } else {
    // Civil Service Form No. 48 â€” scale height to selected paper size
    const form48BottomPad = 8
    scaleX = pageW / 210
    scaleY = ((pageH - form48BottomPad) / getForm48ContentHeight()) * DTR_PRINT_SAFE_BUFFER
    const centerX = pageW / 2
    const leftMargin = 6 * scaleX
    cardW = centerX - leftMargin - 4 * scaleX
    leftX = leftMargin
    rightX = centerX + 4 * scaleX
  }

  const formatPeriodDate = (day: number) =>
    layoutOption === "split"
      ? formatRegion7PeriodDate(monthLabel, day, yearNum)
      : `${monthLabel} ${day}, ${yearNum}`

  // LEFT CARD configuration
  const leftCutoff = layoutOption === "split" ? "1st-half" : cutoffPeriod
  let leftPeriodFromLabel = ""
  let leftPeriodToLabel = ""
  if (leftCutoff === "1st-half") {
    leftPeriodFromLabel = formatPeriodDate(1)
    leftPeriodToLabel = formatPeriodDate(15)
  } else if (leftCutoff === "2nd-half") {
    leftPeriodFromLabel = formatPeriodDate(16)
    leftPeriodToLabel = formatPeriodDate(daysInMonth)
  } else {
    leftPeriodFromLabel = formatPeriodDate(1)
    leftPeriodToLabel = formatPeriodDate(daysInMonth)
  }

  const leftCrossedOut = layoutOption === "split" && cutoffPeriod === "2nd-half"

  if (layoutOption === "split") {
    drawDtrCardRegion7(doc,
      leftX,
      employeeName,
      daysList,
      supervisorName,
      supervisorTitle,
      leftCutoff,
      dtrNo,
      designation,
      department,
      timeScheduleFrom,
      timeScheduleTo,
      leftPeriodFromLabel,
      leftPeriodToLabel,
      cardW,
      scaleX,
      scaleY,
      region7TopMargin,
      leftCrossedOut
    )
  } else {
    drawDtrCard(doc,
      leftX,
      employeeName,
      monthYearLabel,
      daysList,
      supervisorName,
      supervisorTitle,
      leftCutoff,
      dtrNo,
      designation,
      department,
      timeScheduleFrom,
      timeScheduleTo,
      leftPeriodFromLabel,
      leftPeriodToLabel,
      cardW,
      scaleX,
      scaleY
    )
  }

  if (layoutOption === "duplicate" || layoutOption === "split") {
    // RIGHT CARD configuration
    const rightCutoff = layoutOption === "split" ? "2nd-half" : cutoffPeriod
    let rightPeriodFromLabel = ""
    let rightPeriodToLabel = ""
    if (rightCutoff === "1st-half") {
      rightPeriodFromLabel = formatPeriodDate(1)
      rightPeriodToLabel = formatPeriodDate(15)
    } else if (rightCutoff === "2nd-half") {
      rightPeriodFromLabel = formatPeriodDate(16)
      rightPeriodToLabel = formatPeriodDate(daysInMonth)
    } else {
      rightPeriodFromLabel = formatPeriodDate(1)
      rightPeriodToLabel = formatPeriodDate(daysInMonth)
    }

    const rightCrossedOut = layoutOption === "split" && cutoffPeriod === "1st-half"

    if (layoutOption === "split") {
      drawDtrCardRegion7(doc,
        rightX,
        employeeName,
        daysList,
        supervisorName,
        supervisorTitle,
        rightCutoff,
        dtrNo,
        designation,
        department,
        timeScheduleFrom,
        timeScheduleTo,
        rightPeriodFromLabel,
        rightPeriodToLabel,
        cardW,
        scaleX,
        scaleY,
        region7TopMargin,
        rightCrossedOut
      )
    } else {
      drawDtrCard(doc,
        rightX,
        employeeName,
        monthYearLabel,
        daysList,
        supervisorName,
        supervisorTitle,
        rightCutoff,
        dtrNo,
        designation,
        department,
        timeScheduleFrom,
        timeScheduleTo,
        rightPeriodFromLabel,
        rightPeriodToLabel,
        cardW,
        scaleX,
        scaleY
      )
    }
  }

  doc.save(`${employeeName.replace(/\s+/g, "_")}_DTR.pdf`)
}

