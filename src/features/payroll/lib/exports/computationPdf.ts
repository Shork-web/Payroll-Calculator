import { formatPayPeriod } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/features/payroll/types/payroll"
import {
  computationModeLabel,
  drawMetricCards,
  drawOfficialFooter,
  drawOfficialPhilfidaHeader,
  drawOfficialSectionHeader,
  drawOfficialSignatories,
  drawOfficialTable,
  drawProfilePanel,
  loadPhilfidaLogo,
  type OfficialTableRow,
  type PdfPageBreakContext,
} from "@/lib/exports/pdfBranding"
import { buildPayrollExportFilename, createComputationPdfDoc, createPdfPageLayout, getPdfPaperSize, n, resolvePdfPaperFormat, scaleMm, type PdfDoc, type PdfPaperSize } from "@/lib/exports/pdfShared"

function buildComputationRows(
  result: PayrollResult,
  inputs: PayrollInputs,
): OfficialTableRow[] {
  const {
    dailyRate, perMinRate,
    earned, absentDeduction, lateDeduction, undertimeDeduction,
    total, premium, overpayment, overpaymentPremium, tax, netPay,
  } = result
  const { monthlyRate, lateMinutes, undertimeMinutes, absentDays, lateIncidents } = inputs

  const rows: OfficialTableRow[] = []
  let idx = 1

  const push = (row: Omit<OfficialTableRow, "index">) => {
    rows.push({ index: String(idx++), ...row })
  }

  if (result.computationType === "daily") {
    push({
      description: `Base Pay (${n(dailyRate)} x ${result.periodWorkingDays} days)`,
      category: "Earning",
      amount: n(earned),
      rowType: "earning",
    })
  } else if (result.computationType === "monthly" || result.computationType === "monthly-no-tax") {
    push({
      description: `Base Pay (Monthly Rate: ${n(monthlyRate)})`,
      category: "Earning",
      amount: n(earned),
      rowType: "earning",
    })
  } else {
    push({
      description: `Base Pay (${n(monthlyRate)} / 2 semi-monthly)`,
      category: "Earning",
      amount: n(earned),
      rowType: "earning",
    })
  }

  if (absentDays > 0) {
    push({
      description: `Less: Absences (${absentDays} day${absentDays !== 1 ? "s" : ""})`,
      category: "Deduction",
      amount: `(${n(absentDeduction)})`,
      rowType: "deduction",
    })
    const absentIncidentsOnly = lateIncidents?.filter(i => i.type === "absent") || []
    absentIncidentsOnly.forEach((incident) => {
      if (incident.date?.trim() && Number(incident.days) > 0) {
        const incidentDeduction = Number(incident.days) * dailyRate
        push({
          description: `  ${incident.date} — ${incident.days} day(s)`,
          category: "Detail",
          amount: `(${n(incidentDeduction)})`,
          rowType: "deduction",
        })
      }
    })
  }

  if (lateMinutes > 0) {
    push({
      description: `Less: Lates (${lateMinutes} mins)`,
      category: "Deduction",
      amount: `(${n(lateDeduction)})`,
      rowType: "deduction",
    })
    const lateIncidentsOnly = lateIncidents?.filter(i => i.type === "late" || !i.type) || []
    lateIncidentsOnly.forEach((incident) => {
      if (incident.date?.trim() && Number(incident.minutes) > 0) {
        const incidentDeduction = Number(incident.minutes) * perMinRate
        push({
          description: `  ${incident.date} — ${incident.minutes} min(s)`,
          category: "Detail",
          amount: `(${n(incidentDeduction)})`,
          rowType: "deduction",
        })
      }
    })
  }

  if ((undertimeMinutes ?? 0) > 0) {
    push({
      description: `Less: Undertime (${undertimeMinutes} mins)`,
      category: "Deduction",
      amount: `(${n(undertimeDeduction)})`,
      rowType: "deduction",
    })
    const undertimeIncidentsOnly = lateIncidents?.filter(i => i.type === "undertime") || []
    undertimeIncidentsOnly.forEach((incident) => {
      if (incident.date?.trim() && Number(incident.minutes) > 0) {
        const incidentDeduction = Number(incident.minutes) * perMinRate
        push({
          description: `  ${incident.date} — ${incident.minutes} min(s)`,
          category: "Detail",
          amount: `(${n(incidentDeduction)})`,
          rowType: "deduction",
        })
      }
    })
  }

  push({ description: "Subtotal (Before Premium)", category: "Subtotal", amount: n(total), rowType: "neutral", isBold: true })
  push({ description: "Add: 20% Premium", category: "Earning", amount: n(premium), rowType: "earning" })

  const displayGross = total + premium
  push({ description: "Gross Pay", category: "Total", amount: n(displayGross), rowType: "earning", isBold: true })

  const addTax = inputs.additionalTax ?? 0
  const baseTax = Math.max(0, tax - addTax)

  if (baseTax > 0) {
    push({
      description: "Withholding Tax (5%)",
      category: "Deduction",
      amount: `(${n(baseTax)})`,
      rowType: "deduction",
    })
  }
  if (addTax > 0) {
    const details = []
    if (inputs.additionalTaxDate) details.push(inputs.additionalTaxDate)
    if (inputs.additionalTaxReason) details.push(inputs.additionalTaxReason)
    const label = details.length > 0 ? `Additional Tax (${details.join(" - ")})` : "Additional Tax"
    push({ description: label, category: "Deduction", amount: `(${n(addTax)})`, rowType: "deduction" })
  }
  if (overpayment > 0) {
    push({
      description: "Overpayment Deduction (incl. premium)",
      category: "Deduction",
      amount: `(${n(overpayment + overpaymentPremium)})`,
      rowType: "deduction",
    })
  }

  const totalDeductions = tax + overpayment + overpaymentPremium
  if (totalDeductions === 0 && tax === 0) {
    push({ description: "No statutory deductions", category: "Deduction", amount: "0.00", rowType: "neutral" })
  }

  push({
    description: "NET PAY DUE",
    category: "Net Pay",
    amount: "Php " + n(netPay),
    rowType: "total",
    isBold: true,
  })

  return rows
}

