import type { PayrollEntry } from "@/features/payroll/types/payroll"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"

export function entryToFormValues(target: PayrollEntry): PayrollFormInput {
  return {
    name: target.employee.name,
    position: target.employee.position,
    periodStart: target.employee.periodStart,
    periodEnd: target.employee.periodEnd,
    monthlyRate: target.inputs.monthlyRate,
    workingDays: target.inputs.workingDays,
    lateMinutes: target.inputs.lateMinutes,
    undertimeMinutes: target.inputs.undertimeMinutes ?? 0,
    absentDays: target.inputs.absentDays,
    overpayment: target.inputs.overpayment,
    underpayment: target.inputs.underpayment ?? 0,
    signatoryName: target.employee.signatoryName || "",
    signatoryTitle: target.employee.signatoryTitle || "",
    payslipSignatoryName: target.employee.payslipSignatoryName || "",
    payslipSignatoryTitle: target.employee.payslipSignatoryTitle || "",
    payslipSignatories: target.employee.payslipSignatories || [
      { label: "Certified Correct:", name: "", title: "" },
    ],
    lateDates: target.inputs.lateDates || "",
    undertimeDates: target.inputs.undertimeDates || "",
    lateIncidents: target.inputs.lateIncidents || [],
    computationType: target.inputs.computationType || "semi-monthly",
    additionalTax: target.inputs.additionalTax ?? 0,
  }
}
