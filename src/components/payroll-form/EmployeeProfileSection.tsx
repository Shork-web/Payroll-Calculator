import { useFormContext, Controller } from "react-hook-form"
import { Box, Typography, TextField, MenuItem, useTheme } from "@mui/material"
import { AccountBox as ProfileIcon } from "@mui/icons-material"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import type { PayrollFormInput } from "@/lib/schema"

export function EmployeeProfileSection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, control, watch, formState: { errors } } = useFormContext<PayrollFormInput>()

  const periodStartValue = watch("periodStart")
  const periodEndValue = watch("periodEnd")

  const cutoffWorkingDays =
    periodStartValue &&
    periodEndValue &&
    periodEndValue >= periodStartValue
      ? computeWorkingDaysInRange(periodStartValue, periodEndValue)
      : null

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        borderLeft: `5px solid ${mode === "dark" ? "#34d399" : "#059669"}`,
        bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(15, 23, 42, 0.025)",
        transition: "all 0.3s ease",
        "&:hover": {
          borderColor: mode === "dark" ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.3)",
          boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.15)" : "0 4px 20px rgba(0,0,0,0.02)",
        }
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
        <ProfileIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Employee Profile & Cutoff
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            id="name"
            label="Employee Name"
            size="small"
            fullWidth
            error={!!errors.name?.message}
            helperText={errors.name?.message}
            {...register("name")}
          />
          <TextField
            id="position"
            label="Position / Designation"
            size="small"
            fullWidth
            error={!!errors.position?.message}
            helperText={errors.position?.message}
            {...register("position")}
          />
        </Box>
        
        <Controller
          name="computationType"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id="computationType"
              select
              label="Computation Mode"
              size="small"
              fullWidth
              error={!!errors.computationType?.message}
              helperText={errors.computationType?.message}
            >
              <MenuItem value="semi-monthly">Semi-Monthly Computation (Fixed Base)</MenuItem>
              <MenuItem value="semi-monthly-no-tax">Semi-Monthly No Tax (Fixed Base, No Tax Deductions)</MenuItem>
              <MenuItem value="daily">Daily Computation (Daily Rate × Period Days)</MenuItem>
              <MenuItem value="monthly">Monthly Computation (Full Month)</MenuItem>
            </TextField>
          )}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.8, fontWeight: 600, color: "text.secondary", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Pay Period Dates
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField
              id="periodStart"
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              slotProps={{ htmlInput: { ...register("periodStart") } }}
              error={!!errors.periodStart?.message}
              helperText={errors.periodStart?.message}
            />
            <TextField
              id="periodEnd"
              label="End Date"
              type="date"
              size="small"
              fullWidth
              slotProps={{ htmlInput: { ...register("periodEnd") } }}
              error={!!errors.periodEnd?.message}
              helperText={errors.periodEnd?.message}
            />
          </Box>
          {cutoffWorkingDays !== null && (
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: mode === "dark" ? "#6ee7b7" : "#047857", fontWeight: 600, fontSize: "0.72rem" }}>
              Weekdays in this cutoff: {cutoffWorkingDays} (used for daily base pay calculations)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
