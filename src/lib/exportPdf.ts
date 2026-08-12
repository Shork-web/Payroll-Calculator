import jsPDF from "jspdf"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry, Signatory, DtrDayLog } from "@/types/payroll"

type Doc = InstanceType<typeof jsPDF>

function wrapLines(doc: Doc, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function renderPayrollComputationPage(
  doc: Doc,
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): void {
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const {
    dailyRate, hourlyRate, perMinRate,
    earned, absentDeduction, lateDeduction, undertimeDeduction,
    total, premium,
    overpayment, overpaymentPremium,
    tax, netPay,
  } = result
  const { monthlyRate, workingDays, lateMinutes, undertimeMinutes, absentDays, lateIncidents } = inputs

  const pageW = 210
  const pageMargin = 18
  const contentW = pageW - pageMargin * 2
  const amountCol = pageW - pageMargin - 4
  const RM = pageW - pageMargin

  let y = 12

  // 1. Header with Republic of the Philippines branding
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("REPUBLIC OF THE PHILIPPINES", pageW / 2, y, { align: "center" })

  y += 4.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

  y += 3
  // Elegant double lines
  doc.setDrawColor(0, 0, 0) // Black
  doc.setLineWidth(0.5)
  doc.line(pageMargin, y, RM, y)
  
  y += 0.8
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, RM, y)

  y += 7.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("COMPUTATION OF SERVICES RENDERED", pageW / 2, y, { align: "center" })

  y += 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0) // Black
  const modeLabel = result.computationType === "daily"
    ? "Daily"
    : result.computationType === "monthly"
      ? "Monthly"
      : result.computationType === "monthly-no-tax"
        ? "Monthly (No Tax)"
        : result.computationType === "semi-monthly-no-tax"
          ? "Semi-Monthly (No Tax)"
          : "Semi-Monthly"
  doc.text(`For the Period: ${period} (${modeLabel})`, pageW / 2, y, { align: "center" })

  y += 4.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("OFFICIAL PAYROLL COMPUTATION RECORD", pageW / 2, y, { align: "center" })

  y += 7.5

  // 2. Two-Column Card Layout: Employee Details & Pay Rates
  const cardHeight = 38
  doc.setFillColor(250, 250, 250) // very light card fill
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.4)
  doc.roundedRect(pageMargin, y, contentW, cardHeight, 2, 2, "FD")

  // Vertical divider in the card
  const midX = pageW / 2
  doc.setDrawColor(241, 245, 249) // Slate-100
  doc.line(midX, y + 4, midX, y + cardHeight - 4)

  // Left Column: Employee Details (Stacked Layout)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("EMPLOYEE INFORMATION", pageMargin + 6, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("NAME", pageMargin + 6, y + 12.5)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0) // Black
  const employeeName = employee.name.toUpperCase()
  doc.text(employeeName, pageMargin + 6, y + 17)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("POSITION", pageMargin + 6, y + 23.5)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0) // Black
  const employeePosLines = wrapLines(doc, employee.position, midX - pageMargin - 12)
  let posLineY = y + 28
  employeePosLines.forEach((line) => {
    doc.text(line, pageMargin + 6, posLineY)
    posLineY += 4.2
  })

  // Right Column: Pay Rates (Clean grid layout)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("SALARY RATE DETAILS", midX + 6, y + 6)

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
    doc.setTextColor(0, 0, 0) // Black
    doc.text(label, midX + 6, rateY)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0) // Black
    doc.text(value, RM - 6, rateY, { align: "right" })
    rateY += 5.5
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
      doc.setTextColor(0, 0, 0) // Black (was Red-700)
    } else if (isBold) {
      doc.setTextColor(0, 0, 0) // Black (was Slate-800)
    } else {
      doc.setTextColor(0, 0, 0) // Black (was Slate-600)
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
  doc.setFillColor(0, 0, 0) // Black
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("COMPENSATION CALCULATION", pageMargin + 5, y)
  
  y += 6.5

  rowIndex = 0
  if (result.computationType === "daily") {
    drawRow(`Base Pay (${n(dailyRate)} × ${result.periodWorkingDays} days)`, n(earned))
  } else if (result.computationType === "monthly" || result.computationType === "monthly-no-tax") {
    drawRow(`Base Pay (${n(monthlyRate)})`, n(earned))
  } else {
    drawRow(`Base Pay (${n(monthlyRate)} ÷ 2)`, n(earned))
  }

  if (absentDays > 0) {
    drawRow(`Less: Absences (${absentDays} day${absentDays !== 1 ? "s" : ""})`, `(${n(absentDeduction)})`, false, true)

    const absentIncidentsOnly = lateIncidents?.filter(i => i.type === "absent") || []
    if (absentIncidentsOnly.length > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0) // Black
      
      absentIncidentsOnly.forEach((incident) => {
        if (incident.date?.trim() && Number(incident.days) > 0) {
          const incidentDeduction = Number(incident.days) * dailyRate
          doc.text(`• ${incident.date}`, pageMargin + 8, y - 1)
          doc.text(`${incident.days} day${Number(incident.days) > 1 ? "s" : ""}`, pageMargin + 55, y - 1)
          doc.text(n(incidentDeduction), amountCol - 4, y - 1, { align: "right" })
          y += 4.5
        }
      })
      y += 1.5
    }
  }

  if (lateMinutes > 0) {
    drawRow(`Less: Lates (${lateMinutes} mins)`, `(${n(lateDeduction)})`, false, true)
    
    const lateIncidentsOnly = lateIncidents?.filter(i => i.type === "late" || !i.type) || []
    if (lateIncidentsOnly.length > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0) // Black
      
      lateIncidentsOnly.forEach((incident) => {
        if (incident.date?.trim() && Number(incident.minutes) > 0) {
          const incidentDeduction = Number(incident.minutes) * perMinRate
          doc.text(`• ${incident.date}`, pageMargin + 8, y - 1)
          doc.text(`${incident.minutes} mins`, pageMargin + 55, y - 1)
          doc.text(n(incidentDeduction), amountCol - 4, y - 1, { align: "right" })
          y += 4.5
        }
      })
      y += 1.5
    }
  }

  if ((undertimeMinutes ?? 0) > 0) {
    drawRow(`Less: Undertime (${undertimeMinutes} mins)`, `(${n(undertimeDeduction)})`, false, true)
    
    const undertimeIncidentsOnly = lateIncidents?.filter(i => i.type === "undertime") || []
    if (undertimeIncidentsOnly.length > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0) // Black
      
      undertimeIncidentsOnly.forEach((incident) => {
        if (incident.date?.trim() && Number(incident.minutes) > 0) {
          const incidentDeduction = Number(incident.minutes) * perMinRate
          doc.text(`• ${incident.date}`, pageMargin + 8, y - 1)
          doc.text(`${incident.minutes} mins`, pageMargin + 55, y - 1)
          doc.text(n(incidentDeduction), amountCol - 4, y - 1, { align: "right" })
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
  doc.setFillColor(0, 0, 0) // Black
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("DEDUCTIONS", pageMargin + 5, y)
  
  y += 6.5

  rowIndex = 0
  let hasDeductions = false
  const addTax = inputs.additionalTax ?? 0
  const baseTax = Math.max(0, tax - addTax)

  if (baseTax > 0) {
    drawRow("Withholding Tax (5%)", `(${n(baseTax)})`, false, true)
    hasDeductions = true
  }
  if (addTax > 0) {
    let addTaxLabel = "Additional Tax"
    const details = []
    if (inputs.additionalTaxDate) details.push(inputs.additionalTaxDate)
    if (inputs.additionalTaxReason) details.push(inputs.additionalTaxReason)
    if (details.length > 0) {
      addTaxLabel += ` (${details.join(" - ")})`
    }
    drawRow(addTaxLabel, `(${n(addTax)})`, false, true)
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
  const netCardH = 14
  doc.setFillColor(245, 245, 245) // Neutral light gray fill (no color)
  doc.setDrawColor(0, 0, 0) // Black border
  doc.setLineWidth(0.4)
  doc.roundedRect(pageMargin, y, contentW, netCardH, 1.5, 1.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(0, 0, 0) // Black text
  doc.text("NET PAY DUE", pageMargin + 6, y + 9)
  doc.setFontSize(12.5)
  doc.text("Php " + n(netPay), amountCol, y + 9, { align: "right" })

  y += netCardH + 12

  // 6. Double Signature Blocks (Conforme & Certified Correct)
  const sigName = (employee.signatoryName || "").toUpperCase()
  const sigTitle = employee.signatoryTitle || ""
  const employeeNameStr = employee.name.toUpperCase()

  // Section Headers
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0) // Black
  doc.text("Conforme:", pageMargin + 4, y)
  doc.text("Certified Correct:", midX + 6, y)

  y += 14 // Space for signature

  // Left Column: Employee Signatory
  doc.setDrawColor(203, 213, 225) // Slate-300
  doc.setLineWidth(0.3)
  doc.line(pageMargin + 4, y, pageMargin + 70, y) // Signature Line
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0) // Black
  doc.text(employeeNameStr, pageMargin + 4, y + 4.5)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0) // Black
  doc.text(employee.position || "Employee Signature", pageMargin + 4, y + 8)

  // Right Column: Certified Signatory
  doc.line(midX + 6, y, RM - 4, y) // Signature Line
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0) // Black
  doc.text(sigName, midX + 6, y + 4.5)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0) // Black
  doc.text(sigTitle, midX + 6, y + 8)

  y += 20

  // 7. Footer Note
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.4)
  doc.line(pageMargin, y, RM, y)

  y += 6
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0) // Black
  if (absentDays > 0 || lateMinutes > 0 || (undertimeMinutes ?? 0) > 0) {
    const baseLost = absentDeduction + lateDeduction + undertimeDeduction
    const premiumLost = baseLost * 0.20
    doc.text(`Note: Premium not credited due to absences/lates/undertime: Php ${n(premiumLost)}`, pageMargin, y)
  } else {
    doc.text("This is an official payroll computation record.", pageMargin, y)
  }
}

