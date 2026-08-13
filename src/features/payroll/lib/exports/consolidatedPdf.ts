import jsPDF from "jspdf"

import { formatPayPeriod } from "@/shared/lib/format"
import type { PayrollEntry, Signatory } from "@/features/payroll/types/payroll"
import { n, PHILFIDA_GREEN } from "@/lib/exports/pdfShared"
export async function exportConsolidatedPayrollPdf(
  entries: PayrollEntry[],
  signatories: Signatory[],
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = 297
  const margin = 10
  const RM = pageW - margin

  // PhilFIDA Emerald
  const GREEN = PHILFIDA_GREEN

  // Column positions
  const cols = {
    no:       margin + 6,
    nameL:    margin + 9,
    posL:     margin + 52,
    modeL:    margin + 95,
    baseR:    margin + 130,
    premR:    margin + 155,
    grossR:   margin + 180,
    absentR:  margin + 197,
    lateUtR:  margin + 215,
    dedR:     margin + 238,
    taxR:     margin + 258,
    netR:     RM - 2,
  }

  let y = 12
  let tableTop = 0

  function drawPageHeader() {
    // Republic text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100, 100, 100)
    doc.text("Republic of the Philippines", pageW / 2, y, { align: "center" })

    // Agency name in green
    y += 4
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...GREEN)
    doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

    // Green divider line
    y += 3
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(0.5)
    doc.line(margin, y, RM, y)

    // Thin accent line below
    y += 0.7
    doc.setDrawColor(220, 232, 228)
    doc.setLineWidth(0.2)
    doc.line(margin, y, RM, y)

    // Title
    y += 5.5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text("CONSOLIDATED PAYROLL REGISTER", pageW / 2, y, { align: "center" })

    // Period
    if (entries.length > 0) {
      const firstEntry = entries[0]!
      if (firstEntry.inputs) {
        y += 4.5
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8.5)
        doc.setTextColor(80, 80, 80)
        const period = formatPayPeriod(firstEntry.inputs.periodStart, firstEntry.inputs.periodEnd)
        doc.text(`Pay Period: ${period}`, pageW / 2, y, { align: "center" })
      }
    }

    y += 6
    tableTop = y

    // â”€â”€ Table header â”€â”€
    const hdrH = 8
    doc.setFillColor(...GREEN)
    doc.rect(margin, y, RM - margin, hdrH, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)

    const ty = y + 5.5
    doc.text("No.",            cols.no,      ty, { align: "right" })
    doc.text("Employee Name",  cols.nameL,   ty)
    doc.text("Position",       cols.posL,    ty)
    doc.text("Mode",           cols.modeL,   ty)
    doc.text("Base Pay",       cols.baseR,   ty, { align: "right" })
    doc.text("20% Premium",    cols.premR,   ty, { align: "right" })
    doc.text("Gross Pay",      cols.grossR,  ty, { align: "right" })
    doc.text("Absent",         cols.absentR, ty, { align: "right" })
    doc.text("Late/UT",        cols.lateUtR, ty, { align: "right" })
    doc.text("Deductions",     cols.dedR,    ty, { align: "right" })
    doc.text("Tax",            cols.taxR,    ty, { align: "right" })
    doc.text("Net Pay",        cols.netR,    ty, { align: "right" })

    y += hdrH
  }

  drawPageHeader()

  // Accumulators
  let totalBase  = 0
  let totalPrem  = 0
  let totalGross = 0
  let totalDed   = 0
  let totalTax   = 0
  let totalNet   = 0

  // Data rows
  entries.forEach((entry, idx) => {
    if (y > 175) {
      doc.setDrawColor(...GREEN)
      doc.setLineWidth(0.4)
      doc.rect(margin, tableTop, RM - margin, y - tableTop, "S")

      doc.addPage()
      y = 12
      drawPageHeader()
    }

    const { employee, inputs, result } = entry
    const displayGross = result.total + result.premium
    const allDed = result.absentDeduction + result.lateDeduction + result.undertimeDeduction
      + result.overpayment + result.overpaymentPremium
    const lateUtMins = (inputs.lateMinutes ?? 0) + (inputs.undertimeMinutes ?? 0)
    const absentDays = inputs.absentDays ?? 0

    totalBase  += result.total
    totalPrem  += result.premium
    totalGross += displayGross
    totalDed   += allDed
    totalTax   += result.tax
    totalNet   += result.netPay

    const rowH = 7
    const textY = y + 5

    // Zebra stripe
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 249)
      doc.rect(margin, y, RM - margin, rowH, "F")
    }

    // No.
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(160, 160, 160)
    doc.text(String(idx + 1), cols.no, textY, { align: "right" })

    // Name
    doc.setFont("helvetica", "bold")
    doc.setTextColor(20, 20, 20)
    doc.text(employee.name.toUpperCase(), cols.nameL, textY)

    // Position
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60, 60, 60)
    doc.text(employee.position, cols.posL, textY)

    // Mode
    doc.setTextColor(100, 100, 100)
    const modeStr = result.computationType === "daily"
      ? "Daily"
      : result.computationType === "monthly"
        ? "Monthly"
        : result.computationType === "monthly-no-tax"
          ? "Monthly (No Tax)"
          : result.computationType === "semi-monthly-no-tax"
            ? "Semi-Mo (No Tax)"
            : "Semi-Monthly"
    doc.text(modeStr, cols.modeL, textY)

    // Base Pay
    doc.setFont("helvetica", "normal")
    doc.setTextColor(30, 30, 30)
    doc.text(n(result.total), cols.baseR, textY, { align: "right" })

    // 20% Premium
    doc.text(n(result.premium), cols.premR, textY, { align: "right" })

    // Gross Pay
    doc.text(n(displayGross), cols.grossR, textY, { align: "right" })

    // Absent Days
    doc.setTextColor(80, 80, 80)
    doc.text(absentDays > 0 ? String(absentDays) : "-", cols.absentR, textY, { align: "right" })

    // Late/UT mins
    doc.text(lateUtMins > 0 ? `${lateUtMins}` : "-", cols.lateUtR, textY, { align: "right" })

    // Deductions
    doc.setTextColor(30, 30, 30)
    doc.text(allDed > 0 ? `(${n(allDed)})` : "-", cols.dedR, textY, { align: "right" })

    // Tax
    doc.text(result.tax > 0 ? `(${n(result.tax)})` : "-", cols.taxR, textY, { align: "right" })

    // Net Pay â€” green accent
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...GREEN)
    doc.text(n(result.netPay), cols.netR, textY, { align: "right" })

    // Row line
    doc.setDrawColor(225, 230, 228)
    doc.setLineWidth(0.15)
    doc.line(margin, y + rowH, RM, y + rowH)

    y += rowH
  })

  // â”€â”€ Totals row â”€â”€
  const totH = 9

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.line(margin, y, RM, y)

  doc.setFillColor(232, 245, 240)
  doc.rect(margin, y, RM - margin, totH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(20, 20, 20)

  const ty = y + 6.2
  doc.text("TOTAL", cols.nameL, ty)
  doc.text(n(totalBase),  cols.baseR,  ty, { align: "right" })
  doc.text(n(totalPrem),  cols.premR,  ty, { align: "right" })
  doc.text(n(totalGross), cols.grossR, ty, { align: "right" })
  doc.text(totalDed > 0 ? `(${n(totalDed)})` : "-", cols.dedR, ty, { align: "right" })
  doc.text(totalTax > 0 ? `(${n(totalTax)})` : "-", cols.taxR, ty, { align: "right" })

  doc.setTextColor(...GREEN)
  doc.text(n(totalNet), cols.netR, ty, { align: "right" })

  // Double bottom border
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.line(margin, y + totH, RM, y + totH)
  doc.setLineWidth(0.2)
  doc.line(margin, y + totH + 0.7, RM, y + totH + 0.7)

  y += totH + 1

  // Outer table border
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.rect(margin, tableTop, RM - margin, y - tableTop, "S")

  y += 16

  if (y > 185) {
    doc.addPage()
    y = 25
  }

  // â”€â”€ Signatories â”€â”€
  if (signatories && signatories.length > 0) {
    const numSigs = signatories.length
    const usableW = RM - margin

    if (y > 175) {
      doc.addPage()
      y = 25
    }

    const initialY = y
    signatories.forEach((sig, index) => {
      y = initialY
      
      let sigStartX = margin
      let lineW = 75
      if (numSigs === 1) {
        sigStartX = margin + 185
      } else {
        const colW = usableW / numSigs
        sigStartX = margin + index * colW + 5
        lineW = colW - 15
      }
      
      const lineEndX = sigStartX + lineW

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(0, 0, 0)
      doc.text(sig.label || "Certified Correct:", sigStartX, y)

      y += 14
      doc.setDrawColor(80, 80, 80)
      doc.setLineWidth(0.3)
      doc.line(sigStartX, y, lineEndX, y)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text((sig.name || "").toUpperCase() || "(No Signatory Name)", sigStartX, y + 5)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text(sig.title || "", sigStartX, y + 9.5)
    })
  }

  doc.save("Consolidated_Payroll_Register.pdf")
}


