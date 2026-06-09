import jsPDF from "jspdf"

import { formatPayPeriod } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

const PW = 210
const ML = 20
const RM = PW - ML
const LH = 8

type Doc = InstanceType<typeof jsPDF>

function frac(doc: Doc, cx: number, cy: number, top: string, bot: string, hw: number) {
  doc.text(top, cx, cy - 2.5, { align: "center" })
  doc.line(cx - hw, cy + 0.5, cx + hw, cy + 0.5)
  doc.text(bot, cx, cy + 5.5, { align: "center" })
}

function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Small all-caps gray section label. */
function sectionHead(doc: Doc, label: string, y: number) {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text(label.toUpperCase(), ML, y)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
}

/** Full-width light horizontal rule. */
function fullRule(doc: Doc, y: number) {
  doc.setDrawColor(190, 190, 190)
  doc.setLineWidth(0.25)
  doc.line(ML, y, RM, y)
  doc.setDrawColor(0, 0, 0)
}

/** Short rule spanning only the value column (right side). */
function shortRule(doc: Doc, y: number, double = false) {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  const x1 = RM - 44, x2 = RM + 1
  doc.line(x1, y, x2, y)
  if (double) doc.line(x1, y + 1.8, x2, y + 1.8)
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
  if (opts.gray) doc.setTextColor(110, 110, 110)
  if (opts.bold) doc.setFont("helvetica", "bold")
  doc.text(label, x, y)
  doc.text(value, RM, y, { align: "right" })
  doc.setFont("helvetica", "normal")
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
    total, premium, grossPay,
    overpayment, overpaymentPremium,
    tax, netPay,
  } = result
  const { monthlyRate, workingDays, lateMinutes, absentDays } = inputs

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("COMPUTATION OF SERVICES RENDERED", PW / 2, 22, { align: "center" })
  doc.setFontSize(11)
  doc.text(`For the Period ${period}`, PW / 2, 31, { align: "center" })

  // ── Employee ──────────────────────────────────────────────────────────────
  doc.setFontSize(11)
  doc.text(employee.name.toUpperCase(), ML, 44)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(employee.position, ML, 51)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  fullRule(doc, 57)

  // ── Rate info ─────────────────────────────────────────────────────────────
  const X_CLN  = ML + 43
  const X_HVAL = ML + 48
  const X_MR_R = ML + 90

  doc.text("Monthly Rate (MR)", ML, 64)
  doc.text(":", X_CLN, 64)
  doc.text("PhP", X_HVAL, 64)
  doc.text(n(monthlyRate), X_MR_R, 64, { align: "right" })
  doc.text("+", X_MR_R + 3, 64)
  doc.text("20% Premium on the actual no. of days present", X_MR_R + 9, 64)

  doc.text("Working Days (WD)", ML, 72)
  doc.text(":", X_CLN, 72)
  doc.text(`${workingDays} Days`, X_HVAL, 72)

  fullRule(doc, 78)

  // ── Rate Derivation ───────────────────────────────────────────────────────
  sectionHead(doc, "Rate Derivation", 84)

  const yR = 94
  doc.setFont("helvetica", "italic")
  doc.text(n(dailyRate), ML + 13, yR, { align: "right" })
  doc.text("x", ML + 15, yR)
  frac(doc, ML + 29, yR, "1 day", "8 hrs", 9)
  doc.text("=", ML + 42, yR)
  doc.text(`${n(hourlyRate)}/hr`, ML + 46, yR)
  doc.text("x", ML + 68, yR)
  frac(doc, ML + 82, yR, "1 hr", "60 mins", 11)
  doc.text("=", ML + 97, yR)
  doc.text(`PhP ${n(perMinRate)}/min`, ML + 102, yR)

  fullRule(doc, 107)

  // ── Computation ───────────────────────────────────────────────────────────
  sectionHead(doc, "Computation", 113)
  doc.setFont("helvetica", "normal")

  let y = 121
  // Earned pay
  row(doc, `Earned Pay  (${n(monthlyRate)} ÷ 2)`, n(earned), y)
  y += LH

  // Absent deduction
  if (absentDays > 0) {
    row(doc, `Less: Absent  (${absentDays} day${absentDays !== 1 ? "s" : ""} × ${n(dailyRate)}/day)`,
      `(${n(absentDeduction)})`, y, { indent: true })
    y += LH
  }

  // Late deduction
  if (lateMinutes > 0) {
    row(doc, `Less: Late/Undertime  (${lateMinutes} mins × ${n(perMinRate)}/min)`,
      `(${n(lateDeduction)})`, y, { indent: true })
    y += LH
  }

  // Sub-total
  shortRule(doc, y + 1)
  y += 6
  row(doc, "Sub-total", n(total), y, { gray: true })
  y += LH

  // 20% Premium
  row(doc, `Add: 20% Premium  (${n(total)} × 20%)`, n(premium), y)
  y += LH

  // Gross Pay (before overpayment deduction, matching the visual addition)
  shortRule(doc, y + 1, true)   // double underline = gross
  y += 6
  const displayGross = total + premium
  row(doc, "Gross Pay", n(displayGross), y, { bold: true })
  y += LH

  fullRule(doc, y + 2)
  y += 10

  // ── Deductions from Gross ─────────────────────────────────────────────────
  sectionHead(doc, "Deductions from Gross Pay", y)
  y += 8

  if (tax > 0) {
    row(doc, "Less: Withholding Tax", `(${n(tax)})`, y, { indent: true })
    y += LH
  }
  if (overpayment > 0) {
    row(doc,
      `Less: Overpayment of salary  (${n(overpayment)} + 20% premium)`,
      `(${n(overpayment + overpaymentPremium)})`, y, { indent: true })
    y += LH
  }

  // ── Net Amount ────────────────────────────────────────────────────────────
  shortRule(doc, y + 1)
  y += 8
  doc.setFont("helvetica", "bold")
  doc.text(`Net Amount,  ${period}  :`, ML, y)
  doc.text(n(netPay), RM, y, { align: "right" })
  doc.setLineWidth(0.5)
  doc.rect(RM - 44, y - 5.5, 47, 8)

  // ── Lost Premium Information ──────────────────────────────────────────────
  if (absentDays > 0 || lateMinutes > 0) {
    y += 18
    fullRule(doc, y - 5)
    sectionHead(doc, "Lost Premium (Informational)", y)
    y += 8
    
    const baseLost = absentDeduction + lateDeduction
    const premiumLost = baseLost * 0.20
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(110, 110, 110)
    doc.text("Lost premium amount due to absences/lates", ML, y)
    doc.text(`(${n(premiumLost)})`, RM, y, { align: "right" })
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName   = employee.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  const safePeriod = period.replace(/[^a-z0-9]/gi, "_").toLowerCase()
  doc.save(`payroll_${safeName}_${safePeriod}.pdf`)
}
