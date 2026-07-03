"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import {
  Typography,
  Button,
  Paper,
  Stack,
  useTheme,
} from "@mui/material"
import {
  AccountBox as ProfileIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material"

import { formatPayPeriod, getDefaultPayPeriod } from "@/lib/format"
import { computePayroll } from "@/lib/payroll"
import { getMonthFromDateString, computeWeekdaysInMonth } from "@/lib/workingDays"
import {
  payrollNumericSchema,
  payrollSchema,
  type PayrollFormInput,
  type PayrollSchema,
} from "@/lib/schema"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

import { EmployeeProfileSection } from "./payroll-form/EmployeeProfileSection"
import { AuthorizedSignatorySection } from "./payroll-form/AuthorizedSignatorySection"
import { PayslipSignatorySection } from "./payroll-form/PayslipSignatorySection"
import { SalaryBaseRatesSection } from "./payroll-form/SalaryBaseRatesSection"
import { AttendanceAdjustmentsSection } from "./payroll-form/AttendanceAdjustmentsSection"
import { DeductionsTaxSection } from "./payroll-form/DeductionsTaxSection"

function createFormDefaultValues(): PayrollFormInput {
  const period = getDefaultPayPeriod()

  return {
    name: "",
    position: "",
    ...period,
    monthlyRate: 27_000,
    workingDays: "",
    lateMinutes: 0,
    undertimeMinutes: 0,
    absentDays: 0,
    overpayment: 0,
    signatoryName: "",
    signatoryTitle: "",
    payslipSignatoryName: "",
    payslipSignatoryTitle: "",
    payslipSignatories: [
      { label: "Certified Correct:", name: "", title: "" }
    ],
    lateDates: "",
    undertimeDates: "",
    lateIncidents: [],
    computationType: "semi-monthly",
    additionalTax: 0,
    additionalTaxDate: "",
    additionalTaxReason: "",
  }
}

const FORM_DEFAULT_VALUES = createFormDefaultValues()

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
  "signatoryName",
  "signatoryTitle",
  "payslipSignatoryName",
  "payslipSignatoryTitle",
  "payslipSignatories",
  "lateDates",
  "computationType",
  "additionalTax",
  "additionalTaxDate",
  "additionalTaxReason",
] as const

export interface PayrollFormProps {
  onCompute: (result: PayrollResult, info: EmployeeInfo, inputs: PayrollInputs) => void
  onReset: () => void
  editValues?: PayrollFormInput | null
}

