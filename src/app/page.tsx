"use client"

import { useCallback, useState } from "react"

import { ExportButton } from "@/components/ExportButton"
import { PayrollForm } from "@/components/PayrollForm"
import { PaySummary } from "@/components/PaySummary"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"
import logo from "./COS-LOGO.png"

export default function Home() {
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 font-sans selection:bg-emerald-500/30">
      {/* Premium Dark Green Banner */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 no-print shadow-lg" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 no-print flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left border-b border-white/10 pb-6">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <img src={logo.src} alt="COS Logo" className="h-24 w-auto rounded-full" />
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                  Philippine Fiber Industry Development Authority
                </p>
              </div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                COS Salary Calculator
              </h1>
              <p className="mt-2 text-sm text-emerald-100/70">
                Contract of Service — Semi-monthly computation payroll engine
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Core Layout Grid */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left Column: Form Panel */}
          <div className="no-print w-full lg:w-2/5 lg:sticky lg:top-8">
            <PayrollForm onCompute={handleCompute} onReset={handleReset} />
          </div>

          {/* Right Column: Dynamic Output Panel */}
          <div className="flex w-full flex-col gap-6 lg:w-3/5">
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
          </div>
        </div>
      </div>
    </div>
  )
}
