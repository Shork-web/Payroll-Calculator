import { z } from "zod"

import { estimateGrossPay, estimateMaxOverpayment } from "@/lib/payroll"
import { formatPeso } from "@/lib/format"

const coerceFormNumber = () =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return 0
    }
    const num = typeof value === "number" ? value : Number(value)
    return Number.isNaN(num) ? 0 : num
  }, z.number())

const overpaymentField = coerceFormNumber().pipe(z.number().min(0))

const workingDaysField = coerceFormNumber().pipe(
  z
    .number()
    .int("Must be a whole number")
    .min(1, "Working days is required")
    .max(31, "Cannot exceed 31"),
)

export const payrollNumericSchema = z.object({
  monthlyRate: coerceFormNumber().pipe(z.number().positive("Must be greater than 0")),
  workingDays: workingDaysField,
  lateMinutes: coerceFormNumber().pipe(z.number().min(0)),
  undertimeMinutes: coerceFormNumber().pipe(z.number().min(0)),
  absentDays: coerceFormNumber().pipe(z.number().min(0)),
  overpayment: overpaymentField,
  additionalTax: coerceFormNumber().pipe(z.number().min(0)),
})

const lateIncidentSchema = z.object({
  minutes: coerceFormNumber().pipe(z.number().min(0)),
  date: z.string().min(1, "Date/Day is required"),
  type: z.enum(["late", "undertime"]).default("late"),
})

export const payrollSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    position: z.string().min(1, "Position is required"),
    periodStart: z.string().min(1, "Start date is required"),
    periodEnd: z.string().min(1, "End date is required"),
    monthlyRate: coerceFormNumber().pipe(z.number().positive("Must be greater than 0")),
    workingDays: workingDaysField,
    lateMinutes: coerceFormNumber().pipe(z.number().min(0)),
    undertimeMinutes: coerceFormNumber().pipe(z.number().min(0)),
    absentDays: coerceFormNumber().pipe(z.number().min(0)),
    overpayment: overpaymentField,
    signatoryName: z.string().default(""),
    signatoryTitle: z.string().default(""),
    lateDates: z.string().optional().default(""),
    undertimeDates: z.string().optional().default(""),
    lateIncidents: z.array(lateIncidentSchema).default([]),
    computationType: z.enum(["semi-monthly", "daily", "monthly"]).default("semi-monthly"),
    additionalTax: coerceFormNumber().pipe(z.number().min(0)),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "End date must be on or after start date",
    path: ["periodEnd"],
  })
  .superRefine((data, ctx) => {
    const maxOverpayment = estimateMaxOverpayment(
      data.monthlyRate,
      data.computationType,
      data.workingDays,
      data.periodStart,
      data.periodEnd
    )

    if (data.overpayment > maxOverpayment) {
      const label =
        data.computationType === "daily"
          ? "daily earned"
          : data.computationType === "monthly"
            ? "monthly earned"
            : "semi-monthly earned"
      ctx.addIssue({
        code: "custom",
        message: `Overpayment cannot exceed ${label} plus premium (${formatPeso(maxOverpayment)})`,
        path: ["overpayment"],
      })
    }

    if (data.overpayment > 0) {
      const grossPay = estimateGrossPay(data)
      if (grossPay < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Overpayment and 20% premium on overpayment exceed allowable gross",
          path: ["overpayment"],
        })
      }
    }
  })

export type PayrollFormInput = z.input<typeof payrollSchema>
export type PayrollSchema = z.output<typeof payrollSchema>
