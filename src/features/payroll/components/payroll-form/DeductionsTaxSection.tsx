import { useFormContext } from "react-hook-form"
import { Box } from "@mui/material"
import { TrendingDown as DeductionsIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import { FormSection } from "./FormSection"
import { FormTextField } from "./FormTextField"

export function DeductionsTaxSection() {
  const { watch } = useFormContext<PayrollFormInput>()
  const numberFieldOptions = { valueAsNumber: true }
  const computationTypeValue = watch("computationType")
  const showTax =
    computationTypeValue !== "semi-monthly-no-tax" && computationTypeValue !== "monthly-no-tax"

  return (
    <FormSection title="Deductions & tax" icon={<DeductionsIcon sx={{ fontSize: 16, color: "success.main" }} />}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: showTax ? "1fr 1fr" : "1fr" }, gap: 1.25 }}>
        <FormTextField
          name="overpayment"
          label="Overpayment recovery"
          type="number"
          registerOptions={numberFieldOptions}
          slotProps={{ htmlInput: { step: "any" } }}
          placeholder="0"
        />
        {showTax && (
          <FormTextField
            name="additionalTax"
            label="Additional withholding tax"
            type="number"
            registerOptions={numberFieldOptions}
            slotProps={{ htmlInput: { step: "any" } }}
            placeholder="0"
          />
        )}
      </Box>
      {showTax && (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mt: 1.25 }}>
          <FormTextField name="additionalTaxDate" label="Tax period" placeholder="Jun 15" />
          <FormTextField name="additionalTaxReason" label="Reason" placeholder="Adjustment" />
        </Box>
      )}
    </FormSection>
  )
}
