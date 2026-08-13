"use client"

import { useCallback, useState, type Dispatch, type SetStateAction } from "react"
import type { User } from "firebase/auth"
import type {
  EmployeeInfo,
  PayrollEntry,
  PayrollInputs,
  PayrollResult,
  Signatory,
} from "@/features/payroll/types/payroll"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import type { ToastSeverity } from "@/shared/context/ToastContext"
import { entryToFormValues } from "@/features/payroll/lib/entryForm"
import { exportPayrollCsv } from "@/features/payroll/lib/exportCsv"
import {
  deleteEmployee,
  deleteHistoryEntry,
  deletePayrollEntry,
  getUserEntries,
  getUserHistory,
  saveEmployee,
  saveHistoryEntry,
  savePayrollEntry,
  saveUserSignatories,
  type SavedEmployee,
} from "@/lib/db"

interface UsePayrollActionsOptions {
  user: User | null
  showToast: (message: string, severity?: ToastSeverity) => void
  entries: PayrollEntry[]
  setEntries: Dispatch<SetStateAction<PayrollEntry[]>>
  historyEntries: PayrollEntry[]
  setHistoryEntries: Dispatch<SetStateAction<PayrollEntry[]>>
  signatories: Signatory[]
  setSignatories: Dispatch<SetStateAction<Signatory[]>>
  setDbLoading: Dispatch<SetStateAction<boolean>>
  fetchEmployees: () => Promise<void>
}

