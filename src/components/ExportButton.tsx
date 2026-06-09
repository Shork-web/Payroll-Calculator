"use client"

import { useState } from "react"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

export interface ExportButtonProps {
  employee: EmployeeInfo | null
  result: PayrollResult | null
  inputs: PayrollInputs | null
  type?: "computation" | "table"
  className?: string | undefined
}

export function ExportButton({ employee, result, inputs, type = "computation", className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const disabled =
    employee === null || result === null || inputs === null || loading

  const handleClick = () => {
    if (employee === null || result === null || inputs === null || loading) {
      return
    }

    setLoading(true)

    void (async () => {
      try {
        if (type === "computation") {
          const { exportPayrollPdf } = await import("@/lib/exportPdf")
          await exportPayrollPdf(employee, result, inputs)
        } else {
          const { exportTablePdf } = await import("@/lib/exportTablePdf")
          await exportTablePdf(employee, result, inputs)
        }
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ""}`.trim()}
    >
      {loading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
          Exporting…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {type === "computation" ? "Computation PDF" : "Table PDF"}
        </>
      )}
    </button>
  )
}
