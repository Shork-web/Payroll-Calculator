"use client"

import { useCallback, useState } from "react"
import { Box, Container, Typography, Stack, Paper, Chip, Avatar, useTheme, Button } from "@mui/material"
import { ExportButton } from "@/components/ExportButton"
import { PayrollForm } from "@/components/PayrollForm"
import { PaySummary } from "@/components/PaySummary"
import { PayrollSheet } from "@/components/PayrollSheet"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry, Signatory } from "@/types/payroll"
import { exportConsolidatedPayrollPdf, exportBulkPayslipsPdf } from "@/lib/exportPdf"
import type { PayrollFormInput } from "@/lib/schema"
import logo from "./COS-LOGO.png"

export default function Home() {
  const theme = useTheme()
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [inputs, setInputs] = useState<PayrollInputs | null>(null)

  // Multiple entries state
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<PayrollFormInput | null>(null)
  const [signatories, setSignatories] = useState<Signatory[]>([
    { label: "Prepared by:", name: "", title: "" },
    { label: "Certified Correct:", name: "", title: "" },
  ])

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
    setEditingEntryId(null)
    setEditValues(null)
  }, [])

  const handleAddEntry = useCallback(() => {
    if (!result || !employee || !inputs) return
    
    const newEntry: PayrollEntry = {
      id: editingEntryId || crypto.randomUUID(),
      employee,
      inputs,
      result,
    }

    if (editingEntryId) {
      setEntries((prev) => prev.map((e) => (e.id === editingEntryId ? newEntry : e)))
      setEditingEntryId(null)
      setEditValues(null)
    } else {
      setEntries((prev) => [...prev, newEntry])
    }

    handleReset()
  }, [result, employee, inputs, editingEntryId, handleReset])

  const handleEditEntry = useCallback(
    (id: string) => {
      const target = entries.find((e) => e.id === id)
      if (!target) return

      setEditingEntryId(id)
      setEditValues({
        name: target.employee.name,
        position: target.employee.position,
        periodStart: target.employee.periodStart,
        periodEnd: target.employee.periodEnd,
        monthlyRate: target.inputs.monthlyRate,
        workingDays: target.inputs.workingDays,
        lateMinutes: target.inputs.lateMinutes,
        undertimeMinutes: target.inputs.undertimeMinutes ?? 0,
        absentDays: target.inputs.absentDays,
        overpayment: target.inputs.overpayment,
        signatoryName: target.employee.signatoryName || "",
        signatoryTitle: target.employee.signatoryTitle || "",
        lateDates: target.inputs.lateDates || "",
        undertimeDates: target.inputs.undertimeDates || "",
        lateIncidents: target.inputs.lateIncidents || [],
        computationType: target.inputs.computationType || "semi-monthly",
        additionalTax: target.inputs.additionalTax ?? 0,
      })

      setResult(target.result)
      setEmployee(target.employee)
      setInputs(target.inputs)
    },
    [entries],
  )

  const handleDeleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (editingEntryId === id) {
        handleReset()
      }
    },
    [editingEntryId, handleReset],
  )

  const handleCancelEdit = useCallback(() => {
    handleReset()
  }, [handleReset])

  const handleExportConsolidated = useCallback(() => {
    if (entries.length === 0) return
    exportConsolidatedPayrollPdf(entries, signatories)
  }, [entries, signatories])

  const handleExportPayslips = useCallback(() => {
    if (entries.length === 0) return
    exportBulkPayslipsPdf(entries)
  }, [entries])

  const canExport = employee !== null && result !== null && inputs !== null
  const mode = theme.palette.mode

  const actionStack = canExport ? (
    <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 2, sm: 0 }, flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      {editingEntryId && (
        <Button
          size="medium"
          variant="outlined"
          color="error"
          onClick={handleCancelEdit}
          sx={{ fontWeight: 700, borderRadius: 2.5 }}
        >
          Cancel
        </Button>
      )}
      <Button
        size="medium"
        variant="contained"
        color="success"
        onClick={handleAddEntry}
        sx={{
          fontWeight: 700,
          borderRadius: 2.5,
          bgcolor: mode === "dark" ? "#047857" : "#059669",
          "&:hover": {
            bgcolor: mode === "dark" ? "#065f46" : "#047857",
          }
        }}
      >
        {editingEntryId ? "Update Entry" : "Add to Sheet"}
      </Button>
      <ExportButton employee={employee} result={result} inputs={inputs} />
    </Stack>
  ) : null

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 6 }}>
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
            borderColor: "rgba(255, 255, 255, 0.15)",
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
                    bgcolor: "rgba(52, 211, 153, 0.15)",
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
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, mb: 4 }}>
          {/* Left Column: Form Panel */}
          <Box sx={{ flex: { lg: "0 0 40%" }, position: { lg: "sticky" }, top: 32 }}>
            <PayrollForm onCompute={handleCompute} onReset={handleReset} editValues={editValues} />
          </Box>

          {/* Right Column: Dynamic Output Panel */}
          <Box sx={{ flex: { lg: 1 } }}>
            <Stack spacing={3}>
              <PaySummary
                result={result}
                inputs={inputs}
                action={actionStack}
              />
            </Stack>
          </Box>
        </Box>

        {/* Saved Entries Directory Section */}
        <Box>
          <PayrollSheet
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onExportConsolidated={handleExportConsolidated}
            onExportPayslips={handleExportPayslips}
            signatories={signatories}
            onSignatoriesChange={setSignatories}
          />
        </Box>
      </Container>
    </Box>
  )
}
