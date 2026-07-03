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
          color="success"
          startIcon={<AddIcon />}
          onClick={() => append({ label: "Certified Correct:", name: "", title: "" })}
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
                gap: 1.5,
                alignItems: "center",
                flexDirection: { xs: "column", md: "row" },
                p: 1.5,
                borderRadius: 2,
                bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "background.paper",
                border: 1,
                borderColor: mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
              }}
            >
              <TextField
                label="Signatory Label"
                placeholder="e.g. Certified Correct:"
                size="small"
                sx={{ flex: 1, width: "100%" }}
                {...register(`payslipSignatories.${index}.label`)}
              />
              <TextField
                label="Signatory Name"
                placeholder="e.g. Juan dela Cruz"
                size="small"
                sx={{ flex: 1.5, width: "100%" }}
                {...register(`payslipSignatories.${index}.name`)}
              />
              <TextField
                label="Signatory Title"
                placeholder="e.g. Administrative Officer V"
                size="small"
                sx={{ flex: 1.5, width: "100%" }}
                {...register(`payslipSignatories.${index}.title`)}
              />
              <IconButton
                onClick={() => remove(index)}
                sx={{
                  color: "error.main",
                  border: 1,
                  borderColor: "error.light",
                  borderRadius: 2,
                  p: 0.75,
                  alignSelf: { xs: "flex-end", md: "auto" },
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
          ))}
        </Box>
      )}
    </Box>
  )
}
