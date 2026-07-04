import { useFormContext } from "react-hook-form"
import { Box, Typography, TextField, Stack, useTheme } from "@mui/material"
import { TrendingDown as DeductionsIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/lib/schema"

export function DeductionsTaxSection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, watch, formState: { errors } } = useFormContext<PayrollFormInput>()
  const numberFieldOptions = { valueAsNumber: true }
  const computationTypeValue = watch("computationType")

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
        <DeductionsIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Deductions & Tax Adjustments
        </Typography>
      </Box>

      <Stack spacing={2}>
        {/* Overpayment Recovery Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 755, color: "text.primary", fontSize: "0.8rem", mb: 1 }}>
            Overpayment Recovery
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              id="overpayment"
              label="Overpayment Amount"
              type="number"
              size="small"
              fullWidth
              slotProps={{ htmlInput: { step: "any" } }}
              placeholder="0"
              error={!!errors.overpayment?.message}
              helperText={errors.overpayment?.message}
              {...register("overpayment", numberFieldOptions)}
            />
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "text.secondary",
                fontSize: "0.7rem",
                lineHeight: 1.3,
              }}
            >
              * Deducted from gross pay with a 20% premium surcharge.
            </Typography>
          </Stack>
        </Box>

        {/* Additional Tax Withholding Section */}
        {computationTypeValue !== "semi-monthly-no-tax" && computationTypeValue !== "monthly-no-tax" && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 755, color: "text.primary", fontSize: "0.8rem", mb: 1 }}>
              Additional Tax Withholding
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                id="additionalTax"
                label="Additional Tax Amount"
                type="number"
                size="small"
                fullWidth
                slotProps={{ htmlInput: { step: "any" } }}
                placeholder="0"
                error={!!errors.additionalTax?.message}
                helperText={errors.additionalTax?.message}
                {...register("additionalTax", numberFieldOptions)}
              />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                <TextField
                  id="additionalTaxDate"
                  label="Tax Date / Period"
                  placeholder="e.g., June 15"
                  size="small"
                  fullWidth
                  error={!!errors.additionalTaxDate?.message}
                  helperText={errors.additionalTaxDate?.message}
                  {...register("additionalTaxDate")}
                />
                <TextField
                  id="additionalTaxReason"
                  label="Reason"
                  placeholder="e.g., Adjustment"
                  size="small"
                  fullWidth
                  error={!!errors.additionalTaxReason?.message}
                  helperText={errors.additionalTaxReason?.message}
                  {...register("additionalTaxReason")}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  fontSize: "0.7rem",
                  lineHeight: 1.3,
                }}
              >
                * Added directly to the calculated 5% withholding tax deduction.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
