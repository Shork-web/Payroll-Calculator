import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Box, Typography, Button, TextField, MenuItem, IconButton } from "@mui/material"
import { Delete as DeleteIcon, Add as AddIcon, AccessTime as AttendanceIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"
import { mergeFieldSlotProps } from "./fieldStyles"

export function AttendanceAdjustmentsSection() {
  const { control, watch } = useFormContext<PayrollFormInput>()

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
          No late, undertime, or absent entries.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 100px 72px 36px" },
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
                  >
                    <MenuItem value="late">Late</MenuItem>
                    <MenuItem value="undertime">UT</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                  </TextField>
                )}
              />
              {lateIncidentsValue?.[index]?.type === "absent" ? (
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
          ))}
        </Box>
      )}
    </FormSection>
  )
}
