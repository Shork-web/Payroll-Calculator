"use client"

import { useCallback, useState } from "react"
import { Box, Container, Typography, Stack, Paper, Chip, Avatar, useTheme } from "@mui/material"
import { ExportButton } from "@/components/ExportButton"
import { PayrollForm } from "@/components/PayrollForm"
import { PaySummary } from "@/components/PaySummary"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"
import logo from "./COS-LOGO.png"

export default function Home() {
  const theme = useTheme()
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [inputs, setInputs] = useState<PayrollInputs | null>(null)

  const handleCompute = useCallback(
    (nextResult: PayrollResult, info: EmployeeInfo, nextInputs: PayrollInputs) => {
      setResult(nextResult)
      setEmployee(info)
      setInputs(nextInputs)
    },
    [],
  )

  const handleReset = useCallback(() => {
    setResult(null)
    setEmployee(null)
    setInputs(null)
  }, [])

  const canExport = employee !== null && result !== null && inputs !== null
  const mode = theme.palette.mode

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Premium Dark Green Banner */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 256,
          background: mode === "dark" 
            ? "linear-gradient(135deg, #065f46 0%, #064e3b 50%, #022c22 100%)"
            : "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
          zIndex: 0,
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, py: 4 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 3,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            bgcolor: "transparent",
            borderBottom: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "center", gap: 3 }}>
            <Avatar
              src={logo.src}
              alt="COS Logo"
              sx={{ width: 96, height: 96 }}
            />
            <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: "center", md: "flex-start" } }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#34d399",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                <Chip
                  label="Philippine Fiber Industry Development Authority"
                  size="small"
                  sx={{
                    bgcolor: "rgba(52, 211, 153, 0.1)",
                    color: "#6ee7b7",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    letterSpacing: 1,
                  }}
                />
              </Box>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: "white" }}>
                COS Salary Calculator
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "rgba(167, 243, 208, 0.7)" }}>
                Contract of Service — Semi-monthly computation payroll engine
              </Typography>
            </Box>
          </Box>
          <ThemeToggle />
        </Paper>

        {/* Core Layout Grid */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3 }}>
          {/* Left Column: Form Panel */}
          <Box sx={{ flex: { lg: "0 0 40%" }, position: { lg: "sticky" }, top: 32 }}>
            <PayrollForm onCompute={handleCompute} onReset={handleReset} />
          </Box>

          {/* Right Column: Dynamic Output Panel */}
          <Box sx={{ flex: { lg: 1 } }}>
            <Stack spacing={3}>
              <PaySummary
                result={result}
                inputs={inputs}
                action={
                  canExport ? (
                    <ExportButton
                      employee={employee}
                      result={result}
                      inputs={inputs}
                    />
                  ) : null
                }
              />
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
