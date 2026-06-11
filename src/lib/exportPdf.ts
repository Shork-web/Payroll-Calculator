import jsPDF from "jspdf"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

type Doc = InstanceType<typeof jsPDF>

function wrapLines(doc: Doc, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function exportPayrollPdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const {
    dailyRate, hourlyRate, perMinRate,
    earned, absentDeduction, lateDeduction,
    total, premium,
    overpayment, overpaymentPremium,
    tax, netPay,
  } = result
  const { monthlyRate, workingDays, lateMinutes, absentDays, lateIncidents } = inputs

  const pageW = 210
  const pageMargin = 18
  const contentW = pageW - pageMargin * 2
  const amountCol = pageW - pageMargin - 4
  const RM = pageW - pageMargin

  let y = 12

  // 1. Header with Republic of the Philippines branding
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text("REPUBLIC OF THE PHILIPPINES", pageW / 2, y, { align: "center" })

  y += 5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 110, 86) // PhilFIDA Emerald
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

  y += 3
  doc.setDrawColor(15, 110, 86) // PhilFIDA Emerald Accent Divider
  doc.setLineWidth(0.4)
  doc.line(pageMargin, y, RM, y)

  y += 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text("COMPUTATION OF SERVICES RENDERED", pageW / 2, y, { align: "center" })

  y += 5.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(71, 85, 105) // Slate-600
  doc.text(`For the Period: ${period}`, pageW / 2, y, { align: "center" })

  y += 5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184) // Slate-400
  doc.text("OFFICIAL PAYROLL COMPUTATION RECORD", pageW / 2, y, { align: "center" })

  y += 8

  // 2. Two-Column Card Layout: Employee Details & Pay Rates
  const cardHeight = 35
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.4)
  doc.roundedRect(pageMargin, y, contentW, cardHeight, 1.5, 1.5, "FD")

  // Vertical divider in the card
  const midX = pageW / 2
  doc.setDrawColor(241, 245, 249) // Slate-100
  doc.line(midX, y + 4, midX, y + cardHeight - 4)

  // Left Column: Employee Details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 110, 86) // Emerald
  doc.text("EMPLOYEE DETAILS", pageMargin + 5, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text("Name:", pageMargin + 5, y + 14)
  
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59) // Slate-800
  const employeeName = employee.name.toUpperCase()
  doc.text(employeeName, pageMargin + 22, y + 14)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Position:", pageMargin + 5, y + 22)
  
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  const employeePosLines = wrapLines(doc, employee.position, midX - pageMargin - 28)
  let posLineY = y + 22
  employeePosLines.forEach((line) => {
    doc.text(line, pageMargin + 22, posLineY)
    posLineY += 4
  })

  // Right Column: Pay Rates
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 110, 86)
  doc.text("PAY RATES & VALUES", midX + 6, y + 6)

  const rateRows: Array<[string, string]> = [
    ["Monthly Rate (MR):", "Php " + n(monthlyRate)],
    ["Working Days (WD):", workingDays + " Days"],
    ["Daily Rate:", "Php " + n(dailyRate)],
    ["Hourly Rate:", "Php " + n(hourlyRate) + "/hr"],
  ]

  let rateY = y + 13
  rateRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label, midX + 6, rateY)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 41, 59)
    doc.text(value, RM - 5, rateY, { align: "right" })
    rateY += 5
  })

  y += cardHeight + 8

  // Helper function for rendering rows in calculation tables
  let rowIndex = 0
  function drawRow(label: string, value: string, isBold = false, isLess = false) {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252) // Slate-50
      doc.rect(pageMargin, y - 4, contentW, 6.5, "F")
    }

    doc.setFont("helvetica", isBold ? "bold" : "normal")
    doc.setFontSize(9)
    
    if (isLess) {
      doc.setTextColor(185, 28, 28) // Red-700 for deductions/losses
    } else if (isBold) {
      doc.setTextColor(30, 41, 59) // Slate-800
    } else {
      doc.setTextColor(71, 85, 105) // Slate-600
    }

    const labelXPos = pageMargin + 4
    doc.text(label, labelXPos, y)
    doc.text(value, amountCol, y, { align: "right" })

    // Bottom border
    doc.setDrawColor(241, 245, 249) // Slate-100
    doc.setLineWidth(0.3)
    doc.line(pageMargin, y + 2.5, RM, y + 2.5)

    y += 6.5
    rowIndex++
  }

  // 3. Compensation Calculation Section
  // Left vertical color accent bar
  doc.setFillColor(15, 110, 86)
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 110, 86)
  doc.text("COMPENSATION CALCULATION", pageMargin + 5, y)
  
  y += 6.5

  rowIndex = 0
  drawRow(`Base Pay (${n(monthlyRate)} ÷ 2)`, n(earned))

  if (absentDays > 0) {
    drawRow(`Less: Absences (${absentDays} day${absentDays !== 1 ? "s" : ""})`, `(${n(absentDeduction)})`, false, true)
  }

  if (lateMinutes > 0) {
    drawRow(`Less: Lates/Undertime (${lateMinutes} mins)`, `(${n(lateDeduction)})`, false, true)
    
    if (lateIncidents && lateIncidents.length > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139) // Slate-500
      
      lateIncidents.forEach((incident) => {
        if (incident.date?.trim() && Number(incident.minutes) > 0) {
          const incidentDeduction = Number(incident.minutes) * perMinRate
          doc.text(`  • ${incident.date}: ${incident.minutes} mins (Php ${n(incidentDeduction)})`, pageMargin + 8, y - 1)
          y += 4.5
        }
      })
      y += 1.5
    }
  }

  drawRow("Subtotal", n(total), true)
  drawRow("Add: 20% Premium", n(premium))
  
  const displayGross = total + premium
  drawRow("Gross Pay", n(displayGross), true)

  y += 4

  // 4. Deductions Section
  doc.setFillColor(15, 110, 86)
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 110, 86)
  doc.text("DEDUCTIONS", pageMargin + 5, y)
  
  y += 6.5

  rowIndex = 0
  let hasDeductions = false
  if (tax > 0) {
    drawRow("Withholding Tax (5%)", `(${n(tax)})`, false, true)
    hasDeductions = true
  }
  if (overpayment > 0) {
    drawRow("Overpayment Deduction", `(${n(overpayment + overpaymentPremium)})`, false, true)
    hasDeductions = true
  }

  if (!hasDeductions) {
    drawRow("No deductions", "0.00")
  }

  y += 4

  // 5. Net Pay Due Highlight Card
  const netCardH = 12
  doc.setFillColor(240, 253, 250) // Emerald-50
  doc.rect(pageMargin, y, contentW, netCardH, "F")

  doc.setDrawColor(204, 251, 241) // Emerald-100
  doc.setLineWidth(0.4)
  // Draw card boundary lines
  doc.line(pageMargin, y, RM, y)
  doc.line(pageMargin, y + netCardH, RM, y + netCardH)
  doc.line(RM, y, RM, y + netCardH)

  // Solid left-border stripe
  doc.setFillColor(15, 110, 86) // PhilFIDA Emerald
  doc.rect(pageMargin, y, 3, netCardH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 110, 86)
  doc.text("NET PAY DUE", pageMargin + 6, y + 7.5)
  doc.text("Php " + n(netPay), amountCol, y + 7.5, { align: "right" })

  y += netCardH + 10

  // 6. Signatory Section
  const sigName = (employee.signatoryName || "JAMES FRANCIENNE J. ROSIT").toUpperCase()
  const sigTitle = employee.signatoryTitle || "OIC ADMIN"

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text("Certified Correct:", pageMargin + 4, y)

  y += 14
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text(sigName, pageMargin + 4, y)

  y += 4
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text(sigTitle, pageMargin + 4, y)

  y += 12

  // 7. Footer Note
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.4)
  doc.line(pageMargin, y, RM, y)

  y += 6
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184) // Slate-400
  if (absentDays > 0 || lateMinutes > 0) {
    const baseLost = absentDeduction + lateDeduction
    const premiumLost = baseLost * 0.20
    doc.text(`Note: Premium not credited due to absences/lates: Php ${n(premiumLost)}`, pageMargin, y)
  } else {
    doc.text("This is an official payroll computation record.", pageMargin, y)
  }

  // Save the PDF
  const safeName = employee.name
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
    .trim()
  const dateStart = inputs.periodStart.split("T")[0]
  const dateEnd = inputs.periodEnd.split("T")[0]
  doc.save(`Payslip_${safeName}_${dateStart}_${dateEnd}.pdf`)
}