export async function exportPayrollPdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  renderPayrollComputationPage(doc, employee, result, inputs)

  const rawName = employee.name || ""
  let lastName = "EMPLOYEE"
  if (rawName.includes(",")) {
    lastName = (rawName.split(",")[0] || "").trim()
  } else {
    const parts = rawName.trim().split(/\s+/)
    if (parts.length > 0) {
      lastName = parts[parts.length - 1] || "EMPLOYEE"
    }
  }
  const cleanLastName = lastName
    .replace(/[^a-z0-9_-]/gi, "")
    .toUpperCase()

  const year = inputs.periodStart ? inputs.periodStart.substring(0, 4) : new Date().getFullYear().toString()
  
  let month = ""
  if (inputs.periodStart) {
    const parts = inputs.periodStart.split("-")
    if (parts.length > 1) {
      const mIdx = parseInt(parts[1] || "", 10) - 1
      const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
      if (mIdx >= 0 && mIdx < 12) {
        month = months[mIdx] || ""
      }
    }
  }
  if (!month) {
    month = new Date().toLocaleString("en-US", { month: "long" }).toUpperCase()
  }

  const endDayParts = inputs.periodEnd ? inputs.periodEnd.split("-") : []
  const endDay = endDayParts.length > 2 ? parseInt(endDayParts[2] || "", 10) : 15
  const cutoff = endDay <= 15 ? "1ST_CUTOFF" : "2ND_CUTOFF"

  doc.save(`${cleanLastName}_COMPUTATION_${month}_${cutoff}_${year}.pdf`)
}

