import { formatPayPeriod } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/features/payroll/types/payroll"
import {
  computationModeLabel,
  drawOfficialFooter,
  drawOfficialPhilfidaHeader,
  drawOfficialSignatories,
  drawPayslipSplitTable,
  drawProfilePanel,
  loadPhilfidaLogo,
  PAYSLIP_FOOTER_DISCLAIMER,
  type PayslipSplitRow,
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

function formatAmount(value: number): string {
  return value > 0 ? n(value) : "—"
}

function buildAttendanceDetail(inputs: PayrollInputs): string | undefined {
  const { absentDays, lateMinutes, undertimeMinutes } = inputs
  const parts: string[] = []

  if (absentDays > 0) {
    parts.push(`${absentDays} day${absentDays !== 1 ? "s" : ""}`)
  }
  if (lateMinutes > 0) {
    parts.push(`${lateMinutes} min late`)
  }
  if ((undertimeMinutes ?? 0) > 0) {
    parts.push(`${undertimeMinutes} min UT`)
  }

  if (parts.length === 0) return undefined
  return parts.join(", ")
}

function buildPayslipTableRows(result: PayrollResult, inputs: PayrollInputs): PayslipSplitRow[] {
  const {
    earned,
    total,
    premium,
    tax,
    overpayment,
    overpaymentPremium,
    underpayment,
    underpaymentPremium,
    totalDeductions,
    absentDeduction,
    lateDeduction,
    undertimeDeduction,
  } = result
  const { monthlyRate } = inputs
  const displayGross = total + premium
  const aluCost = absentDeduction + lateDeduction + undertimeDeduction
  const attendanceDetail = buildAttendanceDetail(inputs)

  const rows: PayslipSplitRow[] = [
    {
      leftLabel: "Rate / Month",
      leftAmount: n(monthlyRate),
      rightLabel: "Absent / Late / Undertime",
      rightAmount: formatAmount(aluCost),
    },
    {
      leftLabel: "Earned for the Period",
      leftAmount: n(earned),
      rightLabel: "Withholding Tax",
      rightAmount: formatAmount(tax),
    },
    {
      leftLabel: "20% COS Premium",
      leftAmount: n(premium),
      rightLabel: "Overpayment Recovery",
      rightAmount: formatAmount(overpayment),
    },
    {
      leftLabel: "Underpayment Adjustment",
      leftAmount: formatAmount(underpayment),
      rightLabel: "Overpayment Premium",
      rightAmount: formatAmount(overpaymentPremium),
    },
    {
      leftLabel: "Underpayment Premium",
      leftAmount: formatAmount(underpaymentPremium),
    },
    {
      leftLabel: "Gross Pay",
      leftAmount: n(displayGross),
      leftBold: true,
      rightLabel: "Total Deductions",
      rightAmount: n(totalDeductions),
      rightBold: true,
    },
  ]

  if (attendanceDetail && rows[0]) {
    rows[0].rightDetail = attendanceDetail
  }

  return rows
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

  const { dailyRate, hourlyRate, netPay } = result
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

  y = drawPayslipSplitTable(
    doc,
    margin,
    contentW,
    y,
    buildPayslipTableRows(result, inputs),
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