function renderPayrollComputationPage(
  doc: PdfDoc,
  logoUrl: string,
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
): void {
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)
  const modeLabel = computationModeLabel(result.computationType)
  const issued = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const {
    dailyRate, hourlyRate,
    earned, absentDeduction, lateDeduction, undertimeDeduction,
    total, premium, netPay,
  } = result
  const { monthlyRate, workingDays, lateMinutes, undertimeMinutes, absentDays } = inputs

  const tableRows = buildComputationRows(result, inputs)
  const { pageW, margin, contentW, scale, startY } = createPdfPageLayout(doc)
  const displayGross = total + premium

  const pageBreak: PdfPageBreakContext = {
    maxContentY: doc.internal.pageSize.getHeight() - margin,
    topMargin: margin,
    onNewPage: () => {
      doc.addPage()
      pageBreak.maxContentY = doc.internal.pageSize.getHeight() - margin
    },
  }

  const ensureSpace = (currentY: number, needed: number): number => {
    if (currentY + needed <= pageBreak.maxContentY) return currentY
    pageBreak.onNewPage()
    return margin
  }

  let y = drawOfficialPhilfidaHeader(doc, logoUrl, pageW, margin, startY, {
    documentTitle: "OFFICIAL COMPUTATION OF SERVICES RENDERED",
    documentSubtitle: "Contract of Service — Payroll Computation Record",
  }, scale)

  y = drawOfficialSectionHeader(doc, margin, y, "EMPLOYEE PROFILE & SALARY RATES", scale)

  const profileFields = [
    { label: "Position / Designation", value: employee.position || "—" },
    { label: "Monthly Rate (MR)", value: "Php " + n(monthlyRate) },
    { label: "Working Days (WD)", value: `${workingDays} Days` },
    { label: "Daily Rate", value: "Php " + n(dailyRate) },
    { label: "Hourly Rate", value: "Php " + n(hourlyRate) + "/hr" },
    { label: "Pay Period", value: `${period} (${modeLabel})` },
  ]

  y = drawProfilePanel(doc, margin, contentW, y, employee.name, profileFields, scale)

  y = drawMetricCards(doc, margin, contentW, y, [
    { label: "Earned for Period", value: "Php " + n(earned) },
    { label: "Gross Pay", value: "Php " + n(displayGross) },
    { label: "Net Pay Due", value: "Php " + n(netPay), accent: "green" },
  ], scale)

  y = drawOfficialTable(
    doc,
    margin,
    contentW,
    y,
    `PAYROLL COMPUTATION SCHEDULE — ${tableRows.length} LINE ITEMS`,
    tableRows,
    scale,
    pageBreak,
  )

  y = ensureSpace(y, scaleMm(30, scale))
  y = drawOfficialSignatories(doc, margin, contentW, y, [
    {
      label: "Conforme / Received by:",
      name: employee.name,
      title: employee.position || "Employee Signature",
    },
    {
      label: "Certified Correct:",
      name: employee.signatoryName || "",
      title: employee.signatoryTitle || "Authorized Officer",
    },
  ], scale)

  let footerNote: string | undefined
  if (absentDays > 0 || lateMinutes > 0 || (undertimeMinutes ?? 0) > 0) {
    const baseLost = absentDeduction + lateDeduction + undertimeDeduction
    const premiumLost = baseLost * 0.20
    footerNote = `Note: Premium not credited due to absences, lates, or undertime (Php ${n(premiumLost)}).`
  }

  y = ensureSpace(y, scaleMm(22, scale))
  drawOfficialFooter(doc, pageW, margin, contentW, y, footerNote, issued, scale)
}

export async function exportPayrollPdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
  paperSize: PdfPaperSize = getPdfPaperSize(),
): Promise<void> {
  const logoUrl = await loadPhilfidaLogo()
  const doc = createComputationPdfDoc(paperSize)
  renderPayrollComputationPage(doc, logoUrl, employee, result, inputs)
  doc.save(buildPayrollExportFilename(employee, inputs, "COMPUTATION"))
}

export async function exportBulkComputationsPdf(
  entries: PayrollEntry[],
  paperSize: PdfPaperSize = getPdfPaperSize(),
): Promise<void> {
  const logoUrl = await loadPhilfidaLogo()
  const doc = createComputationPdfDoc(paperSize)
  const format = resolvePdfPaperFormat(paperSize)
  entries.forEach((entry, idx) => {
    if (idx > 0) doc.addPage(format, "portrait")
    renderPayrollComputationPage(doc, logoUrl, entry.employee, entry.result, entry.inputs)
  })
  doc.save("Bulk_Computations.pdf")
}
