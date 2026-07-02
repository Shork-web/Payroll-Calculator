import jsPDF from "jspdf"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/types/payroll"

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
  doc.setFillColor(15, 110, 86)
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 110, 86)
  doc.text("COMPENSATION CALCULATION", pageMargin + 5, y)
  
  y += 6.5

  rowIndex = 0
  if (result.computationType === "daily") {
    drawRow(`Base Pay (${n(dailyRate)} × ${result.periodWorkingDays} days)`, n(earned))
  } else if (result.computationType === "monthly") {
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
      doc.setTextColor(185, 28, 28) // Red-700 to match lates/undertime
      
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
      doc.setTextColor(185, 28, 28) // Red-700
      
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
      doc.setTextColor(185, 28, 28) // Red-700
      
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
  doc.setFillColor(15, 110, 86)
  doc.rect(pageMargin, y - 3.5, 2.5, 4.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 110, 86)
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
  doc.setFillColor(15, 110, 86) // Solid PhilFIDA Emerald
  doc.roundedRect(pageMargin, y, contentW, netCardH, 1.5, 1.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255) // White text
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
  doc.text("Employee Signature", pageMargin + 4, y + 8)

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
  const boxH = 102.5
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

export async function exportConsolidatedPayrollPdf(
  entries: PayrollEntry[],
  sigName: string,
  sigTitle: string,
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
    const modeStr = result.computationType === "daily" ? "Daily"
      : result.computationType === "monthly" ? "Monthly" : "Semi-Monthly"
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

  // ── Signatory ──
  const sigStartX = margin + 185

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text("Certified Correct:", sigStartX, y)

  y += 14
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  doc.line(sigStartX, y, RM - 3, y)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text((sigName || "").toUpperCase() || "(No Signatory Configured)", sigStartX, y + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(sigTitle || "Authorized Signatory", sigStartX, y + 9.5)

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
    const boxH = 102.5
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
  })

  doc.save("Bulk_Payslips.pdf")
}