export async function exportBulkComputationsPdf(entries: PayrollEntry[]): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  entries.forEach((entry, idx) => {
    if (idx > 0) {
      doc.addPage()
    }
    renderPayrollComputationPage(doc, entry.employee, entry.result, entry.inputs)
  })
  doc.save("Bulk_Computations.pdf")
}

export async function exportPayslipPdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const {
    earned, total, premium,
    overpayment, overpaymentPremium,
    absentDeduction, lateDeduction, undertimeDeduction,
    tax, netPay,
  } = result
  const { monthlyRate, lateMinutes, undertimeMinutes, absentDays } = inputs

  // Draw payslip container box
  const boxW = 180
  const boxH = 126.5
  const boxX = (210 - boxW) / 2
  const boxY = 25

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.35)
  doc.rect(boxX, boxY, boxW, boxH)

  // Header text
  // 1. Republic of the Philippines
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text("Republic of the Philippines", boxX + boxW / 2, boxY + 8, { align: "center" })

  // 2. Philippine Fiber Industry Development Authority
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(40, 92, 50) // Premium dark green to match logo style
  doc.text("Philippine Fiber Industry Development Authority", boxX + boxW / 2, boxY + 14, { align: "center" })

  // 3. PAYSLIP
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("PAYSLIP", boxX + boxW / 2, boxY + 20, { align: "center" })

  // Employee details
  // Name:
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Name: ", boxX + 8, boxY + 29)
  const nameWidth = doc.getTextWidth("Name: ")
  doc.setFont("helvetica", "bold")
  doc.text(employee.name, boxX + 8 + nameWidth, boxY + 29)

  // Position:
  doc.setFont("helvetica", "normal")
  doc.text(`Position: ${employee.position}`, boxX + 8, boxY + 35)

  // Period:
  const modeLabel2 = result.computationType === "daily"
    ? "Daily"
    : result.computationType === "monthly"
      ? "Monthly"
      : result.computationType === "monthly-no-tax"
        ? "Monthly (No Tax)"
        : result.computationType === "semi-monthly-no-tax"
          ? "Semi-Monthly (No Tax)"
          : "Semi-Monthly"
  doc.text(`Period: ${period} (${modeLabel2})`, boxX + 8, boxY + 41)

  // Table Top Y
  const tableY = boxY + 45

  // Draw horizontal rows lines:
  // Row Heights:
  // Header 0: 6mm
  // Sub-header 1: 6mm
  // Data Rows 2 to 8: 6.5mm each
  const rowHeights = [6, 6, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5]
  
  // Outer/Inner Horizontal grid lines:
  doc.setLineWidth(0.3)
  for (let i = 0; i <= rowHeights.length; i++) {
    const yLine = tableY + rowHeights.slice(0, i).reduce((sum, h) => sum + h, 0)
    // Draw horizontal line from boxX to boxX + boxW
    doc.line(boxX, yLine, boxX + boxW, yLine)
  }

  // Draw vertical lines:
  // 1. Middle divider: splits left and right halves. Runs from tableY to tableY + tableH
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0)
  doc.line(boxX + 90, tableY, boxX + 90, tableY + tableH)

  // 2. Left divider: separates Earnings label and amount. Runs from tableY + 6 to tableY + tableH
  doc.line(boxX + 62, tableY + 6, boxX + 62, tableY + tableH)

  // 3. Right divider: separates Deductions label and amount. Runs from tableY + 6 to tableY + tableH
  doc.line(boxX + 152, tableY + 6, boxX + 152, tableY + tableH)

  // Draw Table Texts:
  // 1. Header Row (tableY + 4.5): "Earnings:" (left) and "Deductions:" (right)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Earnings:", boxX + 2, tableY + 4.5)
  doc.text("Deductions:", boxX + 92, tableY + 4.5)

  // 2. Sub-header Row (tableY + 6 + 4.5 = tableY + 10.5): "Amount" in columns 2 and 4
  doc.setFont("helvetica", "normal")
  doc.text("Amount", boxX + 88, tableY + 10.5, { align: "right" })
  doc.text("Amount", boxX + 178, tableY + 10.5, { align: "right" })

  // Let's populate the data rows!
  // Columns X coordinates:
  // Col 1 label: boxX + 2
  // Col 2 amount: boxX + 88 (right-aligned)
  // Col 3 label: boxX + 92
  // Col 4 amount: boxX + 178 (right-aligned)
  
  // Row heights mapping:
  // Row 2: tableY + 12
  // Row 3: tableY + 18.5
  // Row 4: tableY + 25
  // Row 5: tableY + 31.5
  // Row 6: tableY + 38
  // Row 7: tableY + 44.5
  // Row 8: tableY + 51
  
  // Let's calculate absent/late/undertime description:
  const totalMins = lateMinutes + (undertimeMinutes ?? 0)
  let aluDesc = ""
  if (absentDays > 0 && totalMins > 0) {
    aluDesc = `${absentDays} day${absentDays !== 1 ? "s" : ""}, ${totalMins} min${totalMins !== 1 ? "s" : ""}`
  } else if (absentDays > 0) {
    aluDesc = `${absentDays} day${absentDays !== 1 ? "s" : ""}`
  } else if (totalMins > 0) {
    aluDesc = `${totalMins} min${totalMins !== 1 ? "s" : ""}`
  } else {
    aluDesc = ""
  }

  const aluCost = absentDeduction + lateDeduction + undertimeDeduction
  const displayGross = total + premium

  // Set font back to normal size 9
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  // Row 2
  let rowY = tableY + 12 + 4.5
  doc.text("Rate/Month", boxX + 2, rowY)
  doc.text(n(monthlyRate), boxX + 88, rowY, { align: "right" })
  doc.text("Absent/Late/Undertime", boxX + 92, rowY)
  if (aluDesc) {
    doc.text(aluDesc, boxX + 178, rowY, { align: "right" })
  }

  // Row 3
  rowY += 6.5
  doc.text("Earned for the Period", boxX + 2, rowY)
  doc.text(n(earned), boxX + 88, rowY, { align: "right" })
  doc.text("Deductions", boxX + 92, rowY)
  if (aluCost > 0) {
    doc.text(n(aluCost), boxX + 178, rowY, { align: "right" })
  }

  // Row 4
  rowY += 6.5
  doc.text("20% Premium", boxX + 2, rowY)
  doc.text(n(premium), boxX + 88, rowY, { align: "right" })
  const addTax = inputs.additionalTax ?? 0
  let taxLabelStr = addTax > 0 ? `Tax (5% + ₱${n(addTax)})` : "5% tax"
  if (addTax > 0) {
    const details = []
    if (inputs.additionalTaxDate) details.push(inputs.additionalTaxDate)
    if (inputs.additionalTaxReason) details.push(inputs.additionalTaxReason)
    if (details.length > 0) {
      taxLabelStr += ` - ${details.join(": ")}`
    }
  }
  doc.text(taxLabelStr, boxX + 92, rowY)
  if (tax > 0) {
    doc.text(n(tax), boxX + 178, rowY, { align: "right" })
  }

  // Row 5
  rowY += 6.5
  doc.text("Gross Pay", boxX + 2, rowY)
  doc.text(n(displayGross), boxX + 88, rowY, { align: "right" })
  doc.text("Overpayment", boxX + 92, rowY)
  if (overpayment > 0) {
    doc.text(n(overpayment), boxX + 178, rowY, { align: "right" })
  }

  // Row 6
  rowY += 6.5
  // Left side is empty
  doc.text("Overpayment (premium)", boxX + 92, rowY)
  if (overpaymentPremium > 0) {
    doc.text(n(overpaymentPremium), boxX + 178, rowY, { align: "right" })
  }

  // Row 7 (rowY + 6.5) -> empty row on both sides
  
  // Row 8 (rowY + 13)
  rowY += 13
  // Left side is empty
  doc.setFont("helvetica", "bold")
  doc.text("Net Pay", boxX + 92, rowY)
  doc.text(n(netPay), boxX + 178, rowY, { align: "right" })

  // Render Signature Block at the bottom of the box
  const signatureY = tableY + tableH + 3
  
  // Render Signatures
  let validSigs = (employee.payslipSignatories ?? []).filter(s => s.name.trim())
  if (validSigs.length === 0 && (employee.payslipSignatoryName || "").trim()) {
    validSigs = [{
      label: "Certified Correct:",
      name: employee.payslipSignatoryName || "",
      title: employee.payslipSignatoryTitle || ""
    }]
  }

  const totalBlocks = 1 + validSigs.length
  const usableW = 168
  const colW = usableW / totalBlocks
  const lineW = Math.min(74, colW - 10)

  // Left: Conforme / Received By
  const conformeX = boxX + 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text("Conforme / Received by:", conformeX, signatureY)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(conformeX, signatureY + 8, conformeX + lineW, signatureY + 8)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text(employee.name.toUpperCase(), conformeX, signatureY + 11.5)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.text("Signature over Printed Name", conformeX, signatureY + 14.5)

  // Right: Other dynamic signatories
  validSigs.forEach((sig, index) => {
    const sigX = boxX + 6 + (index + 1) * colW
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(sig.label || "Certified Correct:", sigX, signatureY)
    doc.line(sigX, signatureY + 8, sigX + lineW, signatureY + 8)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text((sig.name || "").toUpperCase(), sigX, signatureY + 11.5)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text(sig.title || "Authorized Officer", sigX, signatureY + 14.5)
  })

  // Save the PDF
  const rawName = employee.name || ""
  let lastName = "EMPLOYEE"
  if (rawName.includes(",")) {
    lastName = (rawName.split(",")[0] || "").trim()
  } else {
    const parts = rawName.trim().split(/\s+/)
    if (parts.length > 0) {
      lastName = parts[parts.length - 1] || "EMPLOYEE"
    }
  }
  const cleanLastName = lastName
    .replace(/[^a-z0-9_-]/gi, "")
    .toUpperCase()

  const year = inputs.periodStart ? inputs.periodStart.substring(0, 4) : new Date().getFullYear().toString()

  let month = ""
  if (inputs.periodStart) {
    const parts = inputs.periodStart.split("-")
    if (parts.length > 1) {
      const mIdx = parseInt(parts[1] || "", 10) - 1
      const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
      if (mIdx >= 0 && mIdx < 12) {
        month = months[mIdx] || ""
      }
    }
  }
  if (!month) {
    month = new Date().toLocaleString("en-US", { month: "long" }).toUpperCase()
  }

  const endDayParts = inputs.periodEnd ? inputs.periodEnd.split("-") : []
  const endDay = endDayParts.length > 2 ? parseInt(endDayParts[2] || "", 10) : 15
  const cutoff = endDay <= 15 ? "1ST_CUTOFF" : "2ND_CUTOFF"

  doc.save(`${cleanLastName}_PHILFIDA_PAYSLIP_${month}_${cutoff}_${year}.pdf`)
}

