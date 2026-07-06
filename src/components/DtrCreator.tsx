"use client"

import React, { useState, useEffect, useMemo } from "react"
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
} from "@mui/material"
import {
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Autorenew as FillIcon,
} from "@mui/icons-material"

import { exportDtrPdf } from "@/lib/exportPdf"
import type { SavedEmployee } from "@/lib/db"
import type { DtrDayLog } from "@/types/payroll"

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

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

function parseTimeToMinutes(t: string, isPm = false): number {
  if (!t || !t.includes(":")) return 0
  const [hStr, mStr] = t.split(":")
  let h = parseInt(hStr || "0", 10)
  const m = parseInt(mStr || "0", 10)
  if (isPm && h < 12) {
    h += 12
  }
  return h * 60 + m
}

export function DtrCreator({ savedEmployees = [], onApplyDtr }: DtrCreatorProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

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

  // Default Prescribed Office Hours Configuration
  const getDefaultTimesForDay = () => {
    return { amIn: "08:00", amOut: "12:00", pmIn: "01:00", pmOut: "05:00" }
  }


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

  // Recalculate late & undertime minutes for a single log
  const computeDayAdjustments = (log: DtrDayLog): { lateMinutes: number; undertimeMinutes: number } => {
    if (log.status !== "regular" && log.status !== "special") {
      return { lateMinutes: 0, undertimeMinutes: 0 }
    }

    let late = 0
    let ut = 0

    const calcSchedule = (
      targetAmInStr: string,
      targetAmOutStr: string,
      targetPmInStr: string,
      targetPmOutStr: string
    ) => {
      let l = 0
      let u = 0
      const targetAmIn = parseTimeToMinutes(targetAmInStr, false)
      const targetAmOut = parseTimeToMinutes(targetAmOutStr, false)
      const targetPmIn = parseTimeToMinutes(targetPmInStr, true)
      const targetPmOut = parseTimeToMinutes(targetPmOutStr, true)

      if (log.amIn) {
        const amInMin = parseTimeToMinutes(log.amIn, false)
        if (amInMin > targetAmIn) {
          l += amInMin - targetAmIn
        }
      }

      if (log.pmIn) {
        const pmInMin = parseTimeToMinutes(log.pmIn, true)
        if (pmInMin > targetPmIn) {
          l += pmInMin - targetPmIn
        }
      }

      if (log.status !== "special") {
        if (log.amOut) {
          const amOutMin = parseTimeToMinutes(log.amOut, false)
          if (amOutMin < targetAmOut) {
            u += targetAmOut - amOutMin
          }
        }
        if (log.pmOut) {
          const pmOutMin = parseTimeToMinutes(log.pmOut, true)
          if (pmOutMin < targetPmOut) {
            u += targetPmOut - pmOutMin
          }
        }
      }

      return { late: l, ut: u }
    }

    const dayNameLower = (log.dayName || "").toLowerCase()
    const isMonday = dayNameLower.startsWith("mon")
    const isTuesdayToFriday =
      dayNameLower.startsWith("tue") ||
      dayNameLower.startsWith("wed") ||
      dayNameLower.startsWith("thu") ||
      dayNameLower.startsWith("fri")

    if (isMonday) {
      // Monday Strict (7-4 or 8-5)
      const option1 = calcSchedule("07:00", "12:00", "01:00", "04:00") // 7-4
      const option2 = calcSchedule("08:00", "12:00", "01:00", "05:00") // 8-5
      const opt1Total = option1.late + option1.ut
      const opt2Total = option2.late + option2.ut

      if (opt1Total < opt2Total) {
        late = option1.late
        ut = option1.ut
      } else {
        late = option2.late
        ut = option2.ut
      }
    } else if (isTuesdayToFriday) {
      // Tuesday-Friday Flexi (7-4, 8-5, 9-6)
      let requiredPmOutMin = 1020 // Default 5:00 PM (17:00) in minutes
      
      if (log.amIn) {
        const amInMin = parseTimeToMinutes(log.amIn, false)
        if (amInMin <= 420) { // 7:00 AM or earlier
          requiredPmOutMin = 960 // 4:00 PM (16:00)
        } else if (amInMin > 420 && amInMin <= 540) { // between 7:00 AM and 9:00 AM
          requiredPmOutMin = amInMin + 540 // AM IN + 8 hours work + 1 hour lunch
        } else { // after 9:00 AM
          late += amInMin - 540 // Late relative to 9:00 AM
          requiredPmOutMin = 1080 // 6:00 PM (18:00)
        }
      }

      if (log.pmIn) {
        const pmInMin = parseTimeToMinutes(log.pmIn, true)
        if (pmInMin > 780) { // PM IN target: 1:00 PM
          late += pmInMin - 780
        }
      }

      if (log.status !== "special") {
        if (log.amOut) {
          const amOutMin = parseTimeToMinutes(log.amOut, false)
          if (amOutMin < 720) { // AM OUT target: 12:00 PM
            ut += 720 - amOutMin
          }
        }

        if (log.pmOut) {
          const pmOutMin = parseTimeToMinutes(log.pmOut, true)
          if (pmOutMin < requiredPmOutMin) {
            ut += requiredPmOutMin - pmOutMin
          }
        }
      }
    } else {
      // Fallback for other days (e.g. working weekends) - default 8-5 schedule
      const fallbackOpt = calcSchedule("08:00", "12:00", "01:00", "05:00")
      late = fallbackOpt.late
      ut = fallbackOpt.ut
    }

    return { lateMinutes: late, undertimeMinutes: ut }
  }

  // Update field handler
  const handleLogChange = (dayNum: number, field: keyof DtrDayLog, value: string) => {
    setDays((prev) =>
      prev.map((log) => {
        if (log.day !== dayNum) return log

        const updated = { ...log, [field]: value } as DtrDayLog

        // Handle status change side effects
        if (field === "status") {
          if (value === "weekend" || value === "holiday" || value === "absent" || value === "leave" || value === "ob") {
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

  // Get active month label name
  const monthLabel = MONTHS.find((m) => m.value === month)?.label || "Month"
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
  }

  const handleExportPdf = () => {
    const activeName = employeeName.trim() || "Employee Name"
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
      paperSize
    )
  }

  return (
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
                label="Month"
                size="small"
                fullWidth
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
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
                • <strong>Monday Strict:</strong> 7-4 or 8-5 schedule
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
                            <MenuItem value="regular">Regular Work</MenuItem>
                            <MenuItem value="weekend">Weekend</MenuItem>
                            <MenuItem value="holiday">Holiday</MenuItem>
                            <MenuItem value="absent">Absent</MenuItem>
                            <MenuItem value="leave">Leave</MenuItem>
                            <MenuItem value="ob">Official Business (OB)</MenuItem>
                            <MenuItem value="special">Special Case (OB Partial)</MenuItem>
                          </TextField>
                        </TableCell>

                        {log.status === "leave" ? (
                          <TableCell colSpan={4}>
                            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", pl: 1 }}>
                              On Leave / Excused
                            </Typography>
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
                                value={log.amIn}
                                disabled={!isRegular}
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
                                value={log.amOut}
                                disabled={!isRegular}
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
                                value={log.pmIn}
                                disabled={!isRegular}
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
                                value={log.pmOut}
                                disabled={!isRegular}
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
    </Grid>
  )
}
