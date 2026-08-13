"use client"

import { useState } from "react"
import { Box, Button, CircularProgress } from "@mui/material"
import { Description as DescriptionIcon, Download as DownloadIcon } from "@mui/icons-material"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/features/payroll/types/payroll"
import { useToast } from "@/shared/context/ToastContext"
import { PdfPaperSizeSelect } from "@/features/payroll/components/PdfPaperSizeSelect"
import { usePdfPaperSize } from "@/lib/exports/usePdfPaperSize"

export interface ExportButtonProps {
  employee: EmployeeInfo | null
  result: PayrollResult | null
  inputs: PayrollInputs | null
}

export function ExportButton({ employee, result, inputs }: ExportButtonProps) {
  const { showToast } = useToast()
  const [paperSize] = usePdfPaperSize()
  const [loadingPayslip, setLoadingPayslip] = useState(false)
  const [loadingComp, setLoadingComp] = useState(false)

  const disabled =
    employee === null || result === null || inputs === null || loadingPayslip || loadingComp

  const handleExportPayslip = () => {
    if (employee === null || result === null || inputs === null || disabled) return
    setLoadingPayslip(true)
    void (async () => {
      try {
        const { exportPayslipPdf } = await import("@/features/payroll/lib/exports/payslipPdf")
        await exportPayslipPdf(employee, result, inputs, paperSize)
      } catch {
        showToast("Payslip export failed. Refresh the page and try again.", "error")
      } finally {
        setLoadingPayslip(false)
      }
    })()
  }

  const handleExportComputation = () => {
    if (employee === null || result === null || inputs === null || disabled) return
    setLoadingComp(true)
    void (async () => {
      try {
        const { exportPayrollPdf } = await import("@/features/payroll/lib/exports/computationPdf")
        await exportPayrollPdf(employee, result, inputs, paperSize)
      } catch {
        showToast("Computation export failed. Refresh the page and try again.", "error")
      } finally {
        setLoadingComp(false)
      }
    })()
  }

  const buttonSx = {
    fontWeight: 600,
    px: 1.5,
    py: 0.625,
    whiteSpace: "nowrap" as const,
    "& .MuiButton-startIcon": { mr: 0.75 },
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
      <PdfPaperSizeSelect fullWidth />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={loadingPayslip ? <CircularProgress size={14} /> : <DescriptionIcon sx={{ fontSize: 17 }} />}
        onClick={handleExportPayslip}
        disabled={disabled}
        sx={buttonSx}
      >
        Payslip
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={loadingComp ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 17 }} />}
        onClick={handleExportComputation}
        disabled={disabled}
        sx={buttonSx}
      >
        Computation
      </Button>
      </Box>
    </Box>
  )
}
