import { useFormContext } from "react-hook-form"
import { Box, Typography } from "@mui/material"
import { Paid as MoneyIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"

export function SalaryBaseRatesSection() {
  const { watch } = useFormContext<PayrollFormInput>()
  const computationTypeValue = watch("computationType")
  const numberFieldOptions = { valueAsNumber: true }

  return (
    <FormSection title="Salary base" icon={<MoneyIcon sx={{ fontSize: 16, color: "success.main" }} />}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
        <FormTextField
          name="monthlyRate"
          label="Monthly rate"
          type="number"
          registerOptions={numberFieldOptions}
          slotProps={{ htmlInput: { step: "any" } }}
        />
        <FormTextField
          name="workingDays"
          label="Working days / month"
          type="number"
          disabled={computationTypeValue === "daily" || computationTypeValue === "monthly"}
          registerOptions={numberFieldOptions}
          slotProps={{
            htmlInput: { step: 1, min: 1, max: 31 },
            inputLabel: { shrink: true },
          }}
          placeholder="Auto"
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: "0.65rem", lineHeight: 1.35 }}>
        Daily rate = monthly rate ÷ working days (for absent/late deductions).
      </Typography>
    </FormSection>
  )
}
