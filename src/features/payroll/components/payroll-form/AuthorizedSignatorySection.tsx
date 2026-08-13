import { Box } from "@mui/material"
import { FormTextField } from "./FormTextField"

interface AuthorizedSignatorySectionProps {
  flat?: boolean
}

export function AuthorizedSignatorySection({ flat = false }: AuthorizedSignatorySectionProps) {
  return (
    <Box sx={{ pt: flat ? 0.5 : 0 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
        <FormTextField name="signatoryName" label="Computation signatory name" />
        <FormTextField name="signatoryTitle" label="Designation / title" />
      </Box>
    </Box>
  )
}
