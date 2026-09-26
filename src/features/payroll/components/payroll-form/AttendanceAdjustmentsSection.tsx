import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Box, Typography, Button, TextField, MenuItem, IconButton } from "@mui/material"
import { Delete as DeleteIcon, Add as AddIcon, AccessTime as AttendanceIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import {
  isHalfDayAttendanceType,
  type AttendanceIncidentType,
} from "@/features/payroll/lib/attendanceIncidents"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"
import { mergeFieldSlotProps } from "./fieldStyles"

export function AttendanceAdjustmentsSection() {
  const { control, watch, setValue } = useFormContext<PayrollFormInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lateIncidents",
  })

  const lateIncidentsValue = watch("lateIncidents")
  const numberFieldOptions = { valueAsNumber: true }

  const addButton = (
    <Button
      size="small"
      variant="text"
      color="primary"
      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
      onClick={() => append({ minutes: 0, days: 0, date: "", type: "late" })}
      sx={{ fontWeight: 600, fontSize: "0.72rem", py: 0.25, minWidth: 0, flexShrink: 0 }}
    >
      Add log
    </Button>
  )

  return (
    <FormSection
      title="Attendance adjustments"
      icon={<AttendanceIcon sx={{ fontSize: 16, color: "success.main" }} />}
      action={addButton}
    >
      {fields.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", lineHeight: 1.35 }}>
          No late, undertime, absent, or half-day absent entries.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {fields.map((field, index) => {
            const currentType = lateIncidentsValue?.[index]?.type || "late"
            const isHalfDay = isHalfDayAttendanceType(currentType)
            const isAbsent = currentType === "absent"

            return (
              <Box
                key={field.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 210px 72px 36px" },
                  gap: 1,
                  alignItems: "flex-start",
                }}
              >
                <FormTextField name={`lateIncidents.${index}.date`} label="Date" placeholder="Jun 4" />
                <Controller
                  name={`lateIncidents.${index}.type` as const}
                  control={control}
                  render={({ field: typeField }) => (
                    <TextField
                      {...typeField}
                      select
                      label="Type"
                      size="small"
                      fullWidth
                      slotProps={mergeFieldSlotProps({ inputLabel: { shrink: true } })}
                      onChange={(event) => {
                        const nextType = event.target.value as AttendanceIncidentType
                        typeField.onChange(nextType)
                        if (isHalfDayAttendanceType(nextType)) {
                          setValue(`lateIncidents.${index}.days`, 0.5, { shouldValidate: true, shouldDirty: true })
                          setValue(`lateIncidents.${index}.minutes`, 0, { shouldValidate: true, shouldDirty: true })
                        } else if (nextType === "absent") {
                          const rawDays = lateIncidentsValue?.[index]?.days
                          const existingDays = typeof rawDays === "number" ? rawDays : Number(rawDays) || 0
                          const initialDays = (!existingDays || existingDays <= 0 || existingDays === 0.5) ? 1 : existingDays
                          setValue(`lateIncidents.${index}.days`, initialDays, { shouldValidate: true, shouldDirty: true })
                          setValue(`lateIncidents.${index}.minutes`, 0, { shouldValidate: true, shouldDirty: true })
                        } else {
                          setValue(`lateIncidents.${index}.days`, 0, { shouldValidate: true, shouldDirty: true })
                        }
                      }}
                    >
                      <MenuItem value="late">Late</MenuItem>
                      <MenuItem value="undertime">UT</MenuItem>
                      <MenuItem value="absent">Absent</MenuItem>
                      <MenuItem value="halfday-am">Half-day absent (Morning)</MenuItem>
                      <MenuItem value="halfday-pm">Half-day absent (Afternoon)</MenuItem>
                      {currentType === "halfday" && (
                        <MenuItem value="halfday">Half-day absent</MenuItem>
                      )}
                    </TextField>
                  )}
                />
                {isHalfDay ? (
                  <FormTextField
                    name={`lateIncidents.${index}.days`}
                    label="Days"
                    type="number"
                    disabled
                    value={0.5}
                    registerOptions={numberFieldOptions}
                    slotProps={{ htmlInput: { step: "any", min: 0 } }}
                  />
                ) : isAbsent ? (
                  <FormTextField
                    name={`lateIncidents.${index}.days`}
                    label="Days"
                    type="number"
                    registerOptions={numberFieldOptions}
                    slotProps={{ htmlInput: { step: "any", min: 0 } }}
                  />
                ) : (
                  <FormTextField
                    name={`lateIncidents.${index}.minutes`}
                    label="Min"
                    type="number"
                    registerOptions={numberFieldOptions}
                    slotProps={{ htmlInput: { step: 1, min: 0 } }}
                  />
                )}
                <IconButton size="small" color="error" onClick={() => remove(index)} sx={{ mt: 0.5, flexShrink: 0 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          })}
        </Box>
      )}
    </FormSection>
  )
}
