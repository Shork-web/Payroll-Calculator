import { formatPayPeriod } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/features/payroll/types/payroll"
import {
  computationModeLabel,
  computeComputationPageFillLayout,
  drawMetricCards,
  drawOfficialFooter,
  drawOfficialPhilfidaHeader,
  drawOfficialSectionHeader,
  drawOfficialSignatories,
  drawOfficialTable,
  drawProfilePanel,
  loadPhilfidaLogo,
  type OfficialTableRow,
} from "@/lib/exports/pdfBranding"
import { buildPayrollExportFilename, createComputationPdfDoc, createPdfPageLayout, getPdfPaperSize, n, resolvePdfPaperFormat, type PdfDoc, type PdfPaperSize } from "@/lib/exports/pdfShared"

function buildComputationRows(
  result: PayrollResult,
  inputs: PayrollInputs,
): OfficialTableRow[] {
  const {
    dailyRate,
    earned, absentDeduction, lateDeduction, undertimeDeduction,
    total, premium, grossPay, overpayment, overpaymentPremium, underpayment, underpaymentPremium, tax, netPay,
  } = result
  const { monthlyRate } = inputs

  const rows: OfficialTableRow[] = []
  let idx = 1

  const push = (row: Omit<OfficialTableRow, "index">) => {
    rows.push({ index: String(idx++), ...row })
  }

  const pushSection = (title: string) => {
    rows.push({
      index: "",
      description: title,
      category: "",
      amount: "",
      rowType: "section",
    })
  }

  const formatDeductionAmount = (amount: number) => (amount > 0 ? `(${n(amount)})` : n(0))
  const formatAdditionAmount = (amount: number) => (amount > 0 ? n(amount) : n(0))

  const basePayDescription =
    result.computationType === "daily"
      ? `Base Pay (${n(dailyRate)} x ${result.periodWorkingDays} days)`
      : result.computationType === "monthly" || result.computationType === "monthly-no-tax"
        ? `Base Pay (Monthly Rate: ${n(monthlyRate)})`
        : `Base Pay (${n(monthlyRate)} / 2 semi-monthly)`

  pushSection("A. EARNINGS")
  push({
    description: basePayDescription,
    category: "Earning",
    amount: n(earned),
    rowType: "neutral",
  })

  pushSection("B. ATTENDANCE DEDUCTIONS")
  push({ description: "Less: Absent", category: "Deduction", amount: formatDeductionAmount(absentDeduction), rowType: "neutral" })
  push({ description: "Less: Late", category: "Deduction", amount: formatDeductionAmount(lateDeduction), rowType: "neutral" })
  push({ description: "Less: Undertime", category: "Deduction", amount: formatDeductionAmount(undertimeDeduction), rowType: "neutral" })
  push({
    description: "Subtotal (After Attendance)",
    category: "Subtotal",
    amount: n(total),
    rowType: "neutral",
    isBold: true,
  })

  pushSection("C. PREMIUM & ADJUSTMENTS")
  push({ description: "Add: 20% COS Premium", category: "Earning", amount: n(premium), rowType: "neutral" })
  push({
    description: "Less: Overpayment (incl. premium)",
    category: "Deduction",
    amount: formatDeductionAmount(overpayment + overpaymentPremium),
    rowType: "neutral",
  })
  push({
    description: "Add: Underpayment (incl. premium)",
    category: "Adjustment",
    amount: formatAdditionAmount(underpayment + underpaymentPremium),
    rowType: "neutral",
  })
  push({
    description: "Gross Pay",
    category: "Total",
    amount: n(grossPay),
    rowType: "neutral",
    isBold: true,
  })

  const addTax = inputs.additionalTax ?? 0
  const baseTax = Math.max(0, tax - addTax)
  const hasTax =
    result.computationType !== "semi-monthly-no-tax" && result.computationType !== "monthly-no-tax"

  if (hasTax) {
    pushSection("D. TAX WITHHOLDING")
    push({
      description: "Less: Withholding Tax (5%)",
      category: "Deduction",
      amount: formatDeductionAmount(baseTax),
      rowType: "neutral",
    })
    push({
      description: addTax > 0 && inputs.additionalTaxReason
        ? `Less: Add'l Tax — ${inputs.additionalTaxReason}`
        : "Less: Additional Tax",
      category: "Deduction",
      amount: formatDeductionAmount(addTax),
      rowType: "neutral",
    })
  }

  pushSection(hasTax ? "E. NET PAY" : "D. NET PAY")
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
    grossPay, netPay,
  } = result
  const { monthlyRate, workingDays, lateMinutes, undertimeMinutes, absentDays } = inputs

  const tableRows = buildComputationRows(result, inputs)
  const { pageW, pageH, margin, contentW, scale, startY } = createPdfPageLayout(doc)
  const compact = true

  const profileFields = [
    { label: "Position / Designation", value: employee.position || "—" },
    { label: "Monthly Rate (MR)", value: "Php " + n(monthlyRate) },
    { label: "Working Days (WD)", value: `${workingDays} Days` },
    { label: "Daily Rate", value: "Php " + n(dailyRate) },
    { label: "Hourly Rate", value: "Php " + n(hourlyRate) + "/hr" },
    { label: "Pay Period", value: `${period} (${modeLabel})` },
  ]

  let footerNote: string | undefined
  if (absentDays > 0 || lateMinutes > 0 || (undertimeMinutes ?? 0) > 0) {
    const baseLost = absentDeduction + lateDeduction + undertimeDeduction
    const premiumLost = baseLost * 0.20
    footerNote = `Note: Premium not credited due to absences, lates, or undertime (Php ${n(premiumLost)}).`
  }

  const signatoryBlocks = [
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
  ]

  const fill = computeComputationPageFillLayout(
    doc,
    pageH,
    margin,
    contentW,
    scale,
    tableRows,
    profileFields,
    employee.name,
    signatoryBlocks,
    footerNote,
    compact,
  )
  const cs = fill.scale

  let y = drawOfficialPhilfidaHeader(doc, logoUrl, pageW, margin, startY, {
    documentTitle: "OFFICIAL COMPUTATION OF SERVICES RENDERED",
    documentSubtitle: "COS and JO - Payroll Computation Record",
  }, cs, compact)

  y = drawOfficialSectionHeader(doc, margin, y, "EMPLOYEE PROFILE & SALARY RATES", cs, compact)

  y = drawProfilePanel(doc, margin, contentW, y, employee.name, profileFields, cs, compact)

  y = drawMetricCards(doc, margin, contentW, y, [
    { label: "Earned for Period", value: "Php " + n(earned) },
    { label: "Gross Pay", value: "Php " + n(grossPay) },
    { label: "Net Pay Due", value: "Php " + n(netPay), accent: "green" },
  ], cs, compact)

  y = drawOfficialTable(
    doc,
    margin,
    contentW,
    y,
    "COMPUTATION TABLE",
    tableRows,
    cs,
    undefined,
    { useBlackText: true, compact: true, rowStretch: fill.rowStretch },
  )

  drawOfficialSignatories(doc, margin, contentW, fill.signatoriesY, signatoryBlocks, cs, compact)
  drawOfficialFooter(doc, pageW, margin, contentW, fill.footerY, footerNote, issued, cs, undefined, compact)
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
