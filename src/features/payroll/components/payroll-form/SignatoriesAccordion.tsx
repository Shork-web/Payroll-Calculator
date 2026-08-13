"use client"

import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, useTheme } from "@mui/material"
import { ExpandMore as ExpandMoreIcon, AssignmentInd as SignatoryIcon } from "@mui/icons-material"
import { AuthorizedSignatorySection } from "./AuthorizedSignatorySection"
import { PayslipSignatorySection } from "./PayslipSignatorySection"

export function SignatoriesAccordion() {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: "10px !important",
        bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(248, 250, 252, 0.6)",
        "&:before": { display: "none" },
        overflow: "visible",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" sx={{ flexShrink: 0 }} />}
        sx={{
          minHeight: 52,
          px: 1.5,
          py: 0.75,
          overflow: "visible",
          "& .MuiAccordionSummary-content": {
            my: 0.5,
            alignItems: "center",
            gap: 1,
            overflow: "visible",
          },
          "& .MuiAccordionSummary-expandIconWrapper": {
            flexShrink: 0,
          },
        }}
      >
        <SignatoryIcon
          sx={{
            fontSize: 20,
            flexShrink: 0,
            color: mode === "dark" ? "#34d399" : "#059669",
          }}
        />
        <Box sx={{ minWidth: 0, py: 0.25 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              display: "block",
              lineHeight: 1.35,
            }}
          >
            Export Signatories
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", lineHeight: 1.35, display: "block" }}>
            Optional — for PDF computation & payslip blocks
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          px: 1.5,
          pt: 0.5,
          pb: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          overflow: "visible",
        }}
      >
        <AuthorizedSignatorySection flat />
        <PayslipSignatorySection flat />
      </AccordionDetails>
    </Accordion>
  )
}
