"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { Box, Container } from "@mui/material"
import { AuthModal } from "@/shared/components/AuthModal"
import { TabLoadingFallback } from "@/shared/components/TabLoadingFallback"
import { AppHeader } from "@/shared/components/layout/AppHeader"
import { AppTabs } from "@/shared/components/layout/AppTabs"
import { PayrollTab } from "@/features/payroll/PayrollTab"
import { useAuth } from "@/shared/context/AuthContext"
import { useToast } from "@/shared/context/ToastContext"
import { usePayrollData } from "@/features/payroll/hooks/usePayrollData"
import { usePayrollActions } from "@/features/payroll/hooks/usePayrollActions"
import { deleteEmployee, getUserEmployees, type SavedEmployee } from "@/lib/db"
import type { AppTab } from "@/shared/types/app"

const RecordsTab = dynamic(
  () => import("@/features/records/RecordsTab").then((mod) => mod.RecordsTab),
  { loading: () => <TabLoadingFallback label="Loading employee records..." /> },
)

const DtrTab = dynamic(() => import("@/features/dtr/DtrTab").then((mod) => mod.DtrTab), {
  loading: () => <TabLoadingFallback label="Loading DTR creator..." />,
})

export default function Home() {
  const { showToast } = useToast()
  const { user, loading: authLoading, logout, isFirebaseConfigured } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [savedEmployees, setSavedEmployees] = useState<SavedEmployee[]>([])
  const [activeTab, setActiveTab] = useState<AppTab>("calculator")

  const fetchEmployees = useCallback(async () => {
    if (!user) return
    try {
      const emps = await getUserEmployees(user.uid)
      setSavedEmployees(emps)
    } catch (error) {
      console.error("Error fetching employees:", error)
      showToast("Failed to load employee profiles.", "error")
    }
  }, [user, showToast])

  const {
    entries,
    setEntries,
    historyEntries,
    setHistoryEntries,
    signatories,
    setSignatories,
    dbLoading,
    setDbLoading,
    cacheToGuestStorage,
  } = usePayrollData({ user, onEmployeesSync: fetchEmployees })

  const actions = usePayrollActions({
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
  })

  const hasUnsavedDraft =
    actions.result !== null && actions.employee !== null && actions.inputs !== null

  const handleDeleteEmployee = useCallback(
    async (employeeId: string) => {
      if (!user) return
      try {
        await deleteEmployee(user.uid, employeeId)
        await fetchEmployees()
      } catch (error) {
        console.error("Error deleting employee:", error)
        showToast("Failed to delete employee profile.", "error")
      }
    },
    [user, fetchEmployees, showToast],
  )

  const handleLogout = async () => {
    cacheToGuestStorage()
    await logout()
    setSavedEmployees([])
  }

  const handleEditFromRecords = (id: string) => {
    actions.handleEditEntry(id)
    setActiveTab("calculator")
  }

  const handleApplyDtr = (dtrValues: Parameters<typeof actions.applyDtrToCalculator>[0]) => {
    actions.setEditValues(actions.applyDtrToCalculator(dtrValues, savedEmployees))
    setActiveTab("calculator")
  }

  return (
    <Box sx={{ minHeight: "100vh", pb: 4 }}>
      <AppHeader
        user={user}
        authLoading={authLoading}
        dbLoading={dbLoading}
        isFirebaseConfigured={isFirebaseConfigured}
        hasUnsavedDraft={hasUnsavedDraft}
        onSignIn={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <AppTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {activeTab === "calculator" && (
          <PayrollTab
            entries={entries}
            signatories={signatories}
            savedEmployees={savedEmployees}
            result={actions.result}
            inputs={actions.inputs}
            employee={actions.employee}
            editingEntryId={actions.editingEntryId}
            editValues={actions.editValues}
            onCompute={actions.handleCompute}
            onReset={actions.handleReset}
            onAddEntry={actions.handleAddEntry}
            onCancelEdit={actions.handleCancelEdit}
            onEditEntry={actions.handleEditEntry}
            onDeleteEntry={actions.handleDeleteEntry}
            onDeleteEmployee={handleDeleteEmployee}
            onSignatoriesChange={actions.handleSignatoriesChange}
            onExportConsolidated={actions.handleExportConsolidated}
            onExportPayslips={actions.handleExportPayslips}
            onExportComputations={actions.handleExportComputations}
            onExportCsv={actions.handleExportCsv}
          />
        )}

        {activeTab === "records" && (
          <RecordsTab
            entries={historyEntries}
            onEdit={handleEditFromRecords}
            onDelete={actions.handleDeleteHistoryEntry}
          />
        )}

        {activeTab === "dtr" && <DtrTab savedEmployees={savedEmployees} onApplyDtr={handleApplyDtr} />}
      </Container>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </Box>
  )
}
