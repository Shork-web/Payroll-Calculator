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
  InputAdornment,
  ListSubheader,
} from "@mui/material"
import {
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Autorenew as FillIcon,
  Search as SearchIcon,
  MenuBook as BookIcon,
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

interface LeaveLegendItem {
  code: string
  name: string
  category: "regular" | "family" | "special" | "cos"
  description: string
}

const LEAVE_LEGEND_ITEMS: LeaveLegendItem[] = [
  {
    code: "VL",
    name: "Vacation Leave",
    category: "regular",
    description: "15 days per year (accumulates at 1.25 days/month) for personal trips and rest. Unused days roll over indefinitely."
  },
  {
    code: "FL",
    name: "Forced / Mandatory Leave",
    category: "regular",
    description: "5 days required annually if you have 10 or more VL days accumulated. Deducted from your VL balance; if not taken, these 5 days are forfeited."
  },
  {
    code: "SL",
    name: "Sick Leave",
    category: "regular",
    description: "15 days per year (accumulates at 1.25 days/month) for medical illnesses or medical appointments. Unused days roll over indefinitely and can be monetized at retirement."
  },
  {
    code: "ML",
    name: "Maternity Leave",
    category: "family",
    description: "105 days of fully paid leave for female employees for every instance of live birth, abortion, or miscarriage. Adoptive mothers can claim 60 days if the child is under 7 years old."
  },
  {
    code: "PL",
    name: "Paternity Leave",
    category: "family",
    description: "7 days of paid leave for married male employees to support their legitimate spouse for the first four deliveries or miscarriages."
  },
  {
    code: "SPL",
    name: "Solo Parent Leave",
    category: "family",
    description: "7 working days of paid leave annually for single parents to attend to parental duties, available after 6 months of service."
  },
  {
    code: "MC",
    name: "Special Leave Benefits for Women (Magna Carta)",
    category: "special",
    description: "Up to 2 months (60 days) of fully paid leave for recovery after surgery due to gynecological disorders."
  },
  {
    code: "VAWC",
    name: "VAWC Leave",
    category: "special",
    description: "Up to 10 days of paid leave for female employees who are victims of violence against women and children, used to attend to medical and legal matters."
  },
  {
    code: "SLP",
    name: "Special Leave Privileges (SLP)",
    category: "regular",
    description: "3 days per year for personal milestones (birthdays, anniversaries, graduations) or domestic emergencies. Non-cumulative."
  },
  {
    code: "WL",
    name: "Wellness Leave",
    category: "special",
    description: "Up to 5 days per year specifically for mental health, physical wellness, and medical checkups (separate from standard VL/SL)."
  },
  {
    code: "SEL",
    name: "Special Emergency Leave (SEL)",
    category: "special",
    description: "Up to 5 days of paid leave if you are directly affected by a natural disaster or calamity (typhoon, flood, earthquake) when your area is declared under a State of Calamity."
  },
  {
    code: "RL",
    name: "Rehabilitation Leave",
    category: "special",
    description: "Up to 6 months of paid leave for employees who sustain injuries or wounds while performing their official duties."
  },
  {
    code: "STL",
    name: "Study Leave",
    category: "special",
    description: "Up to 6 months of paid leave for qualified employees to prepare for board/bar exams or complete a master’s or doctorate thesis."
  },
  {
    code: "CTO",
    name: "Compensatory Time-Off (CTO) for COS",
    category: "cos",
    description: "Compensatory time-off privileges for Contract of Service (COS) employees in lieu of overtime pay."
  },
  {
    code: "Wellness Leave - COS",
    name: "Wellness Leave for COS",
    category: "cos",
    description: "Wellness leave privileges allocated specifically for Contract of Service (COS) employees."
  }
]

const LEAVE_NAMES_MAP: Record<string, string> = {
  vl: "Vacation Leave",
  fl: "Forced / Mandatory Leave",
  sl: "Sick Leave",
  ml: "Maternity Leave",
  pl: "Paternity Leave",
  spl: "Solo Parent Leave",
  mc: "Special Leave Benefits for Women (Magna Carta)",
  vawc: "VAWC Leave",
  slp: "Special Leave Privileges",
  wl: "Wellness Leave",
  sel: "Special Emergency Leave",
  rl: "Rehabilitation Leave",
  stl: "Study Leave",
  cto: "Compensatory Time-Off",
  wlcos: "Wellness Leave - COS",
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

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "regular" | "family" | "special" | "cos">("all")

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
          if (value === "weekend" || value === "holiday" || value === "absent" || value === "leave" || value === "ob" || value.startsWith("leave-")) {
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

  const filteredLeaveItems = useMemo(() => {
    return LEAVE_LEGEND_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, selectedCategory])

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
                            <MenuItem value="holiday">Holiday</MenuItem>
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
                            <MenuItem value="leave-wlcos">Wellness Leave - COS</MenuItem>
                          </TextField>
                        </TableCell>

                        {log.status === "leave" || log.status.startsWith("leave-") ? (
                          <TableCell colSpan={4}>
                            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", pl: 1 }}>
                              On Leave / Excused ({log.status === "leave" ? "General" : LEAVE_NAMES_MAP[log.status.substring(6)] || log.status.substring(6).toUpperCase()})
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

      {/* 3. Leave Benefits Legend Reference */}
      <Grid size={{ xs: 12 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2.5,
            border: 1,
            borderColor: "divider",
            bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
            mt: 1,
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                <BookIcon color="primary" /> Leave Benefits & Privileges Legend
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reference guide for Civil Service Commission (CSC) leave rules and Contract of Service (COS) privileges
              </Typography>
            </Box>
            {/* Search filter */}
            <TextField
              size="small"
              placeholder="Search leaves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{ width: { xs: "100%", sm: 260 } }}
            />
          </Box>

          {/* Categories / Filter Chips */}
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
            <Chip
              label="All Leaves"
              onClick={() => setSelectedCategory("all")}
              color={selectedCategory === "all" ? "primary" : "default"}
              variant={selectedCategory === "all" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Permanent (VL/SL/SLP)"
              onClick={() => setSelectedCategory("regular")}
              color={selectedCategory === "regular" ? "primary" : "default"}
              variant={selectedCategory === "regular" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Family & Maternity"
              onClick={() => setSelectedCategory("family")}
              color={selectedCategory === "family" ? "primary" : "default"}
              variant={selectedCategory === "family" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Special Benefits"
              onClick={() => setSelectedCategory("special")}
              color={selectedCategory === "special" ? "primary" : "default"}
              variant={selectedCategory === "special" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Contract of Service (C.O.S)"
              onClick={() => setSelectedCategory("cos")}
              color={selectedCategory === "cos" ? "primary" : "default"}
              variant={selectedCategory === "cos" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          {/* Leaves Cards Grid */}
          <Grid container spacing={2}>
            {filteredLeaveItems.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.code}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: mode === "dark" ? "0 4px 20px rgba(99,102,241,0.1)" : "0 4px 20px rgba(99,102,241,0.05)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.3 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.code}
                        size="small"
                        color={
                          item.category === "regular"
                            ? "primary"
                            : item.category === "family"
                            ? "success"
                            : item.category === "cos"
                            ? "warning"
                            : "secondary"
                        }
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          height: 20,
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {filteredLeaveItems.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                  No leaves match your search criteria.
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  )
}
