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
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mode, setMode] = useState<"light" | "dark">("light")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [storageKey])

  useEffect(() => {
    if (!isMounted) return

    const updateTheme = () => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light"

        setMode(systemTheme)
      } else {
        setMode(theme)
      }

      // Apply dark class to html element
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      
      if (theme === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        root.classList.add(systemPrefersDark ? "dark" : "light")
      } else {
        root.classList.add(theme)
      }
    }

    updateTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => updateTheme()
    mediaQuery.addEventListener("change", handler)

    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme, isMounted])

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
          "Inter",
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
              borderRadius: 16,
              backgroundImage: "none",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.7)",
              boxShadow: mode === "dark" 
                ? "0 8px 32px 0 rgba(0, 0, 0, 0.3)" 
                : "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
              border: `1px solid ${mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.4)"}`,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              fontWeight: 600,
              textTransform: "none",
              transition: "all 0.2s ease-in-out",
            },
            containedPrimary: {
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.39)",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.23)",
              },
            },
            outlinedPrimary: {
              borderWidth: "1.5px",
              "&:hover": {
                borderWidth: "1.5px",
                backgroundColor: "rgba(16, 185, 129, 0.04)",
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              "& .MuiOutlinedInput-root": {
                borderRadius: 10,
                backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.5)",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.8)",
                },
                "&.Mui-focused": {
                  backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.8)" : "#ffffff",
                  boxShadow: `0 0 0 2px ${mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "rgba(16, 185, 129, 0.1)"}`,
                }
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              backgroundImage: "none",
              backdropFilter: "blur(12px)",
              backgroundColor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.7)",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              fontWeight: 600,
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
