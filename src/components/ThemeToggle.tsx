"use client"

import { IconButton, useTheme as useMuiTheme } from "@mui/material"
import { LightMode, DarkMode } from "@mui/icons-material"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const muiTheme = useMuiTheme()

  return (
    <IconButton
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      sx={{
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:hover": {
          bgcolor: muiTheme.palette.mode === "dark" ? "grey.900" : "grey.50",
        },
      }}
    >
      {muiTheme.palette.mode === "dark" ? <LightMode /> : <DarkMode />}
    </IconButton>
  )
}
