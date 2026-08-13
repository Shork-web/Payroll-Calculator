"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Stack,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Divider,
  Chip,
  Card,
  CardContent,
  ListSubheader,
} from "@mui/material"
import {
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Autorenew as FillIcon,
} from "@mui/icons-material"
import { useConfirmDialog } from "@/shared/hooks/useConfirmDialog"
import { saveDtr, deleteDtr, getUserDtrs, type SavedEmployee } from "@/lib/db"
import type { DtrDayLog, SavedDtr } from "@/features/dtr/types/dtr"
import { useAuth } from "@/shared/context/AuthContext"
import { useToast } from "@/shared/context/ToastContext"
import { clearGuestDtrs, loadGuestDtrs, saveGuestDtrs } from "@/shared/lib/storage/guestStorage"
import { DTR_MONTHS, LEAVE_NAMES_MAP } from "@/features/dtr/lib/dtrConstants"
import { getDefaultTimesForDay } from "@/features/dtr/lib/dtrTimeUtils"
import { computeDayAdjustments } from "@/features/dtr/lib/dayAdjustments"
import { DtrLeaveLegend } from "@/features/dtr/components/DtrLeaveLegend"

interface DtrCreatorProps {
  savedEmployees?: SavedEmployee[]
  onApplyDtr: (data: {
    name: string
    lateMinutes: number
    undertimeMinutes: number
    absentDays: number
    lateIncidents: Array<{ date: string; minutes: number; type: "late" | "undertime" | "absent"; days?: number }>
  }) => void
}

