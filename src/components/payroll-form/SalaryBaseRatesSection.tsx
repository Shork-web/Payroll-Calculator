import { useFormContext } from "react-hook-form"
import { Box, Typography, TextField, useTheme } from "@mui/material"
import { Paid as MoneyIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/lib/schema"

export function SalaryBaseRatesSection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, watch, formState: { errors } } = useFormContext<PayrollFormInput>()

  const computationTypeValue = watch("computationType")
  const numberFieldOptions = { valueAsNumber: true }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "rgba(248, 250, 252, 0.5)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
        <MoneyIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Salary & Base Rates
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        <TextField
          id="monthlyRate"
          label="Monthly Rate"
          type="number"
          size="small"
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
          size="small"
          fullWidth
          disabled={computationTypeValue === "daily" || computationTypeValue === "monthly"}
          slotProps={{
            htmlInput: { step: 1, min: 1, max: 31 },
            inputLabel: { shrink: true }
          }}
          placeholder="Enter working days"
          error={!!errors.workingDays?.message}
          helperText={
            computationTypeValue === "daily" || computationTypeValue === "monthly"
              ? "Automatically calculated from cutoff dates"
              : errors.workingDays?.message
          }
          {...register("workingDays", numberFieldOptions)}
        />
        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontStyle: "italic", fontSize: "0.72rem" }}>
            * Divides monthly rate to get daily rate, which is then used to calculate absent and late rate deductions.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
