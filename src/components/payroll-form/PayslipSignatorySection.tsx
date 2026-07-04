import { useFormContext, useFieldArray } from "react-hook-form"
import { Box, Typography, TextField, Button, IconButton, useTheme } from "@mui/material"
import { AssignmentInd as SignatoryIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/lib/schema"

export function PayslipSignatorySection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, control } = useFormContext<PayrollFormInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: "payslipSignatories"
  })

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
          <SignatoryIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            Payslip Signatories
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => append({ label: "Certified Correct:", name: "", title: "" })}
          sx={{
            borderRadius: 1.5,
            fontWeight: 700,
          }}
        >
          Add Signatory
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", py: 1 }}>
          No signatories configured. Click &quot;Add Signatory&quot; to configure signature blocks.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "grey.50",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <TextField
                  label="Signatory Label"
                  placeholder="e.g. Certified Correct:"
                  size="small"
                  fullWidth
                  {...register(`payslipSignatories.${index}.label`)}
                />
                <IconButton
                  onClick={() => remove(index)}
                  sx={{
                    color: "error.main",
                    border: 1,
                    borderColor: "error.light",
                    borderRadius: 2,
                    p: 0.75,
                    "&:hover": {
                      bgcolor: "error.light",
                      color: "white"
                    }
                  }}
                  title="Remove signatory"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                <TextField
                  label="Signatory Name"
                  placeholder="e.g. Juan dela Cruz"
                  size="small"
                  fullWidth
                  {...register(`payslipSignatories.${index}.name`)}
                />
                <TextField
                  label="Signatory Title"
                  placeholder="e.g. Administrative Officer V"
                  size="small"
                  fullWidth
                  {...register(`payslipSignatories.${index}.title`)}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
