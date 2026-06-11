import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

function n(v: number): string {
  if (v === 0) return "0.00"
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function exportTablePdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const {
    earned, absentDeduction, lateDeduction, undertimeDeduction,
    total, premium, grossPay,
    overpayment, overpaymentPremium,
    tax, netPay,
  } = result
  const { monthlyRate } = inputs

  // Add headers
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  
  const pageWidth = doc.internal.pageSize.getWidth()
  
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageWidth / 2, 15, { align: "center" })
  doc.setFontSize(9)
  doc.text(`Salary of ${employee.name}`, pageWidth / 2, 20, { align: "center" })
  doc.text(period, pageWidth / 2, 25, { align: "center" })

  // Define table data
  const head = [[
    "No.",
    "MONTHLY\nRATE",
    "EARNED FOR\nTHE PERIOD",
    "ABSENT",
    "LATE",
    "UNDERTIME",
    "TOTAL",
    "20%\nPREMIUM",
    "OVERPAYMENT",
    "20%\nPREMIUM\n(OP)",
    "GROSS\nAMOUNT",
    "5% TAX",
    "NET\nAMOUNT"
  ]]

  const body = [[
    "1",
    n(monthlyRate),
    n(earned),
    n(absentDeduction),
    n(lateDeduction),
    n(undertimeDeduction),
    n(total),
    n(premium),
    n(overpayment),
    n(overpaymentPremium),
    n(grossPay),
    n(tax),
    n(netPay)
  ]]

  // Generate table
  autoTable(doc, {
    startY: 30,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      halign: 'right',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { halign: 'center' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    margin: { top: 30, right: 10, left: 10, bottom: 10 }
  })

  const totalUTMins = inputs.lateMinutes + (inputs.undertimeMinutes ?? 0)
  if (totalUTMins > 0) {
    const noteParts = []
    if (inputs.lateMinutes > 0 && inputs.lateDates) {
      noteParts.push(`Late of ${inputs.lateMinutes} mins on ${inputs.lateDates}`)
    }
    if ((inputs.undertimeMinutes ?? 0) > 0 && inputs.undertimeDates) {
      noteParts.push(`Undertime of ${inputs.undertimeMinutes} mins on ${inputs.undertimeDates}`)
    }
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Note: ${noteParts.join(" | ")}`, 10, pageHeight - 10)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName   = employee.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  const safePeriod = period.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  doc.save(`payroll_table_${safeName}_${safePeriod}.pdf`)
}
