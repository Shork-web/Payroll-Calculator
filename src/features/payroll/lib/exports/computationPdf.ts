import { formatPayPeriod } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry } from "@/features/payroll/types/payroll"
import { isDayBasedAttendanceType } from "@/features/payroll/lib/attendanceIncidents"
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

export interface ParsedDateItem {
  monthIndex: number
  monthName: string
  day: number
  year?: number | undefined
  suffix?: string | undefined
  original: string
}

export interface AttendanceRowInfo {
  description: string
  subDescription?: string | undefined
}

/**
 * Extracts individual date strings from a composite string (handling dates with internal commas).
 */
export function extractDateTokens(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const matches = trimmed.match(
    /(?:[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4})(?:\s*\([^)]*\))?/g,
  )

  if (matches && matches.length > 0) {
    return matches.map((m) => m.trim())
  }

  return trimmed
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Parses any date token (ISO, written English month, or slash format).
 */
export function parseDateToken(raw: string): ParsedDateItem {
  const trimmed = raw.trim()

  // Match ISO: 2026-09-25 or 2026-09-25 (AM)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s*\((.*?)\))?$/)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = Number(isoMatch[2]) - 1
    const d = Number(isoMatch[3])
    const suffix = isoMatch[4]?.trim()
    const monthName = MONTH_NAMES[m] || ""
    return {
      monthIndex: m,
      monthName,
      day: d,
      year: y,
      suffix,
      original: trimmed,
    }
  }

  // Match "September 25, 2026" or "Sep 25, 2026" or "September 25"
  const wordMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?:\s*\((.*?)\))?$/)
  if (wordMatch) {
    const mStr = wordMatch[1]?.toLowerCase() || ""
    const m = MONTH_MAP[mStr] !== undefined ? MONTH_MAP[mStr] : -1
    const d = Number(wordMatch[2])
    const y = wordMatch[3] ? Number(wordMatch[3]) : undefined
    const suffix = wordMatch[4]?.trim()
    const monthName = m >= 0 ? (MONTH_NAMES[m] || wordMatch[1] || "") : (wordMatch[1] || "")
    return {
      monthIndex: m,
      monthName,
      day: d,
      year: y,
      suffix,
      original: trimmed,
    }
  }

  // Match "09/25/2026" or "9/25/2026"
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*\((.*?)\))?$/)
  if (slashMatch) {
    const m = Number(slashMatch[1]) - 1
    const d = Number(slashMatch[2])
    const y = Number(slashMatch[3])
    const suffix = slashMatch[4]?.trim()
    const monthName = MONTH_NAMES[m] || ""
    return {
      monthIndex: m,
      monthName,
      day: d,
      year: y,
      suffix,
      original: trimmed,
    }
  }

  return {
    monthIndex: -1,
    monthName: "",
    day: 0,
    suffix: undefined,
    original: trimmed,
  }
}

/**
 * Groups dates cleanly, eliminating duplicate month/year repetitions.
 * e.g. "September 25, 2026" and "September 29, 2026" -> "September 25, 29, 2026"
 */
export function formatGroupedDates(items: ParsedDateItem[]): string {
  if (items.length === 0) return ""
  if (items.length === 1 && items[0]) {
    const it = items[0]
    if (it.monthIndex >= 0 && it.day > 0) {
      const yearPart = it.year ? `, ${it.year}` : ""
      const suffixPart = it.suffix ? ` (${it.suffix})` : ""
      return `${it.monthName} ${it.day}${suffixPart}${yearPart}`
    }
    return it.original
  }

  const first = items[0]
  if (!first) return ""
  const allSameMonthAndYear =
    first.monthIndex >= 0 &&
    first.day > 0 &&
    items.every(
      (it) =>
        it.monthIndex === first.monthIndex &&
        it.year === first.year &&
        it.day > 0,
    )

  if (allSameMonthAndYear) {
    const yearPart = first.year ? `, ${first.year}` : ""
    const dayTokens = items.map((it) => {
      const suffixPart = it.suffix ? ` (${it.suffix})` : ""
      return `${it.day}${suffixPart}`
    })
    return `${first.monthName} ${dayTokens.join(", ")}${yearPart}`
  }

  return items
    .map((it) => {
      if (it.monthIndex >= 0 && it.day > 0) {
        const yearPart = it.year ? `, ${it.year}` : ""
        const suffixPart = it.suffix ? ` (${it.suffix})` : ""
        return `${it.monthName} ${it.day}${suffixPart}${yearPart}`
      }
      return it.original
    })
    .join("; ")
}

/**
 * Formats a raw date (ISO YYYY-MM-DD or pre-formatted like "March 4" or "Jun 4")
 * into a clean short date string like "Mar 4" or "March 4".
 */
export function formatIncidentDate(rawDate: string): string {
  const parsed = parseDateToken(rawDate)
  if (parsed.monthIndex >= 0 && parsed.day > 0) {
    const yearPart = parsed.year ? `, ${parsed.year}` : ""
    const suffixPart = parsed.suffix ? ` (${parsed.suffix})` : ""
    return `${parsed.monthName} ${parsed.day}${suffixPart}${yearPart}`
  }
  return rawDate.trim()
}

/**
 * Replaces any ISO dates inside a date summary string with formatted dates.
 */
export function formatIncidentDateString(rawStr: string): string {
  const tokens = extractDateTokens(rawStr)
  if (tokens.length > 0) {
    return formatGroupedDates(tokens.map(parseDateToken))
  }
  return rawStr.trim()
}

/**
 * Builds structured row info for "Less: Absent".
 */
