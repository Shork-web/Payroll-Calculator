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
        <AttendanceIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Attendance Adjustments & Logs
        </Typography>
      </Box>

      <Stack spacing={2}>
        {/* LATE / UNDERTIME LOG */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8rem", color: "text.primary" }}>
              Late Incidents / Undertime Log
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => append({ minutes: 0, days: 0, date: "", type: "late" })}
              sx={{
                fontSize: "0.72rem",
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
                <Paper
                  key={field.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                    bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "background.paper",
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-end",
                    flexDirection: { xs: "column", sm: "row" }
                  }}
                >
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, fontSize: "0.72rem" }}>Date/Day</Typography>
                    <TextField
                      size="small"
                      placeholder="e.g. June 4"
                      fullWidth
                      error={!!errors.lateIncidents?.[index]?.date?.message}
                      helperText={errors.lateIncidents?.[index]?.date?.message}
                      {...register(`lateIncidents.${index}.date` as const)}
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: 120 } }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, fontSize: "0.72rem" }}>Type</Typography>
                    <FormControl fullWidth size="small">
                      <Controller
                        name={`lateIncidents.${index}.type` as const}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            error={!!errors.lateIncidents?.[index]?.type?.message}
                          >
                            <MenuItem value="late">Late</MenuItem>
                            <MenuItem value="undertime">Undertime</MenuItem>
                            <MenuItem value="absent">Absent</MenuItem>
                          </Select>
                        )}
                      />
                    </FormControl>
                  </Box>
                  {lateIncidentsValue?.[index]?.type === "absent" ? (
                    <Box sx={{ width: { xs: "100%", sm: 80 } }}>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, fontSize: "0.72rem" }}>Days</Typography>
                      <TextField
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
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, fontSize: "0.72rem" }}>Minutes</Typography>
                      <TextField
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
                      p: 0.5,
                      mb: 0.2,
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
      </Stack>
    </Box>
  )
}
