import { useFormContext, useFieldArray } from "react-hook-form"
import { Box, Typography, Button, IconButton } from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"

interface PayslipSignatorySectionProps {
  flat?: boolean
}

export function PayslipSignatorySection({ flat = false }: PayslipSignatorySectionProps) {
  const { control } = useFormContext<PayrollFormInput>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: "payslipSignatories",
  })

  const addButton = (
    <Button
      size="small"
      variant="text"
      color="primary"
      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
      onClick={() => append({ label: "Certified Correct:", name: "", title: "" })}
      sx={{ fontWeight: 600, fontSize: "0.72rem", py: 0.25, minWidth: 0, flexShrink: 0 }}
    >
      Add
    </Button>
  )

  const content = (
    <>
      {fields.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block" }}>
          No payslip signatories configured.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) auto" },
                gap: 1,
                alignItems: "flex-start",
              }}
            >
              <FormTextField
                name={`payslipSignatories.${index}.label`}
                label="Label"
                placeholder="Certified Correct:"
              />
              <FormTextField name={`payslipSignatories.${index}.name`} label="Name" />
              <FormTextField name={`payslipSignatories.${index}.title`} label="Title" />
              <IconButton
                size="small"
                onClick={() => remove(index)}
                color="error"
                sx={{ mt: 0.5, flexShrink: 0 }}
                title="Remove signatory"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </>
  )

  if (flat) {
    return (
      <Box sx={{ pt: 0.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.3 }}>
            Payslip signatories
          </Typography>
          {addButton}
        </Box>
        {content}
      </Box>
    )
  }

  return (
    <FormSection title="Payslip signatories" action={addButton}>
      {content}
    </FormSection>
  )
}
