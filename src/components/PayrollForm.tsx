"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
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
  IconButton,
  Stack,
  Divider,
  useTheme,
} from "@mui/material"
import {
  AccountBox as ProfileIcon,
  AssignmentInd as SignatoryIcon,
  Paid as MoneyIcon,
  TrendingDown as DeductionsIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
  Add as AddIcon,
} from "@mui/icons-material"

import { formatPayPeriod, getDefaultPayPeriod } from "@/lib/format"
import { computePayroll } from "@/lib/payroll"
import { computeWorkingDaysInRange, getMonthFromDateString, computeWeekdaysInMonth } from "@/lib/workingDays"
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
    computationType: "semi-monthly",
    additionalTax: 0,
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
  "computationType",
  "additionalTax",
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
    setValue,
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

  const computationTypeValue = watch("computationType")
  const periodStartValue = watch("periodStart")

  useEffect(() => {
    if (computationTypeValue === "daily" && periodStartValue) {
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
        additionalTax: values.additionalTax,
      })

      if (!numericParsed.success) {
        return
      }

      const { name, position, periodStart, periodEnd, signatoryName, signatoryTitle, computationType } = values
      if (!name.trim() || !position.trim() || !periodStart || !periodEnd) {
        return
      }

      const payrollInputs = {
        ...numericParsed.data,
        periodStart,
        periodEnd,
        lateDates: computedLateDates,
        undertimeDates: computedUndertimeDates,
        lateIncidents: typedIncidents,
        computationType: computationType || "semi-monthly",
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
  const periodEndValue = watch("periodEnd")
  const cutoffWorkingDays =
    periodStartValue &&
      periodEndValue &&
      periodEndValue >= periodStartValue
      ? computeWorkingDaysInRange(periodStartValue, periodEndValue)
      : null

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 4 },
        borderRadius: 4,
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "background.paper",
        backdropFilter: "blur(8px)",
        boxShadow: mode === "dark" ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 4,
          fontWeight: 800,
          color: mode === "dark" ? "#6ee7b7" : "#047857",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          letterSpacing: -0.5,
        }}
      >
        <ProfileIcon sx={{ fontSize: 32 }} />
        Payroll Configuration
      </Typography>

      <Stack spacing={4}>
        {/* SECTION 1: EMPLOYEE PROFILE & CUTOFF */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            borderLeft: `5px solid ${mode === "dark" ? "#34d399" : "#059669"}`,
            bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(248,250,252,0.5)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: mode === "dark" ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.3)",
              boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.02)",
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <ProfileIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Employee Profile & Cutoff
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                id="name"
                label="Employee Name"
                fullWidth
                error={!!errors.name?.message}
                helperText={errors.name?.message}
                {...register("name")}
              />
              <TextField
                id="position"
                label="Position / Designation"
                fullWidth
                error={!!errors.position?.message}
                helperText={errors.position?.message}
                {...register("position")}
              />
            </Box>
            
            <TextField
              id="computationType"
              select
              label="Computation Mode"
              fullWidth
              error={!!errors.computationType?.message}
              helperText={errors.computationType?.message}
              {...register("computationType")}
            >
              <MenuItem value="semi-monthly">Semi-Monthly Computation (Fixed Base)</MenuItem>
              <MenuItem value="daily">Daily Computation (Daily Rate × Period Days)</MenuItem>
            </TextField>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Pay Period Dates
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  id="periodStart"
                  label="Start Date"
                  type="date"
                  fullWidth
                  slotProps={{ htmlInput: { ...register("periodStart") } }}
                  error={!!errors.periodStart?.message}
                  helperText={errors.periodStart?.message}
                />
                <TextField
                  id="periodEnd"
                  label="End Date"
                  type="date"
                  fullWidth
                  slotProps={{ htmlInput: { ...register("periodEnd") } }}
                  error={!!errors.periodEnd?.message}
                  helperText={errors.periodEnd?.message}
                />
              </Box>
              {cutoffWorkingDays !== null && (
                <Typography variant="caption" sx={{ mt: 1.5, display: "block", color: mode === "dark" ? "#6ee7b7" : "#047857", fontWeight: 600 }}>
                  Weekdays in this cutoff: {cutoffWorkingDays} (used for daily base pay calculations)
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* SECTION 2: AUTHORIZED SIGNATORY */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            borderLeft: `5px solid ${mode === "dark" ? "#34d399" : "#059669"}`,
            bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(248,250,252,0.5)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: mode === "dark" ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.3)",
              boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.02)",
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <SignatoryIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Authorized Signatory
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
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
              label="Designation / Title"
              fullWidth
              error={!!errors.signatoryTitle?.message}
              helperText={errors.signatoryTitle?.message}
              {...register("signatoryTitle")}
            />
          </Box>
        </Box>

        {/* SECTION 3: SALARY & BASE RATES */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            borderLeft: `5px solid ${mode === "dark" ? "#34d399" : "#059669"}`,
            bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(248,250,252,0.5)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: mode === "dark" ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.3)",
              boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.02)",
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <MoneyIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Salary & Base Rates
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <TextField
              id="monthlyRate"
              label="Monthly Rate"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { step: "any" } }}
              error={!!errors.monthlyRate?.message}
              helperText={errors.monthlyRate?.message}
              {...register("monthlyRate", numberFieldOptions)}
            />
            <TextField
              id="workingDays"
              label="Working Days in Month"
              type="number"
              fullWidth
              disabled={computationTypeValue === "daily"}
              slotProps={{ htmlInput: { step: 1, min: 1, max: 31 } }}
              placeholder="Enter working days"
              error={!!errors.workingDays?.message}
              helperText={
                computationTypeValue === "daily"
                  ? "Automatically calculated from cutoff dates"
                  : errors.workingDays?.message
              }
              {...register("workingDays", numberFieldOptions)}
            />
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontStyle: "italic" }}>
                * Divides monthly rate to get daily rate, which is then used to calculate absent and late rate deductions.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* SECTION 4: ATTENDANCE ADJUSTMENTS & LOGS */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            borderLeft: `5px solid ${mode === "dark" ? "#34d399" : "#059669"}`,
            bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(248,250,252,0.5)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: mode === "dark" ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.3)",
              boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.02)",
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <DeductionsIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Attendance Adjustments & Deductions
            </Typography>
          </Box>

          <Stack spacing={3.5}>
            {/* LATE / UNDERTIME LOG */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary" }}>
                  Late Incidents / Undertime Log
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => append({ minutes: 0, date: "", type: "late" })}
                  sx={{
                    fontSize: "0.75rem",
                    borderRadius: 2,
                    fontWeight: 600,
                    borderColor: mode === "dark" ? "#34d399" : "#059669",
                    color: mode === "dark" ? "#6ee7b7" : "#059669",
                    "&:hover": {
                      borderColor: mode === "dark" ? "#6ee7b7" : "#047857",
                      bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                    }
                  }}
                >
                  Add Log Entry
                </Button>
              </Box>

              {fields.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: "center",
                    borderStyle: "dashed",
                    borderRadius: 2.5,
                    borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                    bgcolor: "transparent"
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                    No late or undertime incidents logged. Click &quot;Add Log Entry&quot; to record details.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {fields.map((field, index) => (
                    <Paper
                      key={field.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "background.paper",
                        display: "flex",
                        gap: 2,
                        alignItems: "flex-end",
                        flexDirection: { xs: "column", sm: "row" }
                      }}
                    >
                      <Box sx={{ flex: 1, width: "100%" }}>
                        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>Date/Day</Typography>
                        <TextField
                          size="small"
                          placeholder="e.g. June 4"
                          fullWidth
                          error={!!errors.lateIncidents?.[index]?.date?.message}
                          helperText={errors.lateIncidents?.[index]?.date?.message}
                          {...register(`lateIncidents.${index}.date` as const)}
                        />
                      </Box>
                      <Box sx={{ width: { xs: "100%", sm: 140 } }}>
                        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>Type</Typography>
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
                      <Box sx={{ width: { xs: "100%", sm: 100 } }}>
                        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>Minutes</Typography>
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
                        sx={{
                          color: "error.main",
                          border: 1,
                          borderColor: "error.light",
                          borderRadius: 2,
                          p: 0.75,
                          mb: 0.5,
                          alignSelf: { xs: "flex-end", sm: "auto" },
                          "&:hover": {
                            bgcolor: "error.light",
                            color: "white"
                          }
                        }}
                        title="Remove incident"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* DEDUCTIONS GRID */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                id="absentDays"
                label="Absent Days"
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
                <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary", fontSize: "0.7rem", lineHeight: 1.2 }}>
                  * Deducted from gross pay (with 20% premium surcharge).
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
                <TextField
                  id="additionalTax"
                  label="Additional Tax"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: "any" } }}
                  placeholder="0"
                  error={!!errors.additionalTax?.message}
                  helperText={errors.additionalTax?.message}
                  {...register("additionalTax", numberFieldOptions)}
                />
                <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary", fontSize: "0.7rem", lineHeight: 1.2 }}>
                  * Added directly to the calculated 5% withholding tax deduction.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Stack>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<ResetIcon />}
        sx={{
          mt: 4,
          p: 1.5,
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
  )
}
