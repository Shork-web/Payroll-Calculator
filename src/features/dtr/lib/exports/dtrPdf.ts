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

function getDtrContentHeight(
  layoutOption: "single" | "duplicate" | "split",
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month",
  daysInMonth: number
): number {
  const isRegion7 = layoutOption === "split"
  const headerBlock = isRegion7 ? 69.5 : 56

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
  // Extra padding so footer/signatures are not clipped when printing
  const footerBlock = isRegion7 ? 50 : 58

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

/** Shrink font until text fits; ellipsis only if still too wide at minimum size. */
function drawFittedCenterText(
  doc: PdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize = 3.5,
  fontStyle: "normal" | "bold" | "italic" = "bold"
): void {
  doc.setFont("helvetica", fontStyle)
  let fontSize = startSize
  let displayText = text
  doc.setFontSize(fontSize)

  while (fontSize > minSize && doc.getTextWidth(displayText) > maxWidth) {
    fontSize -= 0.4
    doc.setFontSize(fontSize)
  }

  if (doc.getTextWidth(displayText) > maxWidth) {
    while (displayText.length > 4 && doc.getTextWidth(`${displayText}...`) > maxWidth) {
      displayText = displayText.substring(0, displayText.length - 1)
    }
    if (doc.getTextWidth(displayText) > maxWidth) {
      displayText = `${displayText.substring(0, Math.max(1, displayText.length - 3))}...`
    }
  }

  doc.text(displayText, x, y, { align: "center" })
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

    if (!isSpanned) {
      doc.line(l2, rowY, l2, rowY + rowH)
      doc.line(l3, rowY, l3, rowY + rowH)
      doc.line(l4, rowY, l4, rowY + rowH)
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
          4
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
          3.5
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
          3.5
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
      } else if (log.status === "leave-cto-am" || log.status === "leave-cto-pm") {
        if (log.status === "leave-cto-am") {
          doc.setFont("helvetica", "bold")
          doc.text("CTO", l1 + colW.amIn / 2, rowY + 3.6 * scaleY, { align: "center" })
          doc.text("CTO", l2 + colW.amOut / 2, rowY + 3.6 * scaleY, { align: "center" })
          doc.setFont("helvetica", "normal")
          drawRegion7CellTime(doc, log.pmIn, l3 + colW.pmIn / 2, rowY, scaleY)
          drawRegion7CellTime(doc, log.pmOut, l4 + colW.pmOut / 2, rowY, scaleY)
        } else {
          drawRegion7CellTime(doc, log.amIn, l1 + colW.amIn / 2, rowY, scaleY)
          drawRegion7CellTime(doc, log.amOut, l2 + colW.amOut / 2, rowY, scaleY)
          doc.setFont("helvetica", "bold")
          doc.text("CTO", l3 + colW.pmIn / 2, rowY + 3.6 * scaleY, { align: "center" })
          doc.text("CTO", l4 + colW.pmOut / 2, rowY + 3.6 * scaleY, { align: "center" })
          doc.setFont("helvetica", "normal")
        }
        drawRegion7CellTime(doc, undefined, l5 + colW.otIn / 2, rowY, scaleY)
        drawRegion7CellTime(doc, undefined, l6 + colW.otOut / 2, rowY, scaleY)
      } else {
        drawRegion7CellTime(doc, log.amIn, l1 + colW.amIn / 2, rowY, scaleY)
        drawRegion7CellTime(doc, log.amOut, l2 + colW.amOut / 2, rowY, scaleY)
        drawRegion7CellTime(doc, log.pmIn, l3 + colW.pmIn / 2, rowY, scaleY)
        drawRegion7CellTime(doc, log.pmOut, l4 + colW.pmOut / 2, rowY, scaleY)
        drawRegion7CellTime(doc, undefined, l5 + colW.otIn / 2, rowY, scaleY)
        drawRegion7CellTime(doc, undefined, l6 + colW.otOut / 2, rowY, scaleY)

        if (log.status === "special" && log.specialNote) {
          drawFittedCenterText(doc,
            log.specialNote.toUpperCase(),
            spanCenterX,
            rowY + 3.6 * scaleY,
            l5 - l1 - 3 * scaleX,
            5.5,
            3.5
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

    if (!isSpanned) {
      doc.line(l2, rowY, l2, rowY + rowH)
      doc.line(l3, rowY, l3, rowY + rowH)
      doc.line(l4, rowY, l4, rowY + rowH)
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
          3.5
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
          3.5
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
      } else if (log.status === "leave-cto-am" || log.status === "leave-cto-pm") {
        doc.setFont("helvetica", "bold")
        if (log.status === "leave-cto-am") {
          doc.text("CTO", l1 + colW.amIn / 2, rowY + 3.2 * scaleY, { align: "center" })
          doc.text("CTO", l2 + colW.amOut / 2, rowY + 3.2 * scaleY, { align: "center" })
          if (log.pmIn) doc.text(log.pmIn, l3 + colW.pmIn / 2, rowY + 3.2 * scaleY, { align: "center" })
          if (log.pmOut) doc.text(log.pmOut, l4 + colW.pmOut / 2, rowY + 3.2 * scaleY, { align: "center" })
        } else {
          if (log.amIn) doc.text(log.amIn, l1 + colW.amIn / 2, rowY + 3.2 * scaleY, { align: "center" })
          if (log.amOut) doc.text(log.amOut, l2 + colW.amOut / 2, rowY + 3.2 * scaleY, { align: "center" })
          doc.text("CTO", l3 + colW.pmIn / 2, rowY + 3.2 * scaleY, { align: "center" })
          doc.text("CTO", l4 + colW.pmOut / 2, rowY + 3.2 * scaleY, { align: "center" })
        }
        doc.setFont("helvetica", "normal")
      } else if (log.status === "ob") {
        const locationText = log.location ? ` - ${log.location}` : ""
        const rawLabel = `OB${locationText}`
        drawFittedCenterText(doc,
          rawLabel,
          spanCenterX,
          rowY + 3.2 * scaleY,
          l5 - l1 - 2 * scaleX,
          6.5,
          3.5
        )
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
      } else {
        if (log.amIn) doc.text(log.amIn, l1 + colW.amIn / 2, rowY + 3.2 * scaleY, { align: "center" })
        if (log.amOut) doc.text(log.amOut, l2 + colW.amOut / 2, rowY + 3.2 * scaleY, { align: "center" })
        if (log.pmIn) doc.text(log.pmIn, l3 + colW.pmIn / 2, rowY + 3.2 * scaleY, { align: "center" })
        if (log.pmOut) doc.text(log.pmOut, l4 + colW.pmOut / 2, rowY + 3.2 * scaleY, { align: "center" })

        if (log.status === "special" && log.specialNote) {
          drawFittedCenterText(doc,
            log.specialNote,
            spanCenterX,
            rowY + 3.2 * scaleY,
            l5 - l1 - 2 * scaleX,
            6,
            3.5
          )
          doc.setFont("helvetica", "normal")
          doc.setFontSize(6.5)
        } else {
          const totalUtMins = log.lateMinutes + log.undertimeMinutes
          if (totalUtMins > 0) {
            const hrs = Math.floor(totalUtMins / 60)
            const mins = totalUtMins % 60
            if (hrs > 0) doc.text(hrs.toString(), l5 + colW.utHrs / 2, rowY + 3.2 * scaleY, { align: "center" })
            if (mins > 0) doc.text(mins.toString(), l6 + colW.utMins / 2, rowY + 3.2 * scaleY, { align: "center" })
          }
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
    scaleY = ((pageH - 2 * pageMarginY) / contentH) * DTR_PRINT_SAFE_BUFFER
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

