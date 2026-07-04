import { useFormContext } from "react-hook-form"
import { Box, Typography, TextField, useTheme } from "@mui/material"
import { AssignmentInd as SignatoryIcon } from "@mui/icons-material"
import type { PayrollFormInput } from "@/lib/schema"

export function AuthorizedSignatorySection() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { register, formState: { errors } } = useFormContext<PayrollFormInput>()

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
        <SignatoryIcon sx={{ color: mode === "dark" ? "#34d399" : "#059669", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
          Authorized Signatory
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        <TextField
          id="signatoryName"
          label="Signatory Name"
          size="small"
          fullWidth
          error={!!errors.signatoryName?.message}
          helperText={errors.signatoryName?.message}
          {...register("signatoryName")}
        />
        <TextField
          id="signatoryTitle"
          label="Designation / Title"
          size="small"
          fullWidth
          error={!!errors.signatoryTitle?.message}
          helperText={errors.signatoryTitle?.message}
          {...register("signatoryTitle")}
        />
      </Box>
    </Box>
  )
}
