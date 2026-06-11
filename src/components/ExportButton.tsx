"use client"

import { useState } from "react"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

export interface ExportButtonProps {
  employee: EmployeeInfo | null
  result: PayrollResult | null
  inputs: PayrollInputs | null
  className?: string | undefined
}

export function ExportButton({ employee, result, inputs, className }: ExportButtonProps) {
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
    <div className={`flex flex-wrap gap-2.5 ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={handleExportPayslip}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loadingPayslip ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
            Exporting Payslip…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Payslip
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleExportComputation}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loadingComp ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
              aria-hidden
            />
            Exporting…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Computation
          </>
        )}
      </button>
    </div>
  )
}
