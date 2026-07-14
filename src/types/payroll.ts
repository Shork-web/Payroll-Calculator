export interface EmployeeInfo {
  name: string
  position: string
  period: string
  periodStart: string
  periodEnd: string
  signatoryName?: string | undefined
  signatoryTitle?: string | undefined
  payslipSignatoryName?: string | undefined
  payslipSignatoryTitle?: string | undefined
  payslipSignatories?: Signatory[] | undefined
}

export interface PayrollInputs {
  monthlyRate: number
  /** Working days in the month (user-entered; divides monthly rate for daily rate). */
  workingDays: number
  periodStart: string
  periodEnd: string
  lateMinutes: number
  undertimeMinutes?: number | undefined
  absentDays: number
  overpayment: number
  lateDates?: string | undefined
  undertimeDates?: string | undefined
  absentDates?: string | undefined
  lateIncidents?: Array<{ date: string; minutes: number; type: "late" | "undertime" | "absent"; days?: number }> | undefined
  computationType: "semi-monthly" | "daily" | "monthly" | "semi-monthly-no-tax" | "monthly-no-tax"
  additionalTax: number
  additionalTaxDate?: string | undefined
  additionalTaxReason?: string | undefined
}


export interface PayrollResult {
  workingDays: number
  /** Weekdays in the pay period (start through end). */
  periodWorkingDays: number
  dailyRate: number
  hourlyRate: number
  perMinRate: number
  /** Semi-monthly base (monthly rate ÷ 2) or daily-rate base. */
  earned: number
  /** Earned minus absent, late, and undertime, before premium. */
  total: number
  premium: number
  grossPay: number
  overpayment: number
  overpaymentPremium: number
  absentDeduction: number
  lateDeduction: number
  undertimeDeduction: number
  taxableIncome: number
  tax: number
  totalDeductions: number
  netPay: number
  computationType: "semi-monthly" | "daily" | "monthly" | "semi-monthly-no-tax" | "monthly-no-tax"
  exemptionLimit: number
}


export type PayrollFormValues = EmployeeInfo & PayrollInputs

export interface Signatory {
  label: string
  name: string
  title: string
}

export interface PayrollEntry {
  id: string
  employee: EmployeeInfo
  inputs: PayrollInputs
  result: PayrollResult
}

export interface DtrDayLog {
  day: number
  dayName: string
  amIn: string
  amOut: string
  pmIn: string
  pmOut: string
  status:
    | "regular"
    | "absent"
    | "weekend"
    | "holiday"
    | "leave"
    | "ob"
    | "special"
    | "leave-vl"
    | "leave-fl"
    | "leave-sl"
    | "leave-ml"
    | "leave-pl"
    | "leave-spl"
    | "leave-mc"
    | "leave-vawc"
    | "leave-slp"
    | "leave-wl"
    | "leave-sel"
    | "leave-rl"
    | "leave-stl"
    | "leave-cto"
    | "leave-cto-am"
    | "leave-cto-pm"
    | "leave-wlcos"
  lateMinutes: number
  undertimeMinutes: number
  location?: string
  specialNote?: string
}
