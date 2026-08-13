"use client"

import { Box, Typography, useTheme } from "@mui/material"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Box
      sx={{
        p: { xs: 4, sm: 6 },
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderStyle: "dashed",
        borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
        bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15, 23, 42, 0.02)",
      }}
    >
      <Box sx={{ color: "text.disabled", mb: 2, "& svg": { fontSize: 48 } }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mx: "auto" }}>
        {description}
      </Typography>
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  )
}