export function DtrCreator({ savedEmployees = [], onApplyDtr }: DtrCreatorProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { user } = useAuth()
  const { showToast } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [employeeName, setEmployeeName] = useState<string>("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const [supervisorName, setSupervisorName] = useState<string>("")
  const [supervisorTitle, setSupervisorTitle] = useState<string>("")

  // Custom Form 48 Headers (matching reference image)
  const [cutoffPeriod, setCutoffPeriod] = useState<"1st-half" | "2nd-half" | "full-month">("full-month")
  const [dtrNo, setDtrNo] = useState<string>("")
  const [designation, setDesignation] = useState<string>("")
  const [department, setDepartment] = useState<string>("")
  const [timeScheduleFrom, setTimeScheduleFrom] = useState<string>("8:00 AM")
  const [timeScheduleTo, setTimeScheduleTo] = useState<string>("5:00 PM")
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "legal">("a4")
  const [layoutOption, setLayoutOption] = useState<"single" | "duplicate" | "split">("single")

  // Saved DTR management state
  const [savedDtrs, setSavedDtrs] = useState<SavedDtr[]>([])
  const [selectedDtrId, setSelectedDtrId] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  // Load saved DTRs from cloud or local guest storage
  useEffect(() => {
    let active = true

    const loadDtrs = async () => {
      if (user?.uid) {
        try {
          const guestDtrs = loadGuestDtrs()
          if (guestDtrs.length > 0) {
            await Promise.all(guestDtrs.map((dtr) => saveDtr(user.uid, dtr)))
            clearGuestDtrs()
            showToast("Guest DTR data synced to your cloud account.", "success")
          }

          const list = await getUserDtrs(user.uid)
          if (!active) return
          setSavedDtrs(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
        } catch (err) {
          console.error("Error loading DTRs:", err)
          showToast("Failed to load saved DTRs.", "error")
        }
      } else {
        setSavedDtrs(loadGuestDtrs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      }
    }

    loadDtrs()

    return () => {
      active = false
    }
  }, [user, showToast])

  const skipMonthYearEffectRef = useRef(false)

  const handleLoadDtr = (dtrId: string) => {
    if (!dtrId) {
      setSelectedDtrId("")
      return
    }
    if (dtrId === "empty-template") {
      skipMonthYearEffectRef.current = true
      setSelectedDtrId("empty-template")
      setEmployeeName("")
      setDtrNo("")
      setDesignation("")
      setDepartment("")
      setTimeScheduleFrom("8:00 AM")
      setTimeScheduleTo("5:00 PM")
      setSupervisorName("")
      setSupervisorTitle("")
      setSelectedEmployeeId("")
      setCutoffPeriod("full-month")
      setPaperSize("a4")
      setLayoutOption("single")

      // Regenerate fresh blank days
      const daysInMonth = new Date(year, month, 0).getDate()
      const list: DtrDayLog[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d)
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
        const defaults = isWeekend
          ? { amIn: "", amOut: "", pmIn: "", pmOut: "" }
          : getDefaultTimesForDay()

        list.push({
          day: d,
          dayName,
          amIn: defaults.amIn,
          amOut: defaults.amOut,
          pmIn: defaults.pmIn,
          pmOut: defaults.pmOut,
          status: isWeekend ? "weekend" : "regular",
          lateMinutes: 0,
          undertimeMinutes: 0,
        })
      }
      setDays(list)
      showToast("Loaded empty DTR template", "info")
      return
    }

    const dtr = savedDtrs.find((d) => d.id === dtrId)
    if (!dtr) return

    skipMonthYearEffectRef.current = true

    setSelectedEmployeeId("")
    setEmployeeName(dtr.employeeName)
    setMonth(dtr.month)
    setYear(dtr.year)
    setCutoffPeriod(dtr.cutoffPeriod)
    setDtrNo(dtr.dtrNo)
    setDesignation(dtr.designation)
    setDepartment(dtr.department)
    setTimeScheduleFrom(dtr.timeScheduleFrom)
    setTimeScheduleTo(dtr.timeScheduleTo)
    setSupervisorName(dtr.supervisorName)
    setSupervisorTitle(dtr.supervisorTitle)
    setDays(dtr.days)
    setSelectedDtrId(dtr.id)
    showToast(`Loaded DTR for ${dtr.employeeName}`, "success")
  }

  const handleSaveDtr = async () => {
    setIsSaving(true)
    try {
      const activeName = employeeName.trim() || "Employee Name"
      const dtrId = (selectedDtrId && selectedDtrId !== "empty-template")
        ? selectedDtrId
        : `${activeName.replace(/\s+/g, "_")}_${year}_${month}_${cutoffPeriod}`

      const newDtr: SavedDtr = {
        id: dtrId,
        employeeName: activeName,
        month,
        year,
        cutoffPeriod,
        dtrNo,
        designation,
        department,
        timeScheduleFrom,
        timeScheduleTo,
        supervisorName,
        supervisorTitle,
        days,
        updatedAt: new Date().toISOString(),
      }

      if (user?.uid) {
        await saveDtr(user.uid, newDtr)
        const list = await getUserDtrs(user.uid)
        setSavedDtrs(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
        showToast("DTR saved to cloud.", "success")
      } else {
        const list = [...savedDtrs.filter((d) => d.id !== dtrId), newDtr].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        )
        setSavedDtrs(list)
        saveGuestDtrs(list)
        showToast("DTR saved locally.", "success")
      }

      setSelectedDtrId(dtrId)
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : String(err)
      showToast("Failed to save DTR: " + errMsg, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDtr = async (dtrId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dtrId === "empty-template") return

    const dtr = savedDtrs.find((d) => d.id === dtrId)
    const confirmed = await confirm({
      title: "Delete saved DTR?",
      message: dtr
        ? `Delete the saved DTR for ${dtr.employeeName}? This cannot be undone.`
        : "Delete this saved DTR? This cannot be undone.",
      confirmLabel: "Delete",
      confirmColor: "error",
    })
    if (!confirmed) return

    try {
      if (user?.uid) {
        await deleteDtr(user.uid, dtrId)
        const list = await getUserDtrs(user.uid)
        setSavedDtrs(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      } else {
        const list = savedDtrs.filter((d) => d.id !== dtrId)
        setSavedDtrs(list)
        saveGuestDtrs(list)
      }

      if (selectedDtrId === dtrId) {
        setSelectedDtrId("")
      }
      showToast("DTR deleted.", "success")
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : String(err)
      showToast("Failed to delete DTR: " + errMsg, "error")
    }
  }

  // Default Prescribed Office Hours Configuration

  const [days, setDays] = useState<DtrDayLog[]>([])

  // Watch employee dropdown selection
  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = savedEmployees.find((e) => e.id === selectedEmployeeId)
      if (emp) {
        setEmployeeName(emp.name)
        setSupervisorName(emp.signatoryName || "")
        setSupervisorTitle(emp.signatoryTitle || "")
        setDesignation(emp.position || "")
      }
    }
  }, [selectedEmployeeId, savedEmployees])

  // Generate calendar days whenever Month/Year changes
  useEffect(() => {
    if (skipMonthYearEffectRef.current) {
      skipMonthYearEffectRef.current = false
      return
    }

    const daysInMonth = new Date(year, month, 0).getDate()
    const list: DtrDayLog[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d)
      const dayOfWeek = date.getDay() // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
      const defaults = isWeekend
        ? { amIn: "", amOut: "", pmIn: "", pmOut: "" }
        : getDefaultTimesForDay()

      list.push({
        day: d,
        dayName,
        amIn: defaults.amIn,
        amOut: defaults.amOut,
        pmIn: defaults.pmIn,
        pmOut: defaults.pmOut,
        status: isWeekend ? "weekend" : "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
    }

    setDays(list)
  }, [year, month])

  // Update field handler
  const handleLogChange = (dayNum: number, field: keyof DtrDayLog, value: string) => {
    setDays((prev) =>
      prev.map((log) => {
        if (log.day !== dayNum) return log

        const updated = { ...log, [field]: value } as DtrDayLog

        // Handle status change side effects
        if (field === "status") {
          if (value === "leave-cto-am") {
            const defaults = getDefaultTimesForDay()
            updated.amIn = ""
            updated.amOut = ""
            updated.pmIn = defaults.pmIn
            updated.pmOut = defaults.pmOut
            updated.location = ""
            updated.specialNote = ""
          } else if (value === "leave-cto-pm") {
            const defaults = getDefaultTimesForDay()
            updated.amIn = defaults.amIn
            updated.amOut = defaults.amOut
            updated.pmIn = ""
            updated.pmOut = ""
            updated.location = ""
            updated.specialNote = ""
          } else if (
            value === "weekend" ||
            value === "holiday" ||
            value === "special-holiday" ||
            value === "absent" ||
            value === "leave" ||
            value === "ob" ||
            (value.startsWith("leave-") && value !== "leave-cto-am" && value !== "leave-cto-pm")
          ) {
            // Non-working statuses — clear all time fields
            updated.amIn = ""
            updated.amOut = ""
            updated.pmIn = ""
            updated.pmOut = ""
            if (value !== "ob") {
              updated.location = ""
            }
          } else if (value === "special") {
            // Special Case — preserve any times the user already entered.
            // Just clear the location field (not needed for special).
            updated.location = ""
          } else {
            // Back to regular — restore default schedule
            const defaults = getDefaultTimesForDay()
            updated.amIn = defaults.amIn
            updated.amOut = defaults.amOut
            updated.pmIn = defaults.pmIn
            updated.pmOut = defaults.pmOut
            updated.location = ""
            updated.specialNote = ""
          }
        }

        const { lateMinutes, undertimeMinutes } = computeDayAdjustments(updated)
        updated.lateMinutes = lateMinutes
        updated.undertimeMinutes = undertimeMinutes

        return updated
      })
    )
  }

  // Set default hours on all working weekdays
  const handleApplyDefaultSchedule = () => {
    setDays((prev) =>
      prev.map((log) => {
        if (log.status !== "regular" && log.status !== "special") return log
        const defaults = getDefaultTimesForDay()
        const updated = {
          ...log,
          amIn: defaults.amIn,
          amOut: defaults.amOut,
          pmIn: defaults.pmIn,
          pmOut: defaults.pmOut,
        }
        const { lateMinutes, undertimeMinutes } = computeDayAdjustments(updated)
        updated.lateMinutes = lateMinutes
        updated.undertimeMinutes = undertimeMinutes
        return updated
      })
    )
    showToast("Default schedule filled for weekdays!", "info")
  }

  // Totals calculations based on selected cutoff
  const totals = useMemo(() => {
    let lates = 0
    let undertimes = 0
    let absents = 0
    let regulars = 0

    days.forEach((log) => {
      const inRange =
        cutoffPeriod === "full-month" ||
        (cutoffPeriod === "1st-half" && log.day <= 15) ||
        (cutoffPeriod === "2nd-half" && log.day >= 16)

      if (inRange) {
        if (log.status === "absent") {
          absents += 1
        } else if (log.status === "regular" || log.status === "special") {
          regulars += 1
          lates += log.lateMinutes
          undertimes += log.undertimeMinutes
        }
      }
    })

    return { lates, undertimes, absents, regulars }
  }, [days, cutoffPeriod])

  // Filter visible day rows in editor grid based on cutoff
  const visibleDays = useMemo(() => {
    return days.filter((log) => {
      if (cutoffPeriod === "1st-half") return log.day <= 15
      if (cutoffPeriod === "2nd-half") return log.day >= 16
      return true
    })
  }, [days, cutoffPeriod])

  const monthLabel = DTR_MONTHS.find((m) => m.value === month)?.label || "Month"
  const monthYearLabel = `${monthLabel} ${year}`

  // Apply inputs directly to the payroll calculator
  const handleApplyToCalculator = () => {
    const activeName = employeeName.trim() || "Employee"
    
    // Compile itemized incident log lines filtered by selected cutoff
    const incidents: Array<{ date: string; minutes: number; type: "late" | "undertime" | "absent"; days?: number }> = []

    days.forEach((log) => {
      const inRange =
        cutoffPeriod === "full-month" ||
        (cutoffPeriod === "1st-half" && log.day <= 15) ||
        (cutoffPeriod === "2nd-half" && log.day >= 16)

      if (inRange) {
        const dateStr = `${monthLabel} ${log.day}`
        if (log.status === "absent") {
          incidents.push({ date: dateStr, minutes: 0, type: "absent", days: 1 })
        } else if (log.status === "regular" || log.status === "special") {
          if (log.lateMinutes > 0) {
            incidents.push({ date: dateStr, minutes: log.lateMinutes, type: "late" })
          }
          if (log.undertimeMinutes > 0) {
            incidents.push({ date: dateStr, minutes: log.undertimeMinutes, type: "undertime" })
          }
        }
      }
    })

    onApplyDtr({
      name: activeName,
      lateMinutes: totals.lates,
      undertimeMinutes: totals.undertimes,
      absentDays: totals.absents,
      lateIncidents: incidents,
    })
    showToast("DTR data applied to calculator!", "success")
  }

  const handleExportPdf = () => {
    const activeName = employeeName.trim() || "Employee Name"
    showToast("Generating DTR PDF...", "info")
    void (async () => {
      const { exportDtrPdf } = await import("@/features/dtr/lib/exports/dtrPdf")
      exportDtrPdf(
        activeName,
        monthYearLabel,
        days,
        supervisorName,
        supervisorTitle,
        cutoffPeriod,
        dtrNo,
        designation,
        department,
        timeScheduleFrom,
        timeScheduleTo,
        monthLabel,
        year,
        paperSize,
        layoutOption,
      )
    })()
  }

  return (
    <>
    <Grid container spacing={3}>
      {/* 1. Control Panel Details */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2.5,
              border: 1,
              borderColor: "divider",
              bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
              DTR Generator Parameters
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                select
                label="DTR Period (Cutoff)"
                size="small"
                fullWidth
                value={cutoffPeriod}
                onChange={(e) => setCutoffPeriod(e.target.value as "1st-half" | "2nd-half" | "full-month")}
              >
                <MenuItem value="full-month">Full Month (1st-End)</MenuItem>
                <MenuItem value="1st-half">1st Half (1st-15th)</MenuItem>
                <MenuItem value="2nd-half">2nd Half (16th-End)</MenuItem>
              </TextField>

              <TextField
                select
                label="Paper Size"
                size="small"
                fullWidth
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as "a4" | "letter" | "legal")}
              >
                <MenuItem value="a4">A4 (210 x 297 mm)</MenuItem>
                <MenuItem value="letter">Letter (Short - 8.5&quot; x 11&quot;)</MenuItem>
                <MenuItem value="legal">Legal (Folio - 8.5&quot; x 13&quot;)</MenuItem>
              </TextField>

              <TextField
                select
                label="PDF Layout Option"
                size="small"
                fullWidth
                value={layoutOption}
                onChange={(e) => setLayoutOption(e.target.value as "single" | "duplicate" | "split")}
              >
                <MenuItem value="single">Single Copy (Left Only)</MenuItem>
                <MenuItem value="duplicate">Standard Duplicate (Side-by-Side)</MenuItem>
                <MenuItem value="split">Region VII - Template</MenuItem>
              </TextField>

              <TextField
                select
                label="Month"
                size="small"
                fullWidth
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {DTR_MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Year"
                type="number"
                size="small"
                fullWidth
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />

              <Divider />

              {(user || savedDtrs.length > 0) && (
                <TextField
                  select
                  label="Load Saved DTR / Template"
                  size="small"
                  fullWidth
                  value={selectedDtrId}
                  onChange={(e) => handleLoadDtr(e.target.value)}
                  slotProps={{
                    select: {
                      renderValue: (value) => {
                        if (value === "empty-template") return "Empty Template"
                        const selected = savedDtrs.find((d) => d.id === value)
                        return selected ? `${selected.employeeName} - ${DTR_MONTHS.find(m => m.value === selected.month)?.label} ${selected.year} (${selected.cutoffPeriod})` : ""
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>-- Select to Load --</em>
                  </MenuItem>
                  <MenuItem value="empty-template">
                    <strong>-- Empty Template --</strong>
                  </MenuItem>
                  {savedDtrs.map((dtr) => (
                    <MenuItem key={dtr.id} value={dtr.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" noWrap>
                        {dtr.employeeName} ({DTR_MONTHS.find(m => m.value === dtr.month)?.label.substring(0, 3)} {dtr.year} - {dtr.cutoffPeriod === "full-month" ? "Full" : dtr.cutoffPeriod === "1st-half" ? "1st" : "2nd"})
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => handleDeleteDtr(dtr.id, e)}
                        sx={{ minWidth: 0, ml: 1, p: 0.5 }}
                      >
                        Delete
                      </Button>
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {savedEmployees.length > 0 && (
                <TextField
                  select
                  label="Select Profile Employee"
                  size="small"
                  fullWidth
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>-- Custom / Manual Entry --</em>
                  </MenuItem>
                  {savedEmployees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label="Employee Name"
                size="small"
                placeholder="e.g. JUAN DELA CRUZ"
                fullWidth
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />

              <TextField
                label="DTR Card No. (optional)"
                size="small"
                placeholder="e.g. 48"
                fullWidth
                value={dtrNo}
                onChange={(e) => setDtrNo(e.target.value)}
              />

              <TextField
                label="Designation / Position"
                size="small"
                placeholder="e.g. Project Development Officer I"
                fullWidth
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />

              <TextField
                label="Department"
                size="small"
                placeholder="e.g. AFMD-MIS"
                fullWidth
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Schedule From"
                    size="small"
                    placeholder="8:00 AM"
                    value={timeScheduleFrom}
                    onChange={(e) => setTimeScheduleFrom(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Schedule To"
                    size="small"
                    placeholder="5:00 PM"
                    value={timeScheduleTo}
                    onChange={(e) => setTimeScheduleTo(e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Supervisor Name"
                size="small"
                placeholder="e.g. MARIA SANTOS"
                fullWidth
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
              />

              <TextField
                label="Supervisor Title"
                size="small"
                placeholder="e.g. Regional Director"
                fullWidth
                value={supervisorTitle}
                onChange={(e) => setSupervisorTitle(e.target.value)}
              />
            </Stack>
          </Paper>

          {/* Regular Office Schedule */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2.5,
              border: 1,
              borderColor: "divider",
              bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Prescribed Office Hours
            </Typography>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                • <strong>Monday Flexi:</strong> 7-4 or 8-5 (arrive 7am - 8am)
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                • <strong>Tue - Fri Flexi:</strong> 7-4, 8-5, or 9-6 (arrive 7am - 9am)
              </Typography>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<FillIcon />}
              onClick={handleApplyDefaultSchedule}
              sx={{ mt: 2, fontWeight: 700, borderRadius: 1.5 }}
            >
              Fill Default Weekdays
            </Button>
          </Paper>

          {/* DTR Calculation Summary card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: 1,
              borderColor: mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "rgba(5, 150, 105, 0.15)",
              bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.02)" : "rgba(5, 150, 105, 0.01)",
            }}
          >
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: mode === "dark" ? "#6ee7b7" : "#047857" }}>
                Period Totals Summary
              </Typography>

              <Stack spacing={1.5}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Days Logged</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{totals.regulars} days</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Total Absences</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: totals.absents > 0 ? "error.main" : "text.primary" }}>
                    {totals.absents} day{totals.absents !== 1 ? "s" : ""}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Total Late Minutes</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: totals.lates > 0 ? "error.main" : "text.primary" }}>
                    {totals.lates} mins
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Total Undertime Minutes</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: totals.undertimes > 0 ? "error.main" : "text.primary" }}>
                    {totals.undertimes} mins
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    fullWidth
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleApplyToCalculator}
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Apply to Calculator
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    color="secondary"
                    startIcon={<PdfIcon />}
                    onClick={handleExportPdf}
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Export DTR PDF
                  </Button>
                </Stack>

                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={handleSaveDtr}
                  disabled={isSaving}
                  sx={{ fontWeight: 700, borderRadius: 1.5 }}
                >
                  {selectedDtrId && selectedDtrId !== "empty-template"
                    ? "Update Saved DTR"
                    : user
                      ? "Save DTR to Account"
                      : "Save DTR Locally"}
                </Button>
                {!user && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                    Sign in to sync DTR worksheets across devices.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* 2. Interactive Calendar Log Grid Table */}
      <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", flexDirection: "column" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            border: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            height: { xs: "auto", md: "100%" },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Civil Service Form No. 48 Editor
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Daily Time Record worksheet for {monthYearLabel}
              </Typography>
            </Box>
            <Chip
              label={`${totals.lates + totals.undertimes} mins deduction totals`}
              color={(totals.lates + totals.undertimes) > 0 ? "error" : "success"}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <TableContainer
            sx={{
              flexGrow: 1,
              height: { xs: "auto", md: 0 },
              maxHeight: { xs: 600, md: "none" },
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>AM IN</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>AM OUT</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>PM IN</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>PM OUT</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Late</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">UT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleDays.map((log) => {
                  const isRegular = log.status === "regular" || log.status === "special"
                  const isAmEnabled = isRegular || log.status === "leave-cto-pm"
                  const isPmEnabled = isRegular || log.status === "leave-cto-am"
                  return (
                    <React.Fragment key={log.day}>
                      <TableRow
                        sx={{
                          bgcolor:
                            log.status === "weekend"
                              ? mode === "dark"
                                ? "rgba(255,255,255,0.01)"
                                : "grey.50"
                              : log.status === "absent"
                              ? mode === "dark"
                                ? "rgba(239, 68, 68, 0.05)"
                                : "rgba(239, 68, 68, 0.02)"
                              : log.status === "special"
                              ? mode === "dark"
                                ? "rgba(124, 58, 237, 0.05)"
                                : "rgba(124, 58, 237, 0.02)"
                              : "transparent",
                        }}
                      >
                        {/* Day Column */}
                        <TableCell sx={{ fontWeight: 700 }}>
                          {log.day} <span style={{ fontWeight: 400, color: "gray", fontSize: "0.72rem" }}>({log.dayName})</span>
                        </TableCell>

                        {/* Status Column */}
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            value={log.status}
                            onChange={(e) => handleLogChange(log.day, "status", e.target.value)}
                            variant="standard"
                            slotProps={{ input: { disableUnderline: true } }}
                            sx={{ fontSize: "0.8rem" }}
                          >
                            <ListSubheader disableSticky sx={{ px: 2, fontWeight: 800, color: "primary.main", fontSize: "0.68rem", textTransform: "uppercase", lineHeight: "2.2", bgcolor: "background.paper" }}>
                              Attendance & Travel
                            </ListSubheader>
                            <MenuItem value="regular">Regular Work</MenuItem>
                            <MenuItem value="weekend">Weekend</MenuItem>
                            <MenuItem value="holiday">Holiday (Regular)</MenuItem>
                            <MenuItem value="special-holiday">Special Holiday</MenuItem>
                            <MenuItem value="absent">Absent</MenuItem>
                            <MenuItem value="ob">Official Business (OB)</MenuItem>
                            <MenuItem value="special">Special Case (OB Partial)</MenuItem>

                            <ListSubheader disableSticky sx={{ px: 2, fontWeight: 800, color: "primary.main", fontSize: "0.68rem", textTransform: "uppercase", lineHeight: "2.2", bgcolor: "background.paper" }}>
                              Plantilla / Permanent Leaves
                            </ListSubheader>
                            <MenuItem value="leave">General Leave</MenuItem>
                            <MenuItem value="leave-vl">Vacation Leave</MenuItem>
                            <MenuItem value="leave-fl">Forced / Mandatory Leave</MenuItem>
                            <MenuItem value="leave-sl">Sick Leave</MenuItem>
                            <MenuItem value="leave-slp">Special Leave Privileges</MenuItem>

                            <ListSubheader disableSticky sx={{ px: 2, fontWeight: 800, color: "primary.main", fontSize: "0.68rem", textTransform: "uppercase", lineHeight: "2.2", bgcolor: "background.paper" }}>
                              Special Welfare Leaves
                            </ListSubheader>
                            <MenuItem value="leave-ml">Maternity Leave</MenuItem>
                            <MenuItem value="leave-pl">Paternity Leave</MenuItem>
                            <MenuItem value="leave-spl">Solo Parent Leave</MenuItem>
                            <MenuItem value="leave-mc">Special Leave Benefits for Women (Magna Carta)</MenuItem>
                            <MenuItem value="leave-vawc">VAWC Leave</MenuItem>

                            <ListSubheader disableSticky sx={{ px: 2, fontWeight: 800, color: "primary.main", fontSize: "0.68rem", textTransform: "uppercase", lineHeight: "2.2", bgcolor: "background.paper" }}>
                              Emergency & Professional
                            </ListSubheader>
                            <MenuItem value="leave-wl">Wellness Leave</MenuItem>
                            <MenuItem value="leave-sel">Special Emergency Leave</MenuItem>
                            <MenuItem value="leave-rl">Rehabilitation Leave</MenuItem>
                            <MenuItem value="leave-stl">Study Leave</MenuItem>

                            <ListSubheader disableSticky sx={{ px: 2, fontWeight: 800, color: "primary.main", fontSize: "0.68rem", textTransform: "uppercase", lineHeight: "2.2", bgcolor: "background.paper" }}>
                              Contract of Service (C.O.S)
                            </ListSubheader>
                            <MenuItem value="leave-cto">Compensatory Time-Off</MenuItem>
                            <MenuItem value="leave-cto-am">Half Day CTO (AM)</MenuItem>
                            <MenuItem value="leave-cto-pm">Half Day CTO (PM)</MenuItem>
                            <MenuItem value="leave-wlcos">Wellness Leave - COS</MenuItem>
                          </TextField>
                        </TableCell>

                        {log.status === "leave" || (log.status.startsWith("leave-") && log.status !== "leave-cto-am" && log.status !== "leave-cto-pm") ? (
                          <TableCell colSpan={4}>
                            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", pl: 1 }}>
                              On Leave / Excused ({log.status === "leave" ? "General" : LEAVE_NAMES_MAP[log.status.substring(6)] || log.status.substring(6).toUpperCase()})
                            </Typography>
                          </TableCell>
                        ) : log.status === "holiday" || log.status === "special-holiday" ? (
                          <TableCell colSpan={4}>
                            <TextField
                              size="small"
                              placeholder={
                                log.status === "special-holiday"
                                  ? "Enter Special Holiday Reason (e.g. Ninoy Aquino Day)"
                                  : "Enter Holiday Reason (e.g. Independence Day)"
                              }
                              value={log.reason ?? log.specialNote ?? ""}
                              onChange={(e) => {
                                handleLogChange(log.day, "reason", e.target.value)
                                handleLogChange(log.day, "specialNote", e.target.value)
                              }}
                              fullWidth
                              variant="standard"
                              slotProps={{ input: { disableUnderline: false } }}
                              sx={{ fontStyle: "italic", input: { fontSize: "0.8rem", py: 0.2 } }}
                            />
                          </TableCell>
                        ) : log.status === "ob" ? (
                          <TableCell colSpan={4}>
                            <TextField
                              size="small"
                              placeholder="Enter Travel Location (e.g. Quezon City Office)"
                              value={log.location || ""}
                              onChange={(e) => handleLogChange(log.day, "location", e.target.value)}
                              fullWidth
                              variant="standard"
                              slotProps={{ input: { disableUnderline: false } }}
                              sx={{ fontStyle: "italic", input: { fontSize: "0.8rem", py: 0.2 } }}
                            />
                          </TableCell>
                        ) : (
                          <>
                            {/* AM IN */}
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="08:00"
                                value={log.status === "leave-cto-am" ? "CTO" : log.amIn}
                                disabled={!isAmEnabled}
                                onChange={(e) => handleLogChange(log.day, "amIn", e.target.value)}
                                variant="standard"
                                slotProps={{ input: { disableUnderline: true } }}
                              />
                            </TableCell>

                            {/* AM OUT */}
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="12:00"
                                value={log.status === "leave-cto-am" ? "CTO" : log.amOut}
                                disabled={!isAmEnabled}
                                onChange={(e) => handleLogChange(log.day, "amOut", e.target.value)}
                                variant="standard"
                                slotProps={{ input: { disableUnderline: true } }}
                              />
                            </TableCell>

                            {/* PM IN */}
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="01:00"
                                value={log.status === "leave-cto-pm" ? "CTO" : log.pmIn}
                                disabled={!isPmEnabled}
                                onChange={(e) => handleLogChange(log.day, "pmIn", e.target.value)}
                                variant="standard"
                                slotProps={{ input: { disableUnderline: true } }}
                              />
                            </TableCell>

                            {/* PM OUT */}
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="05:00"
                                value={log.status === "leave-cto-pm" ? "CTO" : log.pmOut}
                                disabled={!isPmEnabled}
                                onChange={(e) => handleLogChange(log.day, "pmOut", e.target.value)}
                                variant="standard"
                                slotProps={{ input: { disableUnderline: true } }}
                              />
                            </TableCell>
                          </>
                        )}

                        {/* Day Late */}
                        <TableCell align="right" sx={{ fontWeight: 600, color: log.lateMinutes > 0 ? "error.main" : "text.secondary" }}>
                          {log.lateMinutes > 0 ? `${log.lateMinutes}m` : "—"}
                        </TableCell>

                        {/* Day Undertime */}
                        <TableCell align="right" sx={{ fontWeight: 600, color: log.undertimeMinutes > 0 ? "error.main" : "text.secondary" }}>
                          {log.undertimeMinutes > 0 ? `${log.undertimeMinutes}m` : "—"}
                        </TableCell>
                      </TableRow>

                      {log.status === "special" && (
                        <TableRow
                          sx={{
                            bgcolor: mode === "dark"
                              ? "rgba(124, 58, 237, 0.03)"
                              : "rgba(124, 58, 237, 0.01)",
                          }}
                        >
                          <TableCell colSpan={8} sx={{ pt: 0, pb: 1.5, px: 2 }}>
                            <TextField
                              size="small"
                              label="📋 Special Case Details (e.g. 1-5 PM: Governor's Office, OB Travel)"
                              placeholder="Describe the official travel or reason for the time gap..."
                              value={log.specialNote || ""}
                              onChange={(e) => handleLogChange(log.day, "specialNote", e.target.value)}
                              fullWidth
                              variant="outlined"
                              sx={{
                                "& .MuiInputLabel-root": { fontSize: "0.78rem" },
                                "& .MuiOutlinedInput-root": { fontSize: "0.82rem" },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* 3. Leave Benefits Legend Reference */}
      <Grid size={{ xs: 12 }}>
        <DtrLeaveLegend />
      </Grid>

    </Grid>
  {dialog}
  </>
)
}
