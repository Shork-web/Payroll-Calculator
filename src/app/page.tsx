"use client"

import { useCallback, useState } from "react"

import { ExportButton } from "@/components/ExportButton"
import { PayrollForm } from "@/components/PayrollForm"
import { PaySummary } from "@/components/PaySummary"
import { PayslipPreview } from "@/components/PayslipPreview"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"
import logo from "./COS-LOGO.png"

type TabType = "breakdown" | "payslip"

export default function Home() {
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [inputs, setInputs] = useState<PayrollInputs | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("breakdown")

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
            <div className="no-print flex flex-col gap-6">
              {/* Tab Selector & Controls Card */}
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-xl shadow-gray-200/40 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80 dark:shadow-none flex flex-col xl:flex-row justify-between items-center gap-4">
                {/* Segmented Control Tabs */}
                <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-900 w-full xl:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("breakdown")}
                    className={`flex-1 xl:flex-initial flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      activeTab === "breakdown"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Live Computation
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payslip")}
                    className={`flex-1 xl:flex-initial flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      activeTab === "payslip"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Payslip Preview
                  </button>
                </div>

                {/* Unified Toolbar */}
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full xl:w-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 dark:border-gray-800">
                  <PrintPayslipButton disabled={!canExport} />
                  <ExportButton employee={employee} result={result} inputs={inputs} type="computation" className="w-full sm:w-auto" />
                  <ExportButton employee={employee} result={result} inputs={inputs} type="table" className="w-full sm:w-auto" />
                </div>
              </div>

              {/* Dynamic Viewport */}
              <div className="transition-all duration-300">
                {activeTab === "breakdown" ? (
                  <PaySummary result={result} />
                ) : (
                  <PayslipPreview employee={employee} result={result} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Payslip for Print media query */}
      <PayslipPreview
        employee={employee}
        result={result}
        className="print-only mx-auto w-full max-w-4xl print:max-w-none print:border-0 print:p-8"
      />
    </div>
  )
}

function PrintPayslipButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={disabled}
      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-850"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print
    </button>
  )
}