export async function exportConsolidatedPayrollPdf(
  entries: PayrollEntry[],
  signatories: Signatory[],
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = 297
  const margin = 10
  const RM = pageW - margin

  // PhilFIDA Emerald
  const GREEN: [number, number, number] = [15, 110, 86]

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

    // ── Table header ──
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

    // Net Pay — green accent
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...GREEN)
    doc.text(n(result.netPay), cols.netR, textY, { align: "right" })

    // Row line
    doc.setDrawColor(225, 230, 228)
    doc.setLineWidth(0.15)
    doc.line(margin, y + rowH, RM, y + rowH)

    y += rowH
  })

  // ── Totals row ──
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

  // ── Signatories ──
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


export async function exportBulkPayslipsPdf(entries: PayrollEntry[]): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  entries.forEach((entry, idx) => {
    if (idx > 0) {
      doc.addPage()
    }
    const { employee, result, inputs } = entry
    const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

    const {
      earned, total, premium,
      overpayment, overpaymentPremium,
      absentDeduction, lateDeduction, undertimeDeduction,
      tax, netPay,
    } = result
    const { monthlyRate, lateMinutes, undertimeMinutes, absentDays } = inputs

    const boxW = 180
    const boxH = 126.5
    const boxX = (210 - boxW) / 2
    const boxY = 25

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.35)
    doc.rect(boxX, boxY, boxW, boxH)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text("Republic of the Philippines", boxX + boxW / 2, boxY + 8, { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(40, 92, 50)
    doc.text("Philippine Fiber Industry Development Authority", boxX + boxW / 2, boxY + 14, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text("PAYSLIP", boxX + boxW / 2, boxY + 20, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Name: ", boxX + 8, boxY + 29)
    const nameWidth = doc.getTextWidth("Name: ")
    doc.setFont("helvetica", "bold")
    doc.text(employee.name, boxX + 8 + nameWidth, boxY + 29)

    doc.setFont("helvetica", "normal")
    doc.text(`Position: ${employee.position}`, boxX + 8, boxY + 35)

    const modeLabel2 = result.computationType === "daily"
      ? "Daily"
      : result.computationType === "monthly"
        ? "Monthly"
        : result.computationType === "monthly-no-tax"
          ? "Monthly (No Tax)"
          : result.computationType === "semi-monthly-no-tax"
            ? "Semi-Monthly (No Tax)"
            : "Semi-Monthly"
    doc.text(`Period: ${period} (${modeLabel2})`, boxX + 8, boxY + 41)

    const tableY = boxY + 45
    const rowHeights = [6, 6, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5]
    
    doc.setLineWidth(0.3)
    for (let i = 0; i <= rowHeights.length; i++) {
      const yLine = tableY + rowHeights.slice(0, i).reduce((sum, h) => sum + h, 0)
      doc.line(boxX, yLine, boxX + boxW, yLine)
    }

    const tableH = rowHeights.reduce((sum, h) => sum + h, 0)
    doc.line(boxX + 90, tableY, boxX + 90, tableY + tableH)
    doc.line(boxX + 62, tableY + 6, boxX + 62, tableY + tableH)
    doc.line(boxX + 152, tableY + 6, boxX + 152, tableY + tableH)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("Earnings:", boxX + 2, tableY + 4.5)
    doc.text("Deductions:", boxX + 92, tableY + 4.5)

    doc.setFont("helvetica", "normal")
    doc.text("Amount", boxX + 88, tableY + 10.5, { align: "right" })
    doc.text("Amount", boxX + 178, tableY + 10.5, { align: "right" })

    const totalMins = lateMinutes + (undertimeMinutes ?? 0)
    let aluDesc = ""
    if (absentDays > 0 && totalMins > 0) {
      aluDesc = `${absentDays} day${absentDays !== 1 ? "s" : ""}, ${totalMins} min${totalMins !== 1 ? "s" : ""}`
    } else if (absentDays > 0) {
      aluDesc = `${absentDays} day${absentDays !== 1 ? "s" : ""}`
    } else if (totalMins > 0) {
      aluDesc = `${totalMins} min${totalMins !== 1 ? "s" : ""}`
    }

    const aluCost = absentDeduction + lateDeduction + undertimeDeduction
    const displayGross = total + premium

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    let rowY = tableY + 12 + 4.5
    doc.text("Rate/Month", boxX + 2, rowY)
    doc.text(n(monthlyRate), boxX + 88, rowY, { align: "right" })
    doc.text("Absent/Late/Undertime", boxX + 92, rowY)
    if (aluDesc) {
      doc.text(aluDesc, boxX + 178, rowY, { align: "right" })
    }

    rowY += 6.5
    doc.text("Earned for the Period", boxX + 2, rowY)
    doc.text(n(earned), boxX + 88, rowY, { align: "right" })
    doc.text("Deductions", boxX + 92, rowY)
    if (aluCost > 0) {
      doc.text(n(aluCost), boxX + 178, rowY, { align: "right" })
    }

    rowY += 6.5
    doc.text("20% Premium", boxX + 2, rowY)
    doc.text(n(premium), boxX + 88, rowY, { align: "right" })
    const addTax = inputs.additionalTax ?? 0
    const taxLabelStr = addTax > 0 ? `Tax (5% + ₱${n(addTax)})` : "5% tax"
    doc.text(taxLabelStr, boxX + 92, rowY)
    if (tax > 0) {
      doc.text(n(tax), boxX + 178, rowY, { align: "right" })
    }

    rowY += 6.5
    doc.text("Gross Pay", boxX + 2, rowY)
    doc.text(n(displayGross), boxX + 88, rowY, { align: "right" })
    doc.text("Overpayment", boxX + 92, rowY)
    if (overpayment > 0) {
      doc.text(n(overpayment), boxX + 178, rowY, { align: "right" })
    }

    rowY += 6.5
    doc.text("Overpayment (premium)", boxX + 92, rowY)
    if (overpaymentPremium > 0) {
      doc.text(n(overpaymentPremium), boxX + 178, rowY, { align: "right" })
    }

    rowY += 13
    doc.setFont("helvetica", "bold")
    doc.text("Net Pay", boxX + 92, rowY)
    doc.text(n(netPay), boxX + 178, rowY, { align: "right" })

    // Render Signature Block at the bottom of the box
    const signatureY = tableY + tableH + 3
    
    // Render Signatures
    let validSigs = (employee.payslipSignatories ?? []).filter(s => s.name.trim())
    if (validSigs.length === 0 && (employee.payslipSignatoryName || "").trim()) {
      validSigs = [{
        label: "Certified Correct:",
        name: employee.payslipSignatoryName || "",
        title: employee.payslipSignatoryTitle || ""
      }]
    }

    const totalBlocks = 1 + validSigs.length
    const usableW = 168
    const colW = usableW / totalBlocks
    const lineW = Math.min(74, colW - 10)

    // Left: Conforme / Received By
    const conformeX = boxX + 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text("Conforme / Received by:", conformeX, signatureY)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(conformeX, signatureY + 8, conformeX + lineW, signatureY + 8)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(employee.name.toUpperCase(), conformeX, signatureY + 11.5)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text("Signature over Printed Name", conformeX, signatureY + 14.5)

    // Right: Other dynamic signatories
    validSigs.forEach((sig, index) => {
      const sigX = boxX + 6 + (index + 1) * colW
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text(sig.label || "Certified Correct:", sigX, signatureY)
      doc.line(sigX, signatureY + 8, sigX + lineW, signatureY + 8)
      
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.text((sig.name || "").toUpperCase(), sigX, signatureY + 11.5)
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.text(sig.title || "Authorized Officer", sigX, signatureY + 14.5)
    })
  })

  doc.save("Bulk_Payslips.pdf")
}

export function exportAttendanceCertificatePdf(entry: PayrollEntry): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  const { employee, inputs, result } = entry
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const pageW = 210
  const pageMargin = 20
  const contentW = pageW - pageMargin * 2
  const amountCol = pageW - pageMargin - 5
  const RM = pageW - pageMargin

  let y = 15

  // 1. Header with Republic of the Philippines branding
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text("REPUBLIC OF THE PHILIPPINES", pageW / 2, y, { align: "center" })

  y += 4.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(15, 110, 86) // PhilFIDA Emerald
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

  y += 3
  // Elegant double lines
  doc.setDrawColor(15, 110, 86) // PhilFIDA Emerald
  doc.setLineWidth(0.5)
  doc.line(pageMargin, y, RM, y)
  
  y += 0.8
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, RM, y)

  y += 12
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 0)
  doc.text("CERTIFICATION OF ATTENDANCE ADJUSTMENTS", pageW / 2, y, { align: "center" })

  y += 10
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(50, 50, 50)
  
  const introText1 = `This is to certify that the following attendance records and salary deductions due to absences, lates, and undertimes were calculated for ${employee.name.toUpperCase()} for the pay period of ${period}.`
  const lines = doc.splitTextToSize(introText1, contentW)
  doc.text(lines, pageMargin, y)

  y += lines.length * 5 + 8

  // Rates sub-card
  const rateBoxH = 18
  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(pageMargin, y, contentW, rateBoxH, 1.5, 1.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("BASE CALCULATION RATES", pageMargin + 5, y + 5)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text(`Daily Rate: Php ${n(result.dailyRate)}`, pageMargin + 5, y + 11)
  doc.text(`Hourly Rate: Php ${n(result.hourlyRate)}`, pageMargin + 65, y + 11)
  doc.text(`Per-Minute Rate: Php ${n(result.perMinRate)}`, pageMargin + 125, y + 11)

  y += rateBoxH + 10

  // 2. Incident logs table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 110, 86)
  doc.text("ITEMIZED ADJUSTMENT LOG", pageMargin, y)

  y += 4

  // Table header
  doc.setFillColor(241, 245, 249) // light slate
  doc.rect(pageMargin, y, contentW, 7, "F")
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, RM, y)
  doc.line(pageMargin, y + 7, RM, y + 7)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text("Date", pageMargin + 4, y + 4.8)
  doc.text("Incident Type", pageMargin + 40, y + 4.8)
  doc.text("Duration", pageMargin + 95, y + 4.8)
  doc.text("Equivalent Deduction", amountCol - 4, y + 4.8, { align: "right" })

  y += 7

  const incidents = inputs.lateIncidents || []
  let hasIncidents = false

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)

  incidents.forEach((item) => {
    const isLate = item.type === "late" || !item.type
    const isUndertime = item.type === "undertime"
    const isAbsent = item.type === "absent"

    const minutes = Number(item.minutes) || 0
    const days = Number(item.days) || 0

    if (item.date?.trim() && ((!isAbsent && minutes > 0) || (isAbsent && days > 0))) {
      hasIncidents = true

      let deductionText = ""
      let durationText = ""
      let typeText = ""

      if (isAbsent) {
        typeText = "Absence"
        durationText = `${days} day${days > 1 ? "s" : ""}`
        deductionText = `Php ${n(days * result.dailyRate)}`
      } else if (isLate) {
        typeText = "Tardiness (Late)"
        durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
        deductionText = `Php ${n(minutes * result.perMinRate)}`
      } else if (isUndertime) {
        typeText = "Undertime"
        durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
        deductionText = `Php ${n(minutes * result.perMinRate)}`
      }

      doc.text(item.date, pageMargin + 4, y + 5)
      doc.text(typeText, pageMargin + 40, y + 5)
      doc.text(durationText, pageMargin + 95, y + 5)
      doc.text(deductionText, amountCol - 4, y + 5, { align: "right" })

      y += 8.5
      doc.line(pageMargin, y - 1, RM, y - 1)
    }
  })

  if (!hasIncidents) {
    doc.text("No lates, undertimes, or absences recorded. (Perfect Attendance)", pageMargin + 4, y + 5)
    y += 8.5
    doc.line(pageMargin, y - 1, RM, y - 1)
  }

  // Summary Row
  y += 2
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Total Deductions for Period", pageMargin + 4, y + 4)

  const totalDeductions = result.absentDeduction + result.lateDeduction + result.undertimeDeduction
  doc.text(`Php ${n(totalDeductions)}`, amountCol - 4, y + 4, { align: "right" })
  
  y += 7.5
  doc.line(pageMargin, y, RM, y)

  y += 18

  // Certification statement
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  doc.text("This certification is issued for internal administrative and auditing purposes.", pageMargin, y)

  y += 25

  // Signature Block
  const sigW = Math.min(70, (contentW - 15) / 2)
  const employeeLineX = pageMargin
  const certifiedLineX = RM - sigW

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  
  doc.text("Conforme / Received by:", employeeLineX, y)
  doc.text("Certified Correct:", certifiedLineX, y)

  y += 12
  doc.setDrawColor(200, 200, 200)
  doc.line(employeeLineX, y, employeeLineX + sigW, y)
  doc.line(certifiedLineX, y, certifiedLineX + sigW, y)

  y += 4
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text(employee.name.toUpperCase(), employeeLineX, y)
  
  const officerName = employee.payslipSignatoryName || employee.signatoryName || "Authorized Officer"
  doc.text(officerName.toUpperCase(), certifiedLineX, y)

  y += 3.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(employee.position || "Employee Signature", employeeLineX, y)

  const officerTitle = employee.payslipSignatoryTitle || employee.signatoryTitle || "Payroll Officer"
  doc.text(officerTitle, certifiedLineX, y)

  doc.save(`${employee.name.replace(/\s+/g, "_")}_Attendance_Log.pdf`)
}

