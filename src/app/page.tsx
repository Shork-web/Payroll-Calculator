"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import {
  Box,
  Container,
  Typography,
  Stack,
  Chip,
  Avatar,
  useTheme,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material"
import {
  CloudDone as CloudSyncIcon,
  CloudOff as CloudOfflineIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material"
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

import { useAuth } from "@/context/AuthContext"
import { AuthModal } from "@/components/AuthModal"
import {
  savePayrollEntry,
  deletePayrollEntry,
  getUserEntries,
  saveUserSignatories,
  getUserSignatories,
  saveEmployee,
  getUserEmployees,
  deleteEmployee,
  mergeLocalEntries,
  saveHistoryEntry,
  deleteHistoryEntry,
  getUserHistory,
  mergeLocalHistory,
  type SavedEmployee,
} from "@/lib/db"

import { EmployeeRecordsViewer } from "@/components/EmployeeRecordsViewer"
import { DtrCreator } from "@/components/DtrCreator"

export default function Home() {
  const theme = useTheme()
  const { user, loading: authLoading, logout, isFirebaseConfigured } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [savedEmployees, setSavedEmployees] = useState<SavedEmployee[]>([])
  const [activeTab, setActiveTab] = useState<"calculator" | "records" | "dtr">("calculator")
  const [dbLoading, setDbLoading] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const [result, setResult] = useState<PayrollResult | null>(null)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [inputs, setInputs] = useState<PayrollInputs | null>(null)

  // Multiple entries state
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [historyEntries, setHistoryEntries] = useState<PayrollEntry[]>([])
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<PayrollFormInput | null>(null)
  const [signatories, setSignatories] = useState<Signatory[]>([
    { label: "Prepared by:", name: "", title: "" },
    { label: "Certified Correct:", name: "", title: "" },
  ])

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    if (!user) return
    try {
      const emps = await getUserEmployees(user.uid)
      setSavedEmployees(emps)
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }, [user])

  // Delete employee profile
  const handleDeleteEmployee = useCallback(async (employeeId: string) => {
    if (!user) return
    try {
      await deleteEmployee(user.uid, employeeId)
      await fetchEmployees()
    } catch (error) {
      console.error("Error deleting employee:", error)
    }
  }, [user, fetchEmployees])

  const entriesRef = useRef(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const historyEntriesRef = useRef(historyEntries)
  useEffect(() => {
    historyEntriesRef.current = historyEntries
  }, [historyEntries])

  // Load entries from LocalStorage on mount for guest users
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("philfida_payroll_entries")
      if (stored) {
        try {
          setEntries(JSON.parse(stored))
        } catch (e) {
          console.error("Error parsing stored entries", e)
        }
      }
      const storedHistory = localStorage.getItem("philfida_payslip_history")
      if (storedHistory) {
        try {
          setHistoryEntries(JSON.parse(storedHistory))
        } catch (e) {
          console.error("Error parsing stored history", e)
        }
      }
    }
  }, [])

  // Save guest entries and history to LocalStorage
  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      localStorage.setItem("philfida_payroll_entries", JSON.stringify(entries))
    }
  }, [entries, user])

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      localStorage.setItem("philfida_payslip_history", JSON.stringify(historyEntries))
    }
  }, [historyEntries, user])

  // Sync data when user login state changes
  useEffect(() => {
    let active = true

    const syncData = async () => {
      if (!user) {
        setEntries([])
        setHistoryEntries([])
        setSavedEmployees([])
        setSignatories([
          { label: "Prepared by:", name: "", title: "" },
          { label: "Certified Correct:", name: "", title: "" },
        ])
        return
      }

      setDbLoading(true)
      try {
        // If they had entries locally as guest, merge them into their database
        const localEntries = entriesRef.current
        if (localEntries.length > 0) {
          await mergeLocalEntries(user.uid, localEntries)
        }

        const localHistory = historyEntriesRef.current
        if (localHistory.length > 0) {
          await mergeLocalHistory(user.uid, localHistory)
        }

        const [cloudEntries, cloudHistory, cloudSignatories, cloudEmployees] = await Promise.all([
          getUserEntries(user.uid),
          getUserHistory(user.uid),
          getUserSignatories(user.uid),
          getUserEmployees(user.uid),
        ])

        if (!active) return

        setEntries(cloudEntries)
        setHistoryEntries(cloudHistory)
        setSavedEmployees(cloudEmployees)
        if (cloudSignatories) {
          setSignatories(cloudSignatories)
        }
      } catch (error) {
        console.error("Error syncing cloud data:", error)
      } finally {
        if (active) setDbLoading(false)
      }
    }

    syncData()

    return () => {
      active = false
    }
  }, [user])

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogoutClick = async () => {
    handleUserMenuClose()
    await logout()
  }

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
        await Promise.all([
          savePayrollEntry(user.uid, newEntry),
          saveHistoryEntry(user.uid, newEntry)
        ])
        
        // Auto-save/update employee profile in the background
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
          getUserHistory(user.uid)
        ])
        setEntries(fetchedEntries)
        setHistoryEntries(fetchedHistory)
      } catch (error) {
        console.error("Error saving entry:", error)
      } finally {
        setDbLoading(false)
      }
    } else {
      if (editingEntryId) {
        setEntries((prev) => prev.map((e) => (e.id === editingEntryId ? newEntry : e)))
        setHistoryEntries((prev) => prev.map((e) => (e.id === editingEntryId ? newEntry : e)))
      } else {
        setEntries((prev) => [...prev, newEntry])
        setHistoryEntries((prev) => [...prev, newEntry])
      }
    }

    if (editingEntryId) {
      setEditingEntryId(null)
      setEditValues(null)
    }
    handleReset()
  }, [result, employee, inputs, editingEntryId, handleReset, user, fetchEmployees])

  const handleEditEntry = useCallback(
    async (id: string) => {
      let target = entries.find((e) => e.id === id)
      if (!target) {
        target = historyEntries.find((e) => e.id === id)
      }
      if (!target) return

      // Import back to active entries sheet if not already there
      if (!entries.some((e) => e.id === id)) {
        if (user) {
          setDbLoading(true)
          try {
            await savePayrollEntry(user.uid, target)
            const fetched = await getUserEntries(user.uid)
            setEntries(fetched)
          } catch (e) {
            console.error("Error auto-importing history entry:", e)
          } finally {
            setDbLoading(false)
          }
        } else {
          setEntries((prev) => [...prev, target])
        }
      }

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
    [entries, historyEntries, user],
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
        } finally {
          setDbLoading(false)
        }
      } else {
        setEntries((prev) => prev.filter((e) => e.id !== id))
      }

      if (editingEntryId === id) {
        handleReset()
      }
    },
    [editingEntryId, handleReset, user],
  )

  const handleDeleteHistoryEntry = useCallback(
    async (id: string) => {
      if (user) {
        setDbLoading(true)
        try {
          await deleteHistoryEntry(user.uid, id)
          const fetchedHistory = await getUserHistory(user.uid)
          setHistoryEntries(fetchedHistory)
        } catch (error) {
          console.error("Error deleting entry from history:", error)
        } finally {
          setDbLoading(false)
        }
      } else {
        setHistoryEntries((prev) => prev.filter((e) => e.id !== id))
      }
    },
    [user],
  )

  const handleCancelEdit = useCallback(() => {
    handleReset()
  }, [handleReset])

  const handleSignatoriesChange = useCallback(
    async (nextSignatories: Signatory[]) => {
      setSignatories(nextSignatories)
      if (user) {
        try {
          await saveUserSignatories(user.uid, nextSignatories)
        } catch (error) {
          console.error("Error saving signatories:", error)
        }
      }
    },
    [user],
  )

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Cloud Sync Status Indicator */}
              {isFirebaseConfigured && (
                <Tooltip title={user ? "All data is securely synced to your cloud account" : "Running locally as guest. Log in to persist data."}>
                  <Chip
                    icon={user ? <CloudSyncIcon style={{ color: "#34d399" }} /> : <CloudOfflineIcon style={{ color: "#94a3b8" }} />}
                    label={dbLoading ? "Syncing..." : user ? "Cloud Synced" : "Guest Mode (Local)"}
                    size="small"
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor: user
                        ? mode === "dark" ? "rgba(52, 211, 153, 0.1)" : "rgba(5, 150, 105, 0.05)"
                        : mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                      color: user
                        ? mode === "dark" ? "#34d399" : "#059669"
                        : "text.secondary",
                      border: 1,
                      borderColor: user
                        ? mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "rgba(5, 150, 105, 0.15)"
                        : mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                      "& .MuiChip-icon": {
                        marginLeft: "6px",
                        marginRight: "-4px"
                      }
                    }}
                  />
                </Tooltip>
              )}

              {/* Authentication Controls */}
              {authLoading ? (
                <CircularProgress size={20} sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
              ) : user ? (
                <>
                  <Button
                    onClick={handleUserMenuOpen}
                    size="small"
                    variant="text"
                    endIcon={<ArrowDownIcon />}
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      border: 1,
                      borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                      bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      "&:hover": {
                        bgcolor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      }
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 20,
                        height: 20,
                        fontSize: "0.65rem",
                        mr: 1,
                        bgcolor: mode === "dark" ? "#047857" : "#10b981",
                        color: "white",
                        fontWeight: 800
                      }}
                    >
                      {user.email?.charAt(0).toUpperCase()}
                    </Avatar>
                    <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </span>
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleUserMenuClose}
                    disableScrollLock
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1,
                          minWidth: 180,
                          borderRadius: 2,
                          border: 1,
                          borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                          boxShadow: mode === "dark" ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                        }
                      }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Logged in as</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.825rem", wordBreak: "break-all" }}>{user.email}</Typography>
                    </Box>
                    <MenuItem onClick={handleLogoutClick} sx={{ color: "error.main", fontWeight: 600, fontSize: "0.85rem", gap: 1 }}>
                      <LogoutIcon fontSize="small" />
                      Sign Out
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  onClick={() => setAuthModalOpen(true)}
                  size="small"
                  variant="outlined"
                  startIcon={<LoginIcon />}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    borderRadius: 2,
                    borderColor: mode === "dark" ? "rgba(52, 211, 153, 0.4)" : "rgba(5, 150, 105, 0.3)",
                    color: mode === "dark" ? "#6ee7b7" : "#059669",
                    "&:hover": {
                      borderColor: mode === "dark" ? "#34d399" : "#047857",
                      backgroundColor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                    }
                  }}
                >
                  Sign In
                </Button>
              )}
              <ThemeToggle />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Tab Navigation Bar */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "rgba(255,255,255,0.5)" }}>
        <Container maxWidth="xl">
          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            sx={{
              "& .MuiTabs-indicator": {
                backgroundColor: mode === "dark" ? "#34d399" : "#059669",
              },
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "none",
                minHeight: 48,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: mode === "dark" ? "#34d399" : "#059669",
                },
              },
            }}
          >
            <Tab value="calculator" label="Payroll Calculator" />
            <Tab value="records" label="Employee Records & Payslips" />
            <Tab value="dtr" label="DTR Creator (Form 48)" />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {activeTab === "calculator" ? (
          <>
            {/* Core Layout Grid */}
            <Stack spacing={2} sx={{ mb: 2 }}>
              <PayrollForm
                onCompute={handleCompute}
                onReset={handleReset}
                editValues={editValues}
                savedEmployees={savedEmployees}
                onDeleteEmployee={handleDeleteEmployee}
              />
              
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
                onSignatoriesChange={handleSignatoriesChange}
              />
            </Box>
          </>
        ) : activeTab === "records" ? (
          <EmployeeRecordsViewer
            entries={historyEntries}
            onEdit={(id) => {
              handleEditEntry(id)
              setActiveTab("calculator")
            }}
            onDelete={handleDeleteHistoryEntry}
          />
        ) : (
          <DtrCreator
            savedEmployees={savedEmployees}
            onApplyDtr={(dtrValues) => {
              const matchingEmp = savedEmployees.find(
                (e) => e.name.toLowerCase() === dtrValues.name.toLowerCase()
              )
              const newEditValues: PayrollFormInput = {
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
                signatoryName: matchingEmp?.signatoryName || "",
                signatoryTitle: matchingEmp?.signatoryTitle || "",
                payslipSignatoryName: matchingEmp?.payslipSignatoryName || "",
                payslipSignatoryTitle: matchingEmp?.payslipSignatoryTitle || "",
                payslipSignatories: matchingEmp?.payslipSignatories || [
                  { label: "Certified Correct:", name: "", title: "" }
                ],
                lateDates: "",
                undertimeDates: "",
                lateIncidents: dtrValues.lateIncidents,
                computationType: matchingEmp?.computationType || "semi-monthly",
                additionalTax: 0,
              }
              setEditValues(newEditValues)
              setActiveTab("calculator")
            }}
          />
        )}
      </Container>

      {/* Authentication Modal */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </Box>
  )
}
