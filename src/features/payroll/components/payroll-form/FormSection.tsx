"use client"

import type { ReactNode } from "react"
import { Box, Typography, useTheme } from "@mui/material"

interface FormSectionProps {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Omit outer border for nested grouping */
  flat?: boolean
}

export function FormSection({ title, icon, action, children, flat = false }: FormSectionProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Box
      sx={{
        p: flat ? 0 : 1.5,
        borderRadius: 1.25,
        border: flat ? 0 : 1,
        borderColor: "divider",
        bgcolor: flat
          ? "transparent"
          : mode === "dark"
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(248, 250, 252, 0.6)",
        overflow: "visible",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1,
          minHeight: 32,
          overflow: "visible",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, overflow: "visible" }}>
          {icon && (
            <Box component="span" sx={{ display: "inline-flex", flexShrink: 0, lineHeight: 0 }}>
              {icon}
            </Box>
          )}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              fontSize: "0.68rem",
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  )
}
