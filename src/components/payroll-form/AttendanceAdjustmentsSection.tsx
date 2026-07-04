import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Box, Typography, Button, Paper, Stack, TextField, FormControl, Select, MenuItem, IconButton, useTheme } from "@mui/material"
import { Delete as DeleteIcon, Add as AddIcon, AccessTime as AttendanceIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/lib/schema"

export function AttendanceAdjustmentsSection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, control, watch, formState: { errors } } = useFormContext<PayrollFormInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lateIncidents",
  })

  const lateIncidentsValue = watch("lateIncidents")
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <AttendanceIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            Attendance Adjustments & Logs
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => append({ minutes: 0, days: 0, date: "", type: "late" })}
          sx={{
            borderRadius: 1.5,
            fontWeight: 700,
          }}
        >
          Add Log Entry
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            textAlign: "center",
            borderStyle: "dashed",
            borderRadius: 2.5,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            bgcolor: "transparent"
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", fontSize: "0.8rem" }}>
            No late or undertime incidents logged. Click &quot;Add Log Entry&quot; to record details.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                borderColor: "divider",
                bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "grey.50",
                border: 1,
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" }
              }}
            >
              <Box sx={{ flex: 1, width: "100%" }}>
                <TextField
                  label="Date/Day"
                  size="small"
                  placeholder="e.g. June 4"
                  fullWidth
                  error={!!errors.lateIncidents?.[index]?.date?.message}
                  helperText={errors.lateIncidents?.[index]?.date?.message}
                  {...register(`lateIncidents.${index}.date` as const)}
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 120 } }}>
                <Controller
                  name={`lateIncidents.${index}.type` as const}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Type"
                      size="small"
                      fullWidth
                      error={!!errors.lateIncidents?.[index]?.type?.message}
                    >
                      <MenuItem value="late">Late</MenuItem>
                      <MenuItem value="undertime">Undertime</MenuItem>
                      <MenuItem value="absent">Absent</MenuItem>
                    </TextField>
                  )}
                />
              </Box>
              {lateIncidentsValue?.[index]?.type === "absent" ? (
                <Box sx={{ width: { xs: "100%", sm: 80 } }}>
                  <TextField
                    label="Days"
                    size="small"
                    type="number"
                    placeholder="0"
                    fullWidth
                    slotProps={{ htmlInput: { step: "any", min: 0 } }}
                    error={!!errors.lateIncidents?.[index]?.days?.message}
                    helperText={errors.lateIncidents?.[index]?.days?.message}
                    {...register(`lateIncidents.${index}.days` as const, numberFieldOptions)}
                  />
                </Box>
              ) : (
                <Box sx={{ width: { xs: "100%", sm: 80 } }}>
                  <TextField
                    label="Minutes"
                    size="small"
                    type="number"
                    placeholder="0"
                    fullWidth
                    slotProps={{ htmlInput: { step: 1, min: 0 } }}
                    error={!!errors.lateIncidents?.[index]?.minutes?.message}
                    helperText={errors.lateIncidents?.[index]?.minutes?.message}
                    {...register(`lateIncidents.${index}.minutes` as const, numberFieldOptions)}
                  />
                </Box>
              )}
              <IconButton
                onClick={() => remove(index)}
                sx={{
                  color: "error.main",
                  border: 1,
                  borderColor: "error.light",
                  borderRadius: 2,
                  p: 0.75,
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
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}
