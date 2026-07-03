import type { PayrollEntry } from "@/types/payroll"
import { formatPayPeriod } from "@/lib/format"

export function exportPayrollCsv(entries: PayrollEntry[]): void {
  const headers = [
    "Employee Name",
    "Position",
    "Pay Period",
    "Computation Mode",
    "Monthly Rate",
    "Working Days",
    "Period Working Days",
    "Base Pay",
    "Absences (Days)",
    "Absence Deduction",
    "Lates (Mins)",
    "Late Deduction",
    "Undertime (Mins)",
    "Undertime Deduction",
    "Subtotal",
    "20% Premium",
    "Gross Pay",
    "Withholding Tax",
    "Additional Tax",
    "Overpayment Deduction",
    "Total Deductions",
    "Net Pay Due"
  ]

  const rows = entries.map(entry => {
    const { employee, inputs, result } = entry
    const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)
    const modeLabel = result.computationType === "daily"
      ? "Daily"
      : result.computationType === "monthly"
        ? "Monthly"
        : result.computationType === "monthly-no-tax"
          ? "Monthly (No Tax)"
          : result.computationType === "semi-monthly-no-tax"
            ? "Semi-Monthly (No Tax)"
            : "Semi-Monthly"
    
    const displayGross = result.total + result.premium
    const baseTax = Math.max(0, result.tax - (inputs.additionalTax ?? 0))
    const overpaymentTotal = result.overpayment + result.overpaymentPremium
    
    return [
      employee.name,
      employee.position,
      period,
      modeLabel,
      result.computationType === "daily" ? 0 : inputs.monthlyRate,
      inputs.workingDays,
      result.periodWorkingDays,
      result.earned,
      inputs.absentDays,
      result.absentDeduction,
      inputs.lateMinutes,
      result.lateDeduction,
      inputs.undertimeMinutes ?? 0,
      result.undertimeDeduction,
      result.total,
      result.premium,
      displayGross,
      baseTax,
      inputs.additionalTax ?? 0,
      overpaymentTotal,
      result.totalDeductions,
      result.netPay
    ]
  })

  // Format headers and cells with double quotes and escaping
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(v => {
      if (typeof v === "string") {
        return `"${v.replace(/"/g, '""')}"`
      }
      return v
    }).join(","))
  ].join("\n")

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `Payroll_Export_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
