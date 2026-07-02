export interface EmployeeInfo {
  name: string
  position: string
  period: string
  periodStart: string
  periodEnd: string
  signatoryName?: string | undefined
  signatoryTitle?: string | undefined
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
  lateIncidents?: Array<{ date: string; minutes: number; type: "late" | "undertime" }> | undefined
  computationType: "semi-monthly" | "daily"
  additionalTax: number
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
  computationType: "semi-monthly" | "daily"
}


export type PayrollFormValues = EmployeeInfo & PayrollInputs
