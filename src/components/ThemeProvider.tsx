"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "phifida-payroll-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof window !== "undefined" && (localStorage.getItem(storageKey) as Theme)) || defaultTheme
  )

  const [mode, setMode] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored === "dark") return "dark"
      if (stored === "light") return "light"
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return "light"
  })

  useEffect(() => {
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      setMode(systemTheme)
      return
    }

    setMode(theme)
  }, [theme])

  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode,
        primary: {
          main: "#059669",
          light: "#34d399",
          dark: "#047857",
          contrastText: "#ffffff",
        },
        secondary: {
          main: "#10b981",
          light: "#6ee7b7",
          dark: "#059669",
          contrastText: "#ffffff",
        },
        background: {
          default: mode === "dark" ? "#0f172a" : "#F8FAFC",
          paper: mode === "dark" ? "#1e293b" : "#ffffff",
        },
        text: {
          primary: mode === "dark" ? "#f1f5f9" : "#0f172a",
          secondary: mode === "dark" ? "#94a3b8" : "#64748b",
        },
        divider: mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        grey: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        success: {
          main: "#059669",
          light: "#34d399",
          dark: "#047857",
        },
        error: {
          main: "#dc2626",
          light: "#f87171",
          dark: "#b91c1c",
        },
      },
      typography: {
        fontFamily: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ].join(","),
        h1: {
          fontWeight: 700,
        },
        h2: {
          fontWeight: 600,
        },
        h3: {
          fontWeight: 600,
        },
        h4: {
          fontWeight: 600,
        },
        h5: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 600,
        },
        button: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 12,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              fontWeight: 600,
            },
            contained: {
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              "& .MuiOutlinedInput-root": {
                borderRadius: 8,
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
            },
          },
        },
      },
      shape: {
        borderRadius: 8,
      },
    })
  }, [mode])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