export function buildAbsentRowInfo(inputs: PayrollInputs, absentDeduction = 0): AttendanceRowInfo {
  const days = inputs.absentDays
  if (days <= 0 && absentDeduction <= 0) {
    return { description: "Less: Absent" }
  }

  const countStr = days === 1 ? "1 day" : `${days} days`
  const baseDesc = days > 0 ? `Less: Absent (${countStr})` : "Less: Absent"

  const incidents = (inputs.lateIncidents || []).filter(
    (item) => item.date?.trim() && isDayBasedAttendanceType(item.type),
  )

  if (incidents.length > 0) {
    const parsedList = incidents.map((item) => {
      let suffix: string | undefined
      if (item.type === "halfday-am") suffix = "AM"
      else if (item.type === "halfday-pm") suffix = "PM"
      else if (item.type === "halfday") suffix = "0.5d"
      else if (item.days && item.days > 1) suffix = `${item.days}d`
      const parsed = parseDateToken(item.date)
      if (suffix) parsed.suffix = suffix
      return parsed
    })
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  if (inputs.absentDates?.trim()) {
    const rawTokens = extractDateTokens(inputs.absentDates.trim())
    const parsedList = rawTokens.map(parseDateToken)
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  return { description: baseDesc }
}

/**
 * Builds structured row info for "Less: Late".
 */
export function buildLateRowInfo(inputs: PayrollInputs, lateDeduction = 0): AttendanceRowInfo {
  const minutes = inputs.lateMinutes
  if (minutes <= 0 && lateDeduction <= 0) {
    return { description: "Less: Late" }
  }

  const countStr = `${minutes} min${minutes !== 1 ? "s" : ""}`
  const baseDesc = minutes > 0 ? `Less: Late (${countStr})` : "Less: Late"

  const incidents = (inputs.lateIncidents || []).filter(
    (item) => item.date?.trim() && item.type === "late" && Number(item.minutes) > 0,
  )

  if (incidents.length > 0) {
    const parsedList = incidents.map((item) => {
      const parsed = parseDateToken(item.date)
      if (incidents.length > 1) {
        parsed.suffix = `${item.minutes}m`
      }
      return parsed
    })
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  if (inputs.lateDates?.trim()) {
    const rawTokens = extractDateTokens(inputs.lateDates.trim())
    const parsedList = rawTokens.map(parseDateToken)
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  return { description: baseDesc }
}

/**
 * Builds structured row info for "Less: Undertime".
 */
export function buildUndertimeRowInfo(inputs: PayrollInputs, undertimeDeduction = 0): AttendanceRowInfo {
  const minutes = inputs.undertimeMinutes ?? 0
  if (minutes <= 0 && undertimeDeduction <= 0) {
    return { description: "Less: Undertime" }
  }

  const countStr = `${minutes} min${minutes !== 1 ? "s" : ""}`
  const baseDesc = minutes > 0 ? `Less: Undertime (${countStr})` : "Less: Undertime"

  const incidents = (inputs.lateIncidents || []).filter(
    (item) => item.date?.trim() && item.type === "undertime" && Number(item.minutes) > 0,
  )

  if (incidents.length > 0) {
    const parsedList = incidents.map((item) => {
      const parsed = parseDateToken(item.date)
      if (incidents.length > 1) {
        parsed.suffix = `${item.minutes}m`
      }
      return parsed
    })
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  if (inputs.undertimeDates?.trim()) {
    const rawTokens = extractDateTokens(inputs.undertimeDates.trim())
    const parsedList = rawTokens.map(parseDateToken)
    const grouped = formatGroupedDates(parsedList)
    if (grouped) {
      const prefix = parsedList.length === 1 ? "Date:" : "Dates:"
      return {
        description: baseDesc,
        subDescription: `${prefix} ${grouped}`,
      }
    }
  }

  return { description: baseDesc }
}

export function buildAbsentDescription(inputs: PayrollInputs, absentDeduction = 0): string {
  const info = buildAbsentRowInfo(inputs, absentDeduction)
  return info.subDescription ? `${info.description} — ${info.subDescription.replace(/^Dates?:\s*/, "")}` : info.description
}

export function buildLateDescription(inputs: PayrollInputs, lateDeduction = 0): string {
  const info = buildLateRowInfo(inputs, lateDeduction)
  return info.subDescription ? `${info.description} — ${info.subDescription.replace(/^Dates?:\s*/, "")}` : info.description
}

export function buildUndertimeDescription(inputs: PayrollInputs, undertimeDeduction = 0): string {
  const info = buildUndertimeRowInfo(inputs, undertimeDeduction)
  return info.subDescription ? `${info.description} — ${info.subDescription.replace(/^Dates?:\s*/, "")}` : info.description
}

export function buildComputationRows(
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
    result.computationType === "daily" || result.computationType === "daily-no-tax"
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

  const absentInfo = buildAbsentRowInfo(inputs, absentDeduction)
  const lateInfo = buildLateRowInfo(inputs, lateDeduction)
  const undertimeInfo = buildUndertimeRowInfo(inputs, undertimeDeduction)

  pushSection("B. ATTENDANCE DEDUCTIONS")
  push({
    description: absentInfo.description,
    subDescription: absentInfo.subDescription,
    category: "Deduction",
    amount: formatDeductionAmount(absentDeduction),
    rowType: "neutral",
  })
  push({
    description: lateInfo.description,
    subDescription: lateInfo.subDescription,
    category: "Deduction",
    amount: formatDeductionAmount(lateDeduction),
    rowType: "neutral",
  })
  push({
    description: undertimeInfo.description,
    subDescription: undertimeInfo.subDescription,
    category: "Deduction",
    amount: formatDeductionAmount(undertimeDeduction),
    rowType: "neutral",
  })
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
    result.computationType !== "semi-monthly-no-tax" &&
    result.computationType !== "monthly-no-tax" &&
    result.computationType !== "daily-no-tax"

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

  drawOfficialTable(
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
