import { useFormContext, Controller } from "react-hook-form"
import { Box, Typography, TextField, MenuItem, Autocomplete, IconButton } from "@mui/material"
import { AccountBox as ProfileIcon, Close as CloseIcon } from "@mui/icons-material"
import { useConfirmDialog } from "@/shared/hooks/useConfirmDialog"
import { computeWorkingDaysInRange } from "@/features/payroll/lib/workingDays"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import type { SavedEmployee } from "@/lib/db"
import { COMPUTATION_TYPE_OPTIONS } from "@/features/payroll/lib/computationTypeLabels"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"
import { mergeFieldSlotProps } from "./fieldStyles"

interface EmployeeProfileSectionProps {
  savedEmployees?: SavedEmployee[]
  onDeleteEmployee?: ((id: string) => Promise<void>) | undefined
}

export function EmployeeProfileSection({ savedEmployees = [], onDeleteEmployee }: EmployeeProfileSectionProps) {
  const { confirm, dialog } = useConfirmDialog()
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
    <>
      <FormSection title="Employee & cutoff" icon={<ProfileIcon sx={{ fontSize: 16, color: "success.main" }} />}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
            <Controller
              name="name"
              control={control}
              render={({ field: { ref, onChange, ...field } }) => (
                <Autocomplete
                  {...field}
                  freeSolo
                  options={savedEmployees}
                  getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
                  onChange={(_event, value) => {
                    if (typeof value === "string") {
                      onChange(value)
                    } else if (value && typeof value === "object") {
                      onChange(value.name)
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
                  onInputChange={(_event, newInputValue) => onChange(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      inputRef={ref}
                      id="name"
                      label="Employee name"
                      size="small"
                      fullWidth
                      error={!!errors.name?.message}
                      helperText={errors.name?.message}
                      slotProps={mergeFieldSlotProps({
                        ...params.slotProps,
                        inputLabel: {
                          shrink: Boolean(field.value?.trim()) || undefined,
                        },
                      })}
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
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }} noWrap>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {option.position} · ₱{option.monthlyRate.toLocaleString()}
                          </Typography>
                        </Box>
                        {onDeleteEmployee && option.id && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              void (async () => {
                                const confirmed = await confirm({
                                  title: "Delete saved employee?",
                                  message: `Remove ${option.name} from saved profiles?`,
                                  confirmLabel: "Delete",
                                  confirmColor: "error",
                                })
                                if (confirmed) await onDeleteEmployee(option.id)
                              })()
                            }}
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
            <FormTextField
              name="position"
              label="Position"
              error={!!errors.position?.message}
              helperText={errors.position?.message}
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
                label="Pay computation basis"
                size="small"
                fullWidth
                error={!!errors.computationType?.message}
                helperText={errors.computationType?.message ?? "How base pay and tax are calculated"}
                slotProps={mergeFieldSlotProps({ inputLabel: { shrink: true } })}
              >
                {COMPUTATION_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr auto" }, gap: 1.25, alignItems: "start" }}>
            <TextField
              id="periodStart"
              label="Period start"
              type="date"
              size="small"
              fullWidth
              error={!!errors.periodStart?.message}
              helperText={errors.periodStart?.message}
              slotProps={mergeFieldSlotProps({ inputLabel: { shrink: true } })}
              {...register("periodStart")}
            />
            <TextField
              id="periodEnd"
              label="Period end"
              type="date"
              size="small"
              fullWidth
              error={!!errors.periodEnd?.message}
              helperText={errors.periodEnd?.message}
              slotProps={mergeFieldSlotProps({ inputLabel: { shrink: true } })}
              {...register("periodEnd")}
            />
            {cutoffWorkingDays !== null && (
              <Typography
                variant="caption"
                sx={{
                  color: "success.main",
                  fontWeight: 600,
                  fontSize: "0.68rem",
                  pt: { xs: 0, md: 1.25 },
                  gridColumn: { xs: "1 / -1", md: "auto" },
                  whiteSpace: { md: "nowrap" },
                }}
              >
                {cutoffWorkingDays} weekdays in cutoff
              </Typography>
            )}
          </Box>
        </Box>
      </FormSection>
      {dialog}
    </>
  )
}
