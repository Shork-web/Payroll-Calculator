import jsPDF from "jspdf"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

const PW = 210
const ML = 20
const RM = PW - ML
const LH = 8

type Doc = InstanceType<typeof jsPDF>

function wrapLines(doc: Doc, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

function frac(doc: Doc, cx: number, cy: number, top: string, bot: string, hw: number) {
  doc.setFont("Cambria", "normal")
  doc.setFontSize(8)
  doc.text(top, cx, cy - 2.5, { align: "center" })
  doc.setDrawColor(80, 90, 110)
  doc.setLineWidth(0.4)
  doc.line(cx - hw, cy + 0.5, cx + hw, cy + 0.5)
  doc.setDrawColor(0, 0, 0)
  doc.text(bot, cx, cy + 5.5, { align: "center" })
}

function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Small all-caps gray section label. */
function sectionHead(doc: Doc, label: string, y: number) {
  doc.setFont("Cambria", "normal")
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text(label.toUpperCase(), ML, y)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
}

/** Full-width light horizontal rule. */
function fullRule(doc: Doc, y: number) {
  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(0.3)
  doc.line(ML, y, RM, y)
  doc.setDrawColor(0, 0, 0)
}

/** Short rule spanning only the value column (right side). */
function shortRule(doc: Doc, y: number, double = false) {
  doc.setDrawColor(100, 120, 150)
  doc.setLineWidth(0.4)
  const x1 = RM - 44, x2 = RM + 1
  doc.line(x1, y, x2, y)
  if (double) doc.line(x1, y + 1.8, x2, y + 1.8)
  doc.setDrawColor(0, 0, 0)
}

/** Single label + right-aligned value row. */
function row(
  doc: Doc,
  label: string,
  value: string,
  y: number,
  opts: { bold?: boolean; indent?: boolean; gray?: boolean } = {},
) {
  const x = opts.indent ? ML + 8 : ML
  if (opts.gray) {
    doc.setFont("Cambria", "normal")
    doc.setTextColor(130, 140, 150)
  } else if (opts.bold) {
    doc.setFont("Cambria", "bold")
    doc.setTextColor(30, 40, 60)
  } else {
    doc.setFont("Cambria", "normal")
    doc.setTextColor(80, 90, 110)
  }
  doc.setFontSize(9)
  doc.text(label, x, y)
  doc.setTextColor(30, 40, 60)
  doc.text(value, RM, y, { align: "right" })
  doc.setFont("Cambria", "normal")
  doc.setTextColor(0, 0, 0)
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
  const { monthlyRate, workingDays, lateMinutes, absentDays } = inputs

  const pageW = 210
  const pageMargin = 18
  const contentW = pageW - pageMargin * 2
  const labelX = pageMargin
  const valueX = pageMargin + 68
  const amountX = pageW - pageMargin - 2

  // Header panel
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, pageW, 42, "F")
  doc.setDrawColor(228, 232, 238)
  doc.setLineWidth(0.35)
  doc.line(pageMargin, 42, pageW - pageMargin, 42)

  doc.setFont("Cambria", "bold")
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text("COMPUTATION OF SERVICES RENDERED", pageW / 2, 16, { align: "center" })

  doc.setFont("Cambria", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`For the Period ${period}`, pageW / 2, 24, { align: "center" })

  doc.setFont("Cambria", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("Official Payroll Computation", pageW / 2, 33, { align: "center" })

  let y = 50

  // Employee card
  const employeeNameLines = wrapLines(doc, employee.name.toUpperCase(), contentW - 72)
  const employeePosLines = wrapLines(doc, employee.position, contentW - 72)
  const employeeCardH = 8 + Math.max(employeeNameLines.length, employeePosLines.length) * 4 + 4

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.5)
  doc.roundedRect(pageMargin, y, contentW, employeeCardH, 1.5, 1.5, "FD")
  doc.setFont("Cambria", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("EMPLOYEE", labelX + 2, y + 4)

  doc.setFont("Cambria", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text("Name:", labelX + 2, y + 10)
  doc.setFont("Cambria", "bold")
  doc.setTextColor(0, 0, 0)
  let nameY = y + 10
  employeeNameLines.forEach((line) => {
    doc.text(line, valueX, nameY)
    nameY += 3.8
  })

  doc.setFont("Cambria", "normal")
  doc.setTextColor(0, 0, 0)
  const posY = nameY + 1
  doc.text("Position:", labelX + 2, posY)
  doc.setFont("Cambria", "bold")
  doc.setTextColor(0, 0, 0)
  let posLineY = posY
  employeePosLines.forEach((line) => {
    doc.text(line, valueX, posLineY)
    posLineY += 3.8
  })

  y += employeeCardH + 5

  // Rate card
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.5)
  doc.roundedRect(pageMargin, y, contentW, 30, 1.5, 1.5, "FD")
  doc.setFont("Cambria", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("PAY RATES", labelX + 2, y + 5)

  doc.setFont("Cambria", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  const rateRows: Array<[string, string]> = [
    ["Monthly Rate (MR):", "Php " + n(monthlyRate)],
    ["Working Days (WD):", workingDays + " Days"],
    ["Daily Rate:", "Php " + n(dailyRate)],
    ["Hourly Rate:", "Php " + n(hourlyRate) + "/hr"],
  ]

  let rateY = y + 11
  rateRows.forEach(([label, value]) => {
    doc.text(label, labelX + 2, rateY)
    doc.setFont("Cambria", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(value, valueX, rateY)
    doc.setFont("Cambria", "normal")
    doc.setTextColor(0, 0, 0)
    rateY += 5
  })

  y += 35

  // Computation section
  doc.setFont("Cambria", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("COMPENSATION CALCULATION", labelX, y)
  y += 6

  const itemCol = labelX
  const amountCol = amountX - 2

  function rowLine(label: string, amount: string, bold = false) {
    doc.setFont("Cambria", bold ? "bold" : "normal")
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(label, itemCol + 2, y)
    doc.text(amount, amountCol, y, { align: "right" })
    y += 5.5
  }

  rowLine(`Base Pay (${n(monthlyRate)} ÷ 2)`, n(earned))

  if (absentDays > 0) {
    rowLine(`Less: Absences (${absentDays} day${absentDays !== 1 ? "s" : ""})`, `(${n(absentDeduction)})`)
  }

  if (lateMinutes > 0) {
    rowLine(`Less: Lates/Undertime (${lateMinutes} mins)`, `(${n(lateDeduction)})`)
  }

  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.35)
  doc.line(itemCol, y, amountCol, y)
  y += 4

  rowLine("Subtotal", n(total), true)
  rowLine("Add: 20% Premium", n(premium))

  doc.setLineWidth(0.5)
  doc.line(itemCol, y, amountCol, y)
  y += 4

  const displayGross = total + premium
  rowLine("Gross Pay", n(displayGross), true)

  // Deductions section
  doc.setFont("Cambria", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("DEDUCTIONS", labelX, y)
  y += 6

  let hasDeductions = false
  if (tax > 0) {
    rowLine("Withholding Tax", `(${n(tax)})`)
    hasDeductions = true
  }
  if (overpayment > 0) {
    rowLine("Overpayment Deduction", `(${n(overpayment + overpaymentPremium)})`)
    hasDeductions = true
  }

  if (!hasDeductions) {
    doc.setFont("Cambria", "normal")
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text("No deductions", itemCol + 2, y)
    y += 5.5
  }

  y += 1
  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.5)
  doc.line(itemCol, y, amountCol, y)
  y += 5

  // Net pay due card
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.5)
  doc.roundedRect(pageMargin, y, contentW, 11, 1.5, 1.5, "FD")
  doc.setFont("Cambria", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text("NET PAY DUE", labelX + 2, y + 6)
  doc.text("Php " + n(netPay), amountCol, y + 6, { align: "right" })

  y += 15

  // Footer note
  doc.setDrawColor(235, 239, 244)
  doc.setLineWidth(0.35)
  doc.line(pageMargin, y, pageW - pageMargin, y)
  y += 7

  doc.setFont("Cambria", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  if (absentDays > 0 || lateMinutes > 0) {
    const baseLost = absentDeduction + lateDeduction
    const premiumLost = baseLost * 0.20
    doc.text(`Note: Premium not credited due to absences/lates: Php ${n(premiumLost)}`, pageMargin, y)
  } else {
    doc.text("This is an official payroll computation record.", pageMargin, y)
  }

  const safeName = employee.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  const safePeriod = period.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  doc.save(`payroll_${safeName}_${safePeriod}.pdf`)
}
