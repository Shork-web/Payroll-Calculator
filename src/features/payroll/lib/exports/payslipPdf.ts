import { formatPayPeriod } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/features/payroll/types/payroll"
import {
  computationModeLabel,
  drawMetricCards,
  drawOfficialFooter,
  drawOfficialPhilfidaHeader,
  drawOfficialSignatories,
  drawPayslipLedger,
  drawProfilePanel,
  loadPhilfidaLogo,
  PAYSLIP_FOOTER_DISCLAIMER,
  type PayslipLineItem,
} from "@/lib/exports/pdfBranding"
import {
  buildPayrollExportFilename,
  createComputationPdfDoc,
  createPdfPageLayout,
  getPdfPaperSize,
  n,
  resolvePdfPaperFormat,
  scaleMm,
  type PdfDoc,
  type PdfPaperSize,
} from "@/lib/exports/pdfShared"

function buildAttendanceDetail(inputs: PayrollInputs): string | undefined {
  const { absentDays, lateMinutes, undertimeMinutes } = inputs
  const parts: string[] = []

  if (absentDays > 0) {
    parts.push(`${absentDays} absence${absentDays !== 1 ? "s" : ""}`)
  }
  if (lateMinutes > 0) {
    parts.push(`${lateMinutes} min late`)
  }
  if ((undertimeMinutes ?? 0) > 0) {
    parts.push(`${undertimeMinutes} min undertime`)
  }

  if (parts.length === 0) return undefined
  return parts.join(" · ")
}

function buildTaxLabel(inputs: PayrollInputs, baseTax: number, addTax: number): string {
  if (addTax <= 0) {
    return baseTax > 0 ? "Withholding Tax (5%)" : "Withholding Tax"
  }

  const details: string[] = []
  if (inputs.additionalTaxDate) details.push(inputs.additionalTaxDate)
  if (inputs.additionalTaxReason) details.push(inputs.additionalTaxReason)
  const suffix = details.length > 0 ? ` (${details.join(" — ")})` : ""
  return `Additional Tax${suffix}`
}

function buildPayslipEarnings(
  result: PayrollResult,
  inputs: PayrollInputs,
): PayslipLineItem[] {
  const { earned, total, premium } = result
  const { monthlyRate } = inputs
  const displayGross = total + premium

  const items: PayslipLineItem[] = [
    { label: "Monthly Rate (Reference)", amount: n(monthlyRate) },
    { label: "Earned for the Period", amount: n(earned) },
    { label: "Add: 20% Premium", amount: n(premium) },
    { label: "Gross Pay", amount: n(displayGross), emphasis: "subtotal" },
  ]

  return items
}

function buildPayslipDeductions(
  result: PayrollResult,
  inputs: PayrollInputs,
): PayslipLineItem[] {
  const {
    absentDeduction,
    lateDeduction,
    undertimeDeduction,
    tax,
    overpayment,
    overpaymentPremium,
    totalDeductions,
  } = result

  const aluCost = absentDeduction + lateDeduction + undertimeDeduction
  const attendanceDetail = buildAttendanceDetail(inputs)
  const addTax = inputs.additionalTax ?? 0
  const baseTax = Math.max(0, tax - addTax)

  const items: PayslipLineItem[] = []

  if (attendanceDetail || aluCost > 0) {
    const row: PayslipLineItem = {
      label: "Absent / Late / Undertime",
      amount: aluCost > 0 ? n(aluCost) : "—",
    }
    if (attendanceDetail) row.detail = attendanceDetail
    items.push(row)
  }

  if (baseTax > 0) {
    items.push({ label: "Withholding Tax (5%)", amount: n(baseTax) })
  }

  if (addTax > 0) {
    items.push({
      label: buildTaxLabel(inputs, baseTax, addTax),
      amount: n(addTax),
    })
  }

  if (overpayment > 0) {
    items.push({ label: "Overpayment Deduction", amount: n(overpayment) })
  }

  if (overpaymentPremium > 0) {
    items.push({ label: "Overpayment (Premium Portion)", amount: n(overpaymentPremium) })
  }

  if (items.length === 0) {
    items.push({ label: "No deductions applied", amount: "0.00" })
  }

  items.push({
    label: "Total Deductions",
    amount: n(totalDeductions),
    emphasis: "subtotal",
  })

  return items
}

function buildPayslipSignatories(employee: EmployeeInfo): Array<{ label: string; name: string; title: string }> {
  let validSigs = (employee.payslipSignatories ?? []).filter((s) => s.name.trim())
  if (validSigs.length === 0 && (employee.payslipSignatoryName || "").trim()) {
    validSigs = [{
      label: "Certified Correct:",
      name: employee.payslipSignatoryName || "",
      title: employee.payslipSignatoryTitle || "",
    }]
  }

  const blocks: Array<{ label: string; name: string; title: string }> = [
    {
      label: "Conforme / Received by:",
      name: employee.name,
      title: "Signature over Printed Name",
    },
  ]

  validSigs.forEach((sig) => {
    blocks.push({
      label: sig.label || "Certified Correct:",
      name: sig.name,
      title: sig.title || "Authorized Officer",
    })
  })

  return blocks
}

function renderPayslipPage(
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

  const { dailyRate, hourlyRate, earned, netPay, totalDeductions } = result
  const { monthlyRate, workingDays } = inputs

  const { pageW, margin, contentW, scale, startY } = createPdfPageLayout(doc)

  const pageBreak = {
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
    documentTitle: "OFFICIAL PAYSLIP",
    documentSubtitle: "Contract of Service — Pay Advice & Employee Record",
  }, scale)

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
    { label: "Total Deductions", value: "Php " + n(totalDeductions) },
    { label: "Net Pay Due", value: "Php " + n(netPay), accent: "green" },
  ], scale)

  y = drawPayslipLedger(
    doc,
    margin,
    contentW,
    y,
    buildPayslipEarnings(result, inputs),
    buildPayslipDeductions(result, inputs),
    n(netPay),
    scale,
  )

  y = ensureSpace(y, scaleMm(30, scale))
  y = drawOfficialSignatories(doc, margin, contentW, y, buildPayslipSignatories(employee), scale)

  y = ensureSpace(y, scaleMm(20, scale))
  drawOfficialFooter(doc, pageW, margin, contentW, y, undefined, issued, scale, PAYSLIP_FOOTER_DISCLAIMER)
}

export async function exportPayslipPdf(
  employee: EmployeeInfo,
  result: PayrollResult,
  inputs: PayrollInputs,
  paperSize: PdfPaperSize = getPdfPaperSize(),
): Promise<void> {
  const logoUrl = await loadPhilfidaLogo()
  const doc = createComputationPdfDoc(paperSize)
  renderPayslipPage(doc, logoUrl, employee, result, inputs)
  doc.save(buildPayrollExportFilename(employee, inputs, "PHILFIDA_PAYSLIP"))
}

export async function exportBulkPayslipsPdf(
  entries: PayrollEntry[],
  paperSize: PdfPaperSize = getPdfPaperSize(),
): Promise<void> {
  const logoUrl = await loadPhilfidaLogo()
  const doc = createComputationPdfDoc(paperSize)
  const format = resolvePdfPaperFormat(paperSize)

  entries.forEach((entry, idx) => {
    if (idx > 0) doc.addPage(format, "portrait")
    renderPayslipPage(doc, logoUrl, entry.employee, entry.result, entry.inputs)
  })

  doc.save("Bulk_Payslips.pdf")
}
