"use client"

import { useState } from "react"
import { Button, CircularProgress } from "@mui/material"
import { Description as DescriptionIcon, Download as DownloadIcon } from "@mui/icons-material"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

export interface ExportButtonProps {
  employee: EmployeeInfo | null
  result: PayrollResult | null
  inputs: PayrollInputs | null
}

export function ExportButton({ employee, result, inputs }: ExportButtonProps) {
  const [loadingPayslip, setLoadingPayslip] = useState(false)
  const [loadingComp, setLoadingComp] = useState(false)

  const disabled =
    employee === null || result === null || inputs === null || loadingPayslip || loadingComp

  const handleExportPayslip = () => {
    if (employee === null || result === null || inputs === null || disabled) {
      return
    }

    setLoadingPayslip(true)

    void (async () => {
      try {
        const { exportPayslipPdf } = await import("@/lib/exportPdf")
        await exportPayslipPdf(employee, result, inputs)
      } finally {
        setLoadingPayslip(false)
      }
    })()
  }

  const handleExportComputation = () => {
    if (employee === null || result === null || inputs === null || disabled) {
      return
    }

    setLoadingComp(true)

    void (async () => {
      try {
        const { exportPayrollPdf } = await import("@/lib/exportPdf")
        await exportPayrollPdf(employee, result, inputs)
      } finally {
        setLoadingComp(false)
      }
    })()
  }

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={loadingPayslip ? <CircularProgress size={16} color="inherit" /> : <DescriptionIcon />}
        onClick={handleExportPayslip}
        disabled={disabled}
        sx={{ borderRadius: 1.5, fontWeight: 700 }}
      >
        {loadingPayslip ? "Exporting Payslip…" : "Export Payslip"}
      </Button>

      <Button
        variant="outlined"
        color="primary"
        startIcon={loadingComp ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={handleExportComputation}
        disabled={disabled}
        sx={{ borderRadius: 1.5, fontWeight: 700 }}
      >
        {loadingComp ? "Exporting…" : "Export Computation"}
      </Button>
    </>
  )
}
