"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, type ReactNode } from "react"
import { useForm } from "react-hook-form"

import { formatPayPeriod, getDefaultPayPeriod } from "@/lib/format"
import { computePayroll } from "@/lib/payroll"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import {
  payrollNumericSchema,
  payrollSchema,
  type PayrollFormInput,
  type PayrollSchema,
} from "@/lib/schema"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"

const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300"

const errorClassName = "mt-1 text-sm text-red-600 dark:text-red-400"

const helperClassName = "mt-1 text-xs text-gray-500 dark:text-gray-400"

const deductionsHeadingClassName =
  "col-span-full mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"

function createFormDefaultValues(): PayrollFormInput {
  const period = getDefaultPayPeriod()

  return {
    name: "",
    position: "",
    ...period,
    monthlyRate: 27_000,
    workingDays: "",
    lateMinutes: 0,
    absentDays: 0,
    overpayment: 0,
  }
}

const FORM_DEFAULT_VALUES = createFormDefaultValues()

const resetButtonClassName =
  "mt-6 w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"

const WATCHED_FIELDS = [
  "name",
  "position",
  "periodStart",
  "periodEnd",
  "monthlyRate",
  "workingDays",
  "lateMinutes",
  "absentDays",
  "overpayment",
] as const

export interface PayrollFormProps {
  onCompute: (result: PayrollResult, info: EmployeeInfo, inputs: PayrollInputs) => void
  onReset: () => void
}

export function PayrollForm({ onCompute, onReset }: PayrollFormProps) {
  const {
    register,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PayrollFormInput, unknown, PayrollSchema>({
    resolver: zodResolver(payrollSchema),
    mode: "onChange",
    defaultValues: FORM_DEFAULT_VALUES,
  })

  useEffect(() => {
    const runCompute = () => {
      const values = getValues()
      const numericParsed = payrollNumericSchema.safeParse({
        monthlyRate: values.monthlyRate,
        workingDays: values.workingDays,
        lateMinutes: values.lateMinutes,
        absentDays: values.absentDays,
        overpayment: values.overpayment,
      })

      if (!numericParsed.success) {
        return
      }

      const { name, position, periodStart, periodEnd } = values
      if (!name.trim() || !position.trim() || !periodStart || !periodEnd) {
        return
      }

      const payrollInputs = { ...numericParsed.data, periodStart, periodEnd }
      const period = formatPayPeriod(periodStart, periodEnd)

      onCompute(
        computePayroll(payrollInputs),
        { name, position, period, periodStart, periodEnd },
        payrollInputs,
      )
    }

    runCompute()
    const subscription = watch((_values, { name }) => {
      if (name === undefined || (WATCHED_FIELDS as readonly string[]).includes(name)) {
        runCompute()
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, getValues, onCompute])

  const numberFieldOptions = { valueAsNumber: true }
  const periodStartValue = watch("periodStart")
  const periodEndValue = watch("periodEnd")
  const cutoffWorkingDays =
    periodStartValue &&
      periodEndValue &&
      periodEndValue >= periodStartValue
      ? computeWorkingDaysInRange(periodStartValue, periodEndValue)
      : null

  return (
    <form className="rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-950">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Employee &amp; attendance
      </h2>

      <div className="flex flex-col gap-4">
        <Field
          id="name"
          label="Name"
          error={errors.name?.message}
          input={<input id="name" type="text" className={inputClassName} {...register("name")} />}
        />
        <Field
          id="position"
          label="Position"
          error={errors.position?.message}
          input={
            <input
              id="position"
              type="text"
              className={inputClassName}
              {...register("position")}
            />
          }
        />
        <div>
          <p className={labelClassName}>Pay period</p>
          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="periodStart" className="text-xs text-gray-500 dark:text-gray-400">
                Start date
              </label>
              <input
                id="periodStart"
                type="date"
                className={inputClassName}
                {...register("periodStart")}
              />
              {errors.periodStart?.message ? (
                <p className={errorClassName}>{errors.periodStart.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="periodEnd" className="text-xs text-gray-500 dark:text-gray-400">
                End date
              </label>
              <input
                id="periodEnd"
                type="date"
                className={inputClassName}
                {...register("periodEnd")}
              />
              {errors.periodEnd?.message ? (
                <p className={errorClassName}>{errors.periodEnd.message}</p>
              ) : null}
            </div>
          </div>
          {cutoffWorkingDays !== null ? (
            <p className={helperClassName}>
              Weekdays in this cutoff: {cutoffWorkingDays} (used for earned pay)
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="monthlyRate"
          label="Monthly rate"
          error={errors.monthlyRate?.message}
          input={
            <input
              id="monthlyRate"
              type="number"
              step="any"
              className={inputClassName}
              {...register("monthlyRate", numberFieldOptions)}
            />
          }
        />

        <Field
          id="workingDays"
          label="Working days this month"
          error={errors.workingDays?.message}
          input={
            <input
              id="workingDays"
              type="number"
              step="1"
              min={1}
              max={31}
              placeholder="Enter working days for this month"
              className={inputClassName}
              {...register("workingDays", numberFieldOptions)}
            />
          }
        />
        <p className={helperClassName + " -mt-2 sm:col-span-2"}>
          Divides monthly rate to get daily rate
        </p>

        <p className={deductionsHeadingClassName}>Deductions</p>

        <Field
          id="lateMinutes"
          label="Late / undertime (minutes)"
          error={errors.lateMinutes?.message}
          input={
            <input
              id="lateMinutes"
              type="number"
              step="any"
              className={inputClassName}
              {...register("lateMinutes", numberFieldOptions)}
            />
          }
        />
        <Field
          id="absentDays"
          label="Absent days"
          error={errors.absentDays?.message}
          input={
            <input
              id="absentDays"
              type="number"
              step="any"
              className={inputClassName}
              {...register("absentDays", numberFieldOptions)}
            />
          }
        />
        <div>
          <label htmlFor="overpayment" className={labelClassName}>
            Overpayment
          </label>
          <input
            id="overpayment"
            type="number"
            step="any"
            placeholder="0"
            className={inputClassName}
            {...register("overpayment", numberFieldOptions)}
          />
          <p className={helperClassName}>
            Deducted from gross; 20% premium on overpayment is also deducted
          </p>
          {errors.overpayment?.message ? (
            <p className={errorClassName}>{errors.overpayment.message}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className={resetButtonClassName}
        onClick={() => {
          reset(createFormDefaultValues())
          onReset()
        }}
      >
        Reset
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  input,
}: {
  id: string
  label: string
  error?: string | undefined
  input: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {input}
      {error ? <p className={errorClassName}>{error}</p> : null}
    </div>
  )
}
