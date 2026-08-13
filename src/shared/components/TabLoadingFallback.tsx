"use client"

import { Box, CircularProgress, Typography, useTheme } from "@mui/material"

export function TabLoadingFallback({ label = "Loading..." }: { label?: string }) {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        gap: 2,
      }}
    >
      <CircularProgress size={32} sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  )
}
