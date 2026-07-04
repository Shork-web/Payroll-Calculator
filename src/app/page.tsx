"use client"

import { useCallback, useState } from "react"
import { Box, Container, Typography, Stack, Chip, Avatar, useTheme, Button } from "@mui/material"
import { ExportButton } from "@/components/ExportButton"
import { PayrollForm } from "@/components/PayrollForm"
import { PaySummary } from "@/components/PaySummary"
import { PayrollSheet } from "@/components/PayrollSheet"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { EmployeeInfo, PayrollInputs, PayrollResult, PayrollEntry, Signatory } from "@/types/payroll"
import { exportConsolidatedPayrollPdf, exportBulkPayslipsPdf, exportBulkComputationsPdf } from "@/lib/exportPdf"
import { exportPayrollCsv } from "@/lib/exportCsv"
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
        payslipSignatoryName: target.employee.payslipSignatoryName || "",
        payslipSignatoryTitle: target.employee.payslipSignatoryTitle || "",
        payslipSignatories: target.employee.payslipSignatories || [
          { label: "Certified Correct:", name: "", title: "" }
        ],
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

  const handleExportConsolidated = useCallback(
    (selectedEntries: PayrollEntry[]) => {
      if (selectedEntries.length === 0) return
      exportConsolidatedPayrollPdf(selectedEntries, signatories)
    },
    [signatories],
  )

  const handleExportPayslips = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    exportBulkPayslipsPdf(selectedEntries)
  }, [])

  const handleExportComputations = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    exportBulkComputationsPdf(selectedEntries)
  }, [])

  const handleExportCsv = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    exportPayrollCsv(selectedEntries)
  }, [])

  const canExport = employee !== null && result !== null && inputs !== null
  const mode = theme.palette.mode

  const actionStack = canExport ? (
    <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 2, sm: 0 }, flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
      {editingEntryId && (
        <Button
          size="medium"
          variant="outlined"
          color="error"
          onClick={handleCancelEdit}
          sx={{ fontWeight: 700, borderRadius: 1.5 }}
        >
          Cancel
        </Button>
      )}
      <Button
        size="small"
        variant="contained"
        color="primary"
        onClick={handleAddEntry}
        sx={{
          fontWeight: 700,
          borderRadius: 1.5,
        }}
      >
        {editingEntryId ? "Update Entry" : "Add to Sheet"}
      </Button>
      <ExportButton employee={employee} result={result} inputs={inputs} />
    </Stack>
  ) : null

  return (
    <Box sx={{ minHeight: "100vh", pb: 4 }}>
      {/* Premium Slim Navigation Header */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.8)",
          borderBottom: 1,
          borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.5)",
          boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1,
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                src={logo.src}
                alt="PHILFIDA Logo"
                sx={{ width: 32, height: 32, borderRadius: 1 }}
              />
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.3 }}>
                    PHILFIDA Payroll
                  </Typography>
                  <Chip
                    label="COS Calculator"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.15)" : "rgba(5, 150, 105, 0.1)",
                      color: mode === "dark" ? "#6ee7b7" : "#047857",
                      border: 1,
                      borderColor: mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.2)",
                    }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" }, fontSize: "0.75rem" }}>
                  Philippine Fiber Industry Development Authority • Contract of Service Engine
                </Typography>
              </Box>
            </Box>
            <ThemeToggle />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 2 }}>

        {/* Core Layout Grid */}
        <Stack spacing={2} sx={{ mb: 2 }}>
          <PayrollForm onCompute={handleCompute} onReset={handleReset} editValues={editValues} />
          
          <PaySummary
            result={result}
            inputs={inputs}
            action={actionStack}
          />
        </Stack>

        {/* Saved Entries Directory Section */}
        <Box>
          <PayrollSheet
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onExportConsolidated={handleExportConsolidated}
            onExportPayslips={handleExportPayslips}
            onExportComputations={handleExportComputations}
            onExportCsv={handleExportCsv}
            signatories={signatories}
            onSignatoriesChange={setSignatories}
          />
        </Box>
      </Container>
    </Box>
  )
}