const DTR_LEAVE_NAMES_MAP: Record<string, string> = {
  vl: "Vacation Leave",
  fl: "Forced / Mandatory Leave",
  sl: "Sick Leave",
  ml: "Maternity Leave",
  pl: "Paternity Leave",
  spl: "Solo Parent Leave",
  mc: "Special Leave Benefits for Women (Magna Carta)",
  vawc: "VAWC Leave",
  slp: "Special Leave Privileges",
  wl: "Wellness Leave",
  sel: "Special Emergency Leave",
  rl: "Rehabilitation Leave",
  stl: "Study Leave",
  cto: "Compensatory Time-Off",
  "cto-am": "Half Day CTO (AM)",
  "cto-pm": "Half Day CTO (PM)",
  wlcos: "Wellness Leave - COS",
}

const DTR_MARGIN_X = 7
const DTR_MARGIN_Y = 8
const DTR_CARD_GAP = 2
/** Shrink content slightly so borders/text stay inside typical printer no-print zones. */
const DTR_PRINT_SAFE_BUFFER = 0.93
/** Reference half-card width (mm) on A4 — used to compute horizontal scale. */
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
  doc: Doc,
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
  doc: Doc,
  time: string | undefined,
  x: number,
  y: number,
  scaleY: number
) {
  doc.text(formatRegion7LogTime(time), x, y + 3.6 * scaleY, { align: "center" })
}

/** Region VII (PHILFIDA RO VII) Civil Service Form No. 48 layout — split PDF option only. */
function drawDtrCardRegion7(
  doc: Doc,
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

  // Header — Civil Service Form No. 48
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
        drawFittedCenterText(
          doc,
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
          ? (DTR_LEAVE_NAMES_MAP[leaveKey] ?? leaveKey).toUpperCase()
          : "LEAVE"
        drawFittedCenterText(
          doc,
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
        drawFittedCenterText(
          doc,
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
          drawFittedCenterText(
            doc,
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

  // Footer — CERTIFIED CORRECT / APPROVED BY
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
  doc: Doc,
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
        drawFittedCenterText(
          doc,
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
        const label = leaveKey ? (DTR_LEAVE_NAMES_MAP[leaveKey] ?? leaveKey) : "Leave"
        drawFittedCenterText(
          doc,
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
        drawFittedCenterText(
          doc,
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
          drawFittedCenterText(
            doc,
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
    // Civil Service Form No. 48 — scale height to selected paper size
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
    drawDtrCardRegion7(
      doc,
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
    drawDtrCard(
      doc,
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
      drawDtrCardRegion7(
        doc,
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
      drawDtrCard(
        doc,
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