export function PayrollForm({ onCompute, onReset, editValues = null }: PayrollFormProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  const methods = useForm<PayrollFormInput, unknown, PayrollSchema>({
    resolver: zodResolver(payrollSchema),
    mode: "onChange",
    defaultValues: FORM_DEFAULT_VALUES,
  })

  const {
    watch,
    reset,
    setValue,
    getValues,
  } = methods

  useEffect(() => {
    if (editValues) {
      reset(editValues)
    } else {
      reset(FORM_DEFAULT_VALUES)
    }
  }, [editValues, reset])

  const computationTypeValue = watch("computationType")
  const periodStartValue = watch("periodStart")

  useEffect(() => {
    if ((computationTypeValue === "daily" || computationTypeValue === "monthly") && periodStartValue) {
      const { year, month } = getMonthFromDateString(periodStartValue)
      if (year > 0) {
        const weekdays = computeWeekdaysInMonth(year, month)
        setValue("workingDays", weekdays, { shouldValidate: true })
      }
    }
  }, [computationTypeValue, periodStartValue, setValue])

  useEffect(() => {
    const runCompute = () => {
      const values = getValues()
      const rawIncidents = values.lateIncidents || []
      const typedIncidents = rawIncidents
        .filter(item => {
          const isTimeType = item.type === "late" || item.type === "undertime" || !item.type
          const isAbsentType = item.type === "absent"
          return (
            item.date?.trim() &&
            ((isTimeType && Number(item.minutes) > 0) || (isAbsentType && Number(item.days) > 0))
          )
        })
        .map(item => ({
          date: item.date,
          minutes: item.type === "absent" ? 0 : Number(item.minutes) || 0,
          days: item.type === "absent" ? Number(item.days) || 0 : 0,
          type: (item.type || "late") as "late" | "undertime" | "absent",
        }))

      const lateIncidentsOnly = typedIncidents.filter(item => item.type === "late")
      const undertimeIncidentsOnly = typedIncidents.filter(item => item.type === "undertime")
      const absentIncidentsOnly = typedIncidents.filter(item => item.type === "absent")

      const totalLateMinutes = lateIncidentsOnly.reduce((sum, item) => sum + item.minutes, 0)
      const totalUndertimeMinutes = undertimeIncidentsOnly.reduce((sum, item) => sum + item.minutes, 0)
      const totalAbsentDays = absentIncidentsOnly.reduce((sum, item) => sum + item.days, 0)

      const computedLateDates = lateIncidentsOnly
        .map(item => `${item.date} (${item.minutes}m)`)
        .join(", ")

      const computedUndertimeDates = undertimeIncidentsOnly
        .map(item => `${item.date} (${item.minutes}m)`)
        .join(", ")

      const computedAbsentDates = absentIncidentsOnly
        .map(item => `${item.date} (${item.days}d)`)
        .join(", ")

      const numericParsed = payrollNumericSchema.safeParse({
        monthlyRate: values.monthlyRate,
        workingDays: values.workingDays,
        lateMinutes: totalLateMinutes,
        undertimeMinutes: totalUndertimeMinutes,
        absentDays: totalAbsentDays,
        overpayment: values.overpayment,
        additionalTax: values.additionalTax,
        additionalTaxDate: values.additionalTaxDate,
        additionalTaxReason: values.additionalTaxReason,
      })

      if (!numericParsed.success) {
        return
      }

      const { name, position, periodStart, periodEnd, signatoryName, signatoryTitle, payslipSignatoryName, payslipSignatoryTitle, payslipSignatories, computationType } = values
      if (!name.trim() || !position.trim() || !periodStart || !periodEnd) {
        return
      }

      const payrollInputs = {
        ...numericParsed.data,
        periodStart,
        periodEnd,
        lateDates: computedLateDates,
        undertimeDates: computedUndertimeDates,
        absentDates: computedAbsentDates,
        lateIncidents: typedIncidents,
        computationType: computationType || "semi-monthly",
      }
      const period = formatPayPeriod(periodStart, periodEnd)

      const formattedPayslipSignatories = (payslipSignatories || []).map(s => ({
        label: s.label || "",
        name: s.name || "",
        title: s.title || ""
      }))

      onCompute(
        computePayroll(payrollInputs),
        {
          name,
          position,
          period,
          periodStart,
          periodEnd,
          signatoryName,
          signatoryTitle,
          payslipSignatoryName,
          payslipSignatoryTitle,
          payslipSignatories: formattedPayslipSignatories
        },
        payrollInputs,
      )
    }

    runCompute()
    const subscription = watch((_values, { name }) => {
      if (
        name === undefined ||
        (WATCHED_FIELDS as readonly string[]).includes(name) ||
        name.startsWith("lateIncidents") ||
        name.startsWith("payslipSignatories")
      ) {
        runCompute()
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, getValues, onCompute])

  return (
    <FormProvider {...methods}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 4,
          border: 1,
          borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "background.paper",
          backdropFilter: "blur(8px)",
          boxShadow: mode === "dark" ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2.5,
            fontWeight: 800,
            color: mode === "dark" ? "#6ee7b7" : "#047857",
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            letterSpacing: -0.5,
          }}
        >
          <ProfileIcon sx={{ fontSize: 26 }} />
          Payroll Configuration
        </Typography>

        <Stack spacing={2.5}>
          <EmployeeProfileSection />
          <AuthorizedSignatorySection />
          <PayslipSignatorySection />
          <SalaryBaseRatesSection />
          <AttendanceAdjustmentsSection />
          <DeductionsTaxSection />
        </Stack>

        <Button
          variant="outlined"
          fullWidth
          startIcon={<ResetIcon />}
          sx={{
            mt: 2.5,
            p: 1,
            borderRadius: 3,
            borderWidth: 2,
            fontWeight: 800,
            color: mode === "dark" ? "#6ee7b7" : "#059669",
            borderColor: mode === "dark" ? "#047857" : "#059669",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: "0.85rem",
            transition: "all 0.3s ease",
            "&:hover": {
              borderWidth: 2,
              borderColor: mode === "dark" ? "#34d399" : "#047857",
              bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.06)" : "rgba(5, 150, 105, 0.05)",
              boxShadow: mode === "dark" ? "0 4px 15px rgba(52,211,153,0.1)" : "0 4px 15px rgba(5,150,105,0.06)",
            }
          }}
          onClick={() => {
            reset(createFormDefaultValues())
            onReset()
          }}
        >
          Reset Form Parameters
        </Button>
      </Paper>
    </FormProvider>
  )
}
