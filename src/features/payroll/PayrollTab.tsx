"use client"

import { Box, Button, Typography, useTheme } from "@mui/material"
import { ExportButton } from "@/features/payroll/components/ExportButton"
import { PayrollForm } from "@/features/payroll/components/PayrollForm"
import { PaySummary } from "@/features/payroll/components/PaySummary"
import { PayrollSheet } from "@/features/payroll/components/PayrollSheet"
import { formatPeso } from "@/shared/lib/format"
import type { EmployeeInfo, PayrollEntry, PayrollInputs, PayrollResult, Signatory } from "@/features/payroll/types/payroll"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import type { SavedEmployee } from "@/lib/db"

interface PayrollTabProps {
  entries: PayrollEntry[]
  signatories: Signatory[]
  savedEmployees: SavedEmployee[]
  result: PayrollResult | null
  inputs: PayrollInputs | null
  employee: EmployeeInfo | null
  editingEntryId: string | null
  editValues: PayrollFormInput | null
  onCompute: (result: PayrollResult, employee: EmployeeInfo, inputs: PayrollInputs) => void
  onReset: () => void
  onAddEntry: () => void
  onCancelEdit: () => void
  onEditEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
  onDeleteEmployee: (employeeId: string) => Promise<void>
  onSignatoriesChange: (signatories: Signatory[]) => void
  onExportConsolidated: (entries: PayrollEntry[]) => void
  onExportPayslips: (entries: PayrollEntry[]) => void
  onExportComputations: (entries: PayrollEntry[]) => void
  onExportCsv: (entries: PayrollEntry[]) => void
}

export function PayrollTab({
  entries,
  signatories,
  savedEmployees,
  result,
  inputs,
  employee,
  editingEntryId,
  editValues,
  onCompute,
  onReset,
  onAddEntry,
  onCancelEdit,
  onEditEntry,
  onDeleteEntry,
  onDeleteEmployee,
  onSignatoriesChange,
  onExportConsolidated,
  onExportPayslips,
  onExportComputations,
  onExportCsv,
}: PayrollTabProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const canExport = employee !== null && result !== null && inputs !== null

  const actionStack = canExport ? (
    <>
      {editingEntryId && (
        <Button size="small" variant="outlined" color="error" onClick={onCancelEdit} sx={{ fontWeight: 600, px: 1.5 }}>
          Cancel
        </Button>
      )}
      <Button size="small" variant="contained" onClick={onAddEntry} sx={{ fontWeight: 700, px: 2 }}>
        {editingEntryId ? "Update entry" : "Add to sheet"}
      </Button>
      <ExportButton employee={employee} result={result} inputs={inputs} />
    </>
  ) : null

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(320px, 400px)" },
          gap: 1.5,
          mb: 1.25,
          alignItems: "start",
        }}
      >
        <PayrollForm
          onCompute={onCompute}
          onReset={onReset}
          editValues={editValues}
          savedEmployees={savedEmployees}
          onDeleteEmployee={onDeleteEmployee}
        />

        <Box
          sx={{
            position: "sticky",
            top: { xs: 80, sm: 88 },
            zIndex: 10,
            alignSelf: "start",
          }}
        >
          <PaySummary result={result} inputs={inputs} action={actionStack} />
        </Box>
      </Box>

      {canExport && (
        <Box
          sx={{
            display: { xs: "flex", lg: "none" },
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            px: 1.5,
            py: 1,
            gap: 1,
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: 1,
            borderColor: "divider",
            bgcolor: mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", fontSize: "0.65rem" }}>
              Net take-home
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "success.main", lineHeight: 1.2 }}>
              {formatPeso(result!.netPay)}
            </Typography>
          </Box>
          <Button size="small" variant="contained" onClick={onAddEntry} sx={{ fontWeight: 700, flexShrink: 0 }}>
            {editingEntryId ? "Update" : "Add to sheet"}
          </Button>
        </Box>
      )}

      <Box sx={{ pb: canExport ? { xs: 7, lg: 0 } : 0 }}>
        <PayrollSheet
          entries={entries}
          onEdit={onEditEntry}
          onDelete={onDeleteEntry}
          onExportConsolidated={onExportConsolidated}
          onExportPayslips={onExportPayslips}
          onExportComputations={onExportComputations}
          onExportCsv={onExportCsv}
          signatories={signatories}
          onSignatoriesChange={onSignatoriesChange}
        />
      </Box>
    </>
  )
}
