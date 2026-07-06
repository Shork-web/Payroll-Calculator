import { useFormContext, Controller } from "react-hook-form"
import { Box, Typography, TextField, MenuItem, useTheme, Autocomplete, IconButton } from "@mui/material"
import { AccountBox as ProfileIcon, Close as CloseIcon } from "@mui/icons-material"
import { computeWorkingDaysInRange } from "@/lib/workingDays"
import type { PayrollFormInput } from "@/lib/schema"
import type { SavedEmployee } from "@/lib/db"

interface EmployeeProfileSectionProps {
  savedEmployees?: SavedEmployee[]
  onDeleteEmployee?: ((id: string) => Promise<void>) | undefined
}

export function EmployeeProfileSection({ savedEmployees = [], onDeleteEmployee }: EmployeeProfileSectionProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<PayrollFormInput>()

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
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "rgba(248, 250, 252, 0.5)",
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
          <Controller
            name="name"
            control={control}
            render={({ field: { ref, onChange, ...field } }) => (
              <Autocomplete
                {...field}
                freeSolo
                options={savedEmployees}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option
                  return option.name
                }}
                onChange={(_event, value) => {
                  if (typeof value === "string") {
                    onChange(value)
                  } else if (value && typeof value === "object") {
                    onChange(value.name)
                    // Auto-fill other fields
                    if (value.position) setValue("position", value.position, { shouldValidate: true })
                    if (value.monthlyRate) setValue("monthlyRate", value.monthlyRate, { shouldValidate: true })
                    if (value.computationType) setValue("computationType", value.computationType, { shouldValidate: true })
                    if (value.workingDays) setValue("workingDays", value.workingDays, { shouldValidate: true })
                    if (value.signatoryName) setValue("signatoryName", value.signatoryName, { shouldValidate: true })
                    if (value.signatoryTitle) setValue("signatoryTitle", value.signatoryTitle, { shouldValidate: true })
                    if (value.payslipSignatoryName) setValue("payslipSignatoryName", value.payslipSignatoryName, { shouldValidate: true })
                    if (value.payslipSignatoryTitle) setValue("payslipSignatoryTitle", value.payslipSignatoryTitle, { shouldValidate: true })
                    if (value.payslipSignatories) setValue("payslipSignatories", value.payslipSignatories, { shouldValidate: true })
                  } else {
                    onChange("")
                  }
                }}
                onInputChange={(_event, newInputValue) => {
                  onChange(newInputValue)
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={ref}
                    id="name"
                    label="Employee Name"
                    size="small"
                    fullWidth
                    error={!!errors.name?.message}
                    helperText={errors.name?.message}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & { key?: React.Key }
                  return (
                    <Box
                      key={key || option.id || option.name}
                      component="li"
                      {...optionProps}
                      sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.position} • ₱{option.monthlyRate.toLocaleString()}
                        </Typography>
                      </Box>
                      {onDeleteEmployee && option.id && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent selecting
                            onDeleteEmployee(option.id)
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )
                }}
              />
            )}
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
              <MenuItem value="monthly-no-tax">Monthly No Tax (Full Month, No Tax Deductions)</MenuItem>
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
