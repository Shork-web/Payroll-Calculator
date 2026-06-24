"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, type ReactNode } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import {
  Box,
  TextField,
  Typography,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Grid,
  Stack,
  Divider,
  useTheme,
} from "@mui/material"
import { Delete as DeleteIcon } from "@mui/icons-material"

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
    lateDates: "",
    undertimeDates: "",
    lateIncidents: [],
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
  "lateDates",
] as const

export interface PayrollFormProps {
  onCompute: (result: PayrollResult, info: EmployeeInfo, inputs: PayrollInputs) => void
  onReset: () => void
}

export function PayrollForm({ onCompute, onReset }: PayrollFormProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  const {
    register,
    control,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PayrollFormInput, unknown, PayrollSchema>({
    resolver: zodResolver(payrollSchema),
    mode: "onChange",
    defaultValues: FORM_DEFAULT_VALUES,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lateIncidents",
  })

  useEffect(() => {
    const runCompute = () => {
      const values = getValues()
      const rawIncidents = values.lateIncidents || []
      const typedIncidents = rawIncidents
        .filter(item => item.date?.trim() && Number(item.minutes) > 0)
        .map(item => ({
          date: item.date,
          minutes: Number(item.minutes) || 0,
          type: (item.type || "late") as "late" | "undertime",
        }))

      const lateIncidentsOnly = typedIncidents.filter(item => item.type === "late")
      const undertimeIncidentsOnly = typedIncidents.filter(item => item.type === "undertime")

      const totalLateMinutes = lateIncidentsOnly.reduce((sum, item) => sum + item.minutes, 0)
      const totalUndertimeMinutes = undertimeIncidentsOnly.reduce((sum, item) => sum + item.minutes, 0)

      const computedLateDates = lateIncidentsOnly
        .map(item => `${item.date} (${item.minutes}m)`)
        .join(", ")

      const computedUndertimeDates = undertimeIncidentsOnly
        .map(item => `${item.date} (${item.minutes}m)`)
        .join(", ")

      const numericParsed = payrollNumericSchema.safeParse({
        monthlyRate: values.monthlyRate,
        workingDays: values.workingDays,
        lateMinutes: totalLateMinutes,
        undertimeMinutes: totalUndertimeMinutes,
        absentDays: values.absentDays,
        overpayment: values.overpayment,
      })

      if (!numericParsed.success) {
        return
      }

      const { name, position, periodStart, periodEnd, signatoryName, signatoryTitle } = values
      if (!name.trim() || !position.trim() || !periodStart || !periodEnd) {
        return
      }

      const payrollInputs = {
        ...numericParsed.data,
        periodStart,
        periodEnd,
        lateDates: computedLateDates,
        undertimeDates: computedUndertimeDates,
        lateIncidents: typedIncidents
      }
      const period = formatPayPeriod(periodStart, periodEnd)

      onCompute(
        computePayroll(payrollInputs),
        { name, position, period, periodStart, periodEnd, signatoryName, signatoryTitle },
        payrollInputs,
      )
    }

    runCompute()
    const subscription = watch((_values, { name }) => {
      if (
        name === undefined ||
        (WATCHED_FIELDS as readonly string[]).includes(name) ||
        name.startsWith("lateIncidents")
      ) {
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
    <Paper sx={{ p: 3, elevation: 2 }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Employee &amp; attendance
      </Typography>

      <Stack spacing={3}>
        <TextField
          id="name"
          label="Name"
          fullWidth
          error={!!errors.name?.message}
          helperText={errors.name?.message}
          {...register("name")}
        />
        <TextField
          id="position"
          label="Position"
          fullWidth
          error={!!errors.position?.message}
          helperText={errors.position?.message}
          {...register("position")}
        />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Pay period</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <TextField
                id="periodStart"
                label="Start date"
                type="date"
                fullWidth
                slotProps={{ htmlInput: { ...register("periodStart") } }}
                error={!!errors.periodStart?.message}
                helperText={errors.periodStart?.message}
              />
            </Box>
            <Box>
              <TextField
                id="periodEnd"
                label="End date"
                type="date"
                fullWidth
                slotProps={{ htmlInput: { ...register("periodEnd") } }}
                error={!!errors.periodEnd?.message}
                helperText={errors.periodEnd?.message}
              />
            </Box>
          </Box>
          {cutoffWorkingDays !== null && (
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
              Weekdays in this cutoff: {cutoffWorkingDays} (used for earned pay)
            </Typography>
          )}
        </Box>

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1 }}>
          Signatory
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField
            id="signatoryName"
            label="Signatory Name"
            fullWidth
            error={!!errors.signatoryName?.message}
            helperText={errors.signatoryName?.message}
            {...register("signatoryName")}
          />
          <TextField
            id="signatoryTitle"
            label="Designation"
            fullWidth
            error={!!errors.signatoryTitle?.message}
            helperText={errors.signatoryTitle?.message}
            {...register("signatoryTitle")}
          />
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          id="monthlyRate"
          label="Monthly rate"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { step: "any" } }}
          error={!!errors.monthlyRate?.message}
          helperText={errors.monthlyRate?.message}
          {...register("monthlyRate", numberFieldOptions)}
        />

        <TextField
          id="workingDays"
          label="Working days this month"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { step: 1, min: 1, max: 31 } }}
          placeholder="Enter working days for this month"
          error={!!errors.workingDays?.message}
          helperText={errors.workingDays?.message}
          {...register("workingDays", numberFieldOptions)}
        />
        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Divides monthly rate to get daily rate
          </Typography>
        </Box>

        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1, mt: 2 }}>
            Deductions
          </Typography>
        </Box>

        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "grey.50" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Late Incidents / Undertime Log
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => append({ minutes: 0, date: "", type: "late" })}
                sx={{ fontSize: "0.75rem" }}
              >
                + Add Incident
              </Button>
            </Box>

            {fields.length === 0 ? (
              <Typography variant="caption" sx={{ display: "block", textAlign: "center", py: 2, fontStyle: "italic", color: "text.secondary" }}>
                No late incidents logged. Click &quot;+ Add Incident&quot; to log one.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {fields.map((field, index) => (
                  <Box key={field.id} sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>Date/Day</Typography>
                      <TextField
                        size="small"
                        placeholder="e.g. June 4"
                        fullWidth
                        error={!!errors.lateIncidents?.[index]?.date?.message}
                        helperText={errors.lateIncidents?.[index]?.date?.message}
                        {...register(`lateIncidents.${index}.date` as const)}
                      />
                    </Box>
                    <Box sx={{ width: 120 }}>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>Type</Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          {...register(`lateIncidents.${index}.type` as const)}
                          error={!!errors.lateIncidents?.[index]?.type?.message}
                        >
                          <MenuItem value="late">Late</MenuItem>
                          <MenuItem value="undertime">Undertime</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ width: 90 }}>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>Minutes</Typography>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="0"
                        fullWidth
                        error={!!errors.lateIncidents?.[index]?.minutes?.message}
                        helperText={errors.lateIncidents?.[index]?.minutes?.message}
                        {...register(`lateIncidents.${index}.minutes` as const, numberFieldOptions)}
                      />
                    </Box>
                    <IconButton
                      onClick={() => remove(index)}
                      sx={{ mb: 0.5, color: "error.main" }}
                      title="Remove incident"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
        <TextField
          id="absentDays"
          label="Absent days"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { step: "any" } }}
          error={!!errors.absentDays?.message}
          helperText={errors.absentDays?.message}
          {...register("absentDays", numberFieldOptions)}
        />
        <Box>
          <TextField
            id="overpayment"
            label="Overpayment"
            type="number"
            fullWidth
            slotProps={{ htmlInput: { step: "any" } }}
            placeholder="0"
            error={!!errors.overpayment?.message}
            helperText={errors.overpayment?.message}
            {...register("overpayment", numberFieldOptions)}
          />
          <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
            Deducted from gross; 20% premium on overpayment is also deducted
          </Typography>
        </Box>
      </Box>

      <Button
        variant="outlined"
        fullWidth
        sx={{ mt: 3 }}
        onClick={() => {
          reset(createFormDefaultValues())
          onReset()
        }}
      >
        Reset
      </Button>
    </Paper>
  )
}
