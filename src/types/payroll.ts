export interface EmployeeInfo {
  name: string
  position: string
  period: string
  periodStart: string
  periodEnd: string
}

export interface PayrollInputs {
  monthlyRate: number
  /** Working days in the month (user-entered; divides monthly rate for daily rate). */
  workingDays: number
  periodStart: string
  periodEnd: string
  lateMinutes: number
  absentDays: number
  overpayment: number
}

export interface PayrollResult {
  workingDays: number
  /** Weekdays in the pay period (start through end). */
  periodWorkingDays: number
  dailyRate: number
  hourlyRate: number
  perMinRate: number
  /** Semi-monthly base (monthly rate ÷ 2). */
  earned: number
  /** Earned minus absent and late, before premium. */
  total: number
  premium: number
  grossPay: number
  overpayment: number
  overpaymentPremium: number
  absentDeduction: number
  lateDeduction: number
  taxableIncome: number
  tax: number
  totalDeductions: number
  netPay: number
}

export type PayrollFormValues = EmployeeInfo & PayrollInputs