export function usePayrollActions({
  user,
  showToast,
  entries,
  setEntries,
  historyEntries,
  setHistoryEntries,
  signatories,
  setSignatories,
  setDbLoading,
  fetchEmployees,
}: UsePayrollActionsOptions) {
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [inputs, setInputs] = useState<PayrollInputs | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<PayrollFormInput | null>(null)

  const handleReset = useCallback(() => {
    setResult(null)
    setEmployee(null)
    setInputs(null)
    setEditingEntryId(null)
    setEditValues(null)
  }, [])

  const handleCompute = useCallback(
    (nextResult: PayrollResult, info: EmployeeInfo, nextInputs: PayrollInputs) => {
      setResult(nextResult)
      setEmployee(info)
      setInputs(nextInputs)
    },
    [],
  )

  const handleAddEntry = useCallback(async () => {
    if (!result || !employee || !inputs) return

    const newEntry: PayrollEntry = {
      id: editingEntryId || crypto.randomUUID(),
      employee,
      inputs,
      result,
    }

    if (user) {
      setDbLoading(true)
      try {
        await Promise.all([savePayrollEntry(user.uid, newEntry), saveHistoryEntry(user.uid, newEntry)])

        const savedEmp: SavedEmployee = {
          id: employee.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name: employee.name,
          position: employee.position,
          monthlyRate: inputs.monthlyRate,
          computationType: inputs.computationType,
          workingDays: inputs.workingDays,
          signatoryName: employee.signatoryName,
          signatoryTitle: employee.signatoryTitle,
          payslipSignatoryName: employee.payslipSignatoryName,
          payslipSignatoryTitle: employee.payslipSignatoryTitle,
          payslipSignatories: employee.payslipSignatories,
        }
        await saveEmployee(user.uid, savedEmp)
        await fetchEmployees()

        const [fetchedEntries, fetchedHistory] = await Promise.all([
          getUserEntries(user.uid),
          getUserHistory(user.uid),
        ])
        setEntries(fetchedEntries)
        setHistoryEntries(fetchedHistory)
        showToast(editingEntryId ? "Entry updated in cloud." : "Entry saved to cloud.", "success")
      } catch (error) {
        console.error("Error saving entry:", error)
        showToast("Failed to save entry. Please try again.", "error")
      } finally {
        setDbLoading(false)
      }
    } else if (editingEntryId) {
      setEntries((prev) => prev.map((e) => (e.id === editingEntryId ? newEntry : e)))
      setHistoryEntries((prev) => prev.map((e) => (e.id === editingEntryId ? newEntry : e)))
      showToast("Entry updated locally.", "success")
    } else {
      setEntries((prev) => [...prev, newEntry])
      setHistoryEntries((prev) => [...prev, newEntry])
      showToast("Entry saved locally.", "success")
    }

    if (editingEntryId) {
      setEditingEntryId(null)
      setEditValues(null)
    }
    handleReset()
  }, [
    result,
    employee,
    inputs,
    editingEntryId,
    handleReset,
    user,
    fetchEmployees,
    showToast,
    setDbLoading,
    setEntries,
    setHistoryEntries,
  ])

  const handleEditEntry = useCallback(
    async (id: string) => {
      let target = entries.find((e) => e.id === id)
      if (!target) {
        target = historyEntries.find((e) => e.id === id)
      }
      if (!target) return

      if (!entries.some((e) => e.id === id)) {
        if (user) {
          setDbLoading(true)
          try {
            await savePayrollEntry(user.uid, target)
            const fetched = await getUserEntries(user.uid)
            setEntries(fetched)
          } catch (error) {
            console.error("Error auto-importing history entry:", error)
            showToast("Failed to import entry from history.", "error")
          } finally {
            setDbLoading(false)
          }
        } else {
          setEntries((prev) => [...prev, target!])
        }
      }

      setEditingEntryId(id)
      setEditValues(entryToFormValues(target))
      setResult(target.result)
      setEmployee(target.employee)
      setInputs(target.inputs)
    },
    [entries, historyEntries, user, showToast, setDbLoading, setEntries],
  )

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      if (user) {
        setDbLoading(true)
        try {
          await deletePayrollEntry(user.uid, id)
          const fetchedEntries = await getUserEntries(user.uid)
          setEntries(fetchedEntries)
        } catch (error) {
          console.error("Error deleting entry from sheet:", error)
          showToast("Failed to delete entry.", "error")
        } finally {
          setDbLoading(false)
        }
      } else {
        setEntries((prev) => prev.filter((e) => e.id !== id))
        showToast("Entry removed.", "info")
      }

      if (editingEntryId === id) {
        handleReset()
      }
    },
    [editingEntryId, handleReset, user, showToast, setDbLoading, setEntries],
  )

  const handleDeleteHistoryEntry = useCallback(
    async (id: string) => {
      const entryToDelete = historyEntries.find((e) => e.id === id)
      if (user) {
        setDbLoading(true)
        try {
          await deleteHistoryEntry(user.uid, id)
          const fetchedHistory = await getUserHistory(user.uid)
          setHistoryEntries(fetchedHistory)

          if (entryToDelete) {
            const nameLower = entryToDelete.employee.name.toLowerCase()
            const hasOthers = fetchedHistory.some((e) => e.employee.name.toLowerCase() === nameLower)
            if (!hasOthers) {
              const employeeId = nameLower.replace(/[^a-z0-9]/g, "-")
              await deleteEmployee(user.uid, employeeId)
              await fetchEmployees()
            }
          }
        } catch (error) {
          console.error("Error deleting entry from history:", error)
          showToast("Failed to delete history entry.", "error")
        } finally {
          setDbLoading(false)
        }
      } else {
        setHistoryEntries((prev) => prev.filter((e) => e.id !== id))
        showToast("History entry removed.", "info")
      }
    },
    [user, historyEntries, fetchEmployees, showToast, setDbLoading, setHistoryEntries],
  )

  const handleSignatoriesChange = useCallback(
    async (nextSignatories: Signatory[]) => {
      setSignatories(nextSignatories)
      if (user) {
        try {
          await saveUserSignatories(user.uid, nextSignatories)
        } catch (error) {
          console.error("Error saving signatories:", error)
          showToast("Failed to save signatories.", "error")
        }
      }
    },
    [user, showToast, setSignatories],
  )

  const handleExportConsolidated = useCallback(
    (selectedEntries: PayrollEntry[]) => {
      if (selectedEntries.length === 0) return
      void (async () => {
        const { exportConsolidatedPayrollPdf } = await import("@/features/payroll/lib/exports/consolidatedPdf")
        exportConsolidatedPayrollPdf(selectedEntries, signatories)
      })()
    },
    [signatories],
  )

  const handleExportPayslips = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    void (async () => {
      const { exportBulkPayslipsPdf } = await import("@/features/payroll/lib/exports/payslipPdf")
      const { getPdfPaperSize } = await import("@/lib/exports/pdfShared")
      exportBulkPayslipsPdf(selectedEntries, getPdfPaperSize())
    })()
  }, [])

  const handleExportComputations = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    void (async () => {
      const { exportBulkComputationsPdf } = await import("@/features/payroll/lib/exports/computationPdf")
      const { getPdfPaperSize } = await import("@/lib/exports/pdfShared")
      exportBulkComputationsPdf(selectedEntries, getPdfPaperSize())
    })()
  }, [])

  const handleExportCsv = useCallback((selectedEntries: PayrollEntry[]) => {
    if (selectedEntries.length === 0) return
    exportPayrollCsv(selectedEntries)
  }, [])

  const applyDtrToCalculator = useCallback(
    (
      dtrValues: {
        name: string
        lateMinutes: number
        undertimeMinutes: number
        absentDays: number
        lateIncidents: Array<{
          date: string
          minutes: number
          type: "late" | "undertime" | "absent"
          days?: number
        }>
      },
      savedEmployees: SavedEmployee[],
    ): PayrollFormInput => {
      const matchingEmp = savedEmployees.find((e) => e.name.toLowerCase() === dtrValues.name.toLowerCase())

      return {
        name: dtrValues.name,
        position: matchingEmp?.position || "",
        periodStart: "",
        periodEnd: "",
        monthlyRate: matchingEmp?.monthlyRate || 27000,
        workingDays: matchingEmp?.workingDays || "",
        lateMinutes: dtrValues.lateMinutes,
        undertimeMinutes: dtrValues.undertimeMinutes,
        absentDays: dtrValues.absentDays,
        overpayment: 0,
        underpayment: 0,
        signatoryName: matchingEmp?.signatoryName || "",
        signatoryTitle: matchingEmp?.signatoryTitle || "",
        payslipSignatoryName: matchingEmp?.payslipSignatoryName || "",
        payslipSignatoryTitle: matchingEmp?.payslipSignatoryTitle || "",
        payslipSignatories: matchingEmp?.payslipSignatories || [
          { label: "Certified Correct:", name: "", title: "" },
        ],
        lateDates: "",
        undertimeDates: "",
        lateIncidents: dtrValues.lateIncidents,
        computationType: matchingEmp?.computationType || "semi-monthly",
        additionalTax: 0,
      }
    },
    [],
  )

  return {
    result,
    employee,
    inputs,
    editingEntryId,
    editValues,
    setEditValues,
    handleCompute,
    handleReset,
    handleAddEntry,
    handleEditEntry,
    handleDeleteEntry,
    handleDeleteHistoryEntry,
    handleCancelEdit: handleReset,
    handleSignatoriesChange,
    handleExportConsolidated,
    handleExportPayslips,
    handleExportComputations,
    handleExportCsv,
    applyDtrToCalculator,
  }
}
