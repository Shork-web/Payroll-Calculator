"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItemButton,
  Tabs,
  Tab,
  Button,
  Stack,
  useTheme,
  TextField,
  Divider,
  Avatar,
  IconButton,
  Card,
  CardContent,
  Tooltip,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  ReceiptLong as ReceiptIcon,
  Calculate as CalculateIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AccessTime as AttendanceIcon,
} from "@mui/icons-material"
import type { PayrollEntry } from "@/types/payroll"
import {
  exportBulkPayslipsPdf,
  exportBulkComputationsPdf,
  exportAttendanceCertificatePdf,
} from "@/lib/exportPdf"

// Helper function to format numbers as pesos
function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface EmployeeRecordsViewerProps {
  entries: PayrollEntry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function EmployeeRecordsViewer({ entries, onEdit, onDelete }: EmployeeRecordsViewerProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [docTab, setDocTab] = useState(0) // 0: Payslip, 1: Computation

  // Group payroll entries by unique employee name
  const groupedEmployees = useMemo(() => {
    const groups: { [name: string]: PayrollEntry[] } = {}
    for (const entry of entries) {
      const name = entry.employee.name
      if (!groups[name]) {
        groups[name] = []
      }
      groups[name].push(entry)
    }
    // Sort cutoff periods descending (latest first) based on periodStart date
    for (const name in groups) {
      const group = groups[name]
      if (group) {
        group.sort((a, b) => b.inputs.periodStart.localeCompare(a.inputs.periodStart))
      }
    }
    return groups
  }, [entries])

  // Filter unique employee names matching the search query
  const filteredEmployeeNames = useMemo(() => {
    const names = Object.keys(groupedEmployees)
    return names.filter((name) => {
      const group = groupedEmployees[name]
      if (!group || group.length === 0) return false
      const sample = group[0]
      if (!sample) return false
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.employee.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [groupedEmployees, searchQuery])

  // Sync state variables when grouped employees list updates
  useEffect(() => {
    const names = Object.keys(groupedEmployees)
    if (names.length > 0) {
      let activeName = selectedEmployeeName
      if (!activeName || !groupedEmployees[activeName]) {
        activeName = names[0] ?? null
        setSelectedEmployeeName(activeName)
      }

      const empEntries = activeName ? groupedEmployees[activeName] || [] : []
      if (empEntries.length > 0) {
        if (!selectedEntryId || !empEntries.some((e) => e.id === selectedEntryId)) {
          const firstEntry = empEntries[0]
          if (firstEntry) {
            setSelectedEntryId(firstEntry.id)
          }
        }
      } else {
        setSelectedEntryId(null)
      }
    } else {
      setSelectedEmployeeName(null)
      setSelectedEntryId(null)
    }
  }, [groupedEmployees, selectedEmployeeName, selectedEntryId])

  // Retrieve current active employee's calculated entries
  const employeeEntries = useMemo(() => {
    if (!selectedEmployeeName) return []
    return groupedEmployees[selectedEmployeeName] || []
  }, [groupedEmployees, selectedEmployeeName])

  // Retrieve selected payroll entry details
  const selectedEntry = useMemo(() => {
    if (employeeEntries.length === 0) return null
    return employeeEntries.find((e) => e.id === selectedEntryId) || employeeEntries[0] || null
  }, [employeeEntries, selectedEntryId])

  const handleExportPayslip = () => {
    if (selectedEntry) {
      exportBulkPayslipsPdf([selectedEntry])
    }
  }

  const handleExportComputation = () => {
    if (selectedEntry) {
      exportBulkComputationsPdf([selectedEntry])
    }
  }

  const handleExportAttendance = () => {
    if (selectedEntry) {
      exportAttendanceCertificatePdf(selectedEntry)
    }
  }

  if (entries.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 2,
          border: 1,
          borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
        }}
      >
        <ReceiptIcon sx={{ fontSize: 60, color: "text.secondary", opacity: 0.4, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No Records Found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto" }}>
          You haven&apos;t computed or added any payroll records to the sheet yet. Please use the calculator tab to compute employee pay and click <strong>&quot;Add to Sheet&quot;</strong>.
        </Typography>
      </Paper>
    )
  }

  return (
    <Grid container spacing={3}>
      {/* Left Pane: Unique Employee Directory Sidebar */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 160px)",
            minHeight: 500,
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Employee Directory
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />,
                },
              }}
            />
          </Box>

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5 }}>
            <List disablePadding>
              {filteredEmployeeNames.map((name) => {
                const group = groupedEmployees[name] || []
                const sampleEntry = group[0]
                if (!sampleEntry) return null
                const isSelected = name === selectedEmployeeName
                return (
                  <ListItemButton
                    key={name}
                    selected={isSelected}
                    onClick={() => {
                      setSelectedEmployeeName(name)
                      // Auto-select latest period's entry ID for the clicked employee
                      if (group[0]) {
                        setSelectedEntryId(group[0].id)
                      }
                    }}
                    sx={{
                      borderRadius: 1.5,
                      mb: 1,
                      border: 1,
                      borderColor: isSelected
                        ? (mode === "dark" ? "rgba(52, 211, 153, 0.4)" : "rgba(5, 150, 105, 0.3)")
                        : "transparent",
                      bgcolor: isSelected
                        ? (mode === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.05)")
                        : "transparent",
                      "&.Mui-selected:hover": {
                        bgcolor: isSelected
                          ? (mode === "dark" ? "rgba(52, 211, 153, 0.12)" : "rgba(16, 185, 129, 0.08)")
                          : "transparent",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        mr: 1.5,
                        bgcolor: isSelected
                          ? (mode === "dark" ? "#10b981" : "#059669")
                          : (mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                        color: isSelected ? "white" : "text.secondary",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                        {name}
                      </Typography>
                      <Box sx={{ mt: 0.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {sampleEntry.employee.position}
                        </Typography>
                        <Chip
                          label={group.length === 1 ? "1 period" : `${group.length} periods`}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: isSelected
                              ? (mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "rgba(16, 185, 129, 0.1)")
                              : (mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                            color: isSelected
                              ? (mode === "dark" ? "#34d399" : "#059669")
                              : "text.secondary",
                          }}
                        />
                      </Box>
                    </Box>
                  </ListItemButton>
                )
              })}
              {filteredEmployeeNames.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  No matches for &quot;{searchQuery}&quot;
                </Typography>
              )}
            </List>
          </Box>
        </Paper>
      </Grid>

      {/* Right Pane: Document Viewer Details */}
      <Grid size={{ xs: 12, md: 8 }}>
        {selectedEntry ? (
          <Stack spacing={2.5}>
            {/* Header Action Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedEntry.employee.name}
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.8, alignItems: "center" }}>
                    <Chip
                      icon={<WorkIcon sx={{ fontSize: "14px !important" }} />}
                      label={selectedEntry.employee.position}
                      size="small"
                      sx={{ fontSize: "0.72rem", fontWeight: 600 }}
                    />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit this entry in calculator">
                    <IconButton size="small" onClick={() => onEdit(selectedEntry.id)} sx={{ color: "primary.main", border: 1, borderColor: "divider" }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete this record">
                    <IconButton size="small" onClick={() => onDelete(selectedEntry.id)} sx={{ color: "error.main", border: 1, borderColor: "divider" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<PdfIcon />}
                    onClick={
                      docTab === 0
                        ? handleExportPayslip
                        : docTab === 1
                        ? handleExportComputation
                        : handleExportAttendance
                    }
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Export Current View PDF
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                {/* Period Selector Dropdown */}
                <TextField
                  select
                  size="small"
                  label="Select Payroll Period"
                  value={selectedEntryId || ""}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  disabled={employeeEntries.length <= 1}
                  sx={{
                    minWidth: 260,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1.5,
                    }
                  }}
                >
                  {employeeEntries.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.employee.period}
                    </MenuItem>
                  ))}
                </TextField>

                <Tabs
                  value={docTab}
                  onChange={(_e, v) => setDocTab(v)}
                  sx={{
                    "& .MuiTabs-indicator": {
                      backgroundColor: mode === "dark" ? "#34d399" : "#059669",
                    },
                    "& .MuiTab-root": {
                      fontWeight: 700,
                      textTransform: "none",
                      minWidth: 120,
                      fontSize: "0.825rem",
                      "&.Mui-selected": {
                        color: mode === "dark" ? "#34d399" : "#059669",
                      },
                    },
                  }}
                >
                  <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} label="Payslip Preview" iconPosition="start" />
                  <Tab icon={<CalculateIcon sx={{ fontSize: 18 }} />} label="Computation Worksheet" iconPosition="start" />
                  <Tab icon={<AttendanceIcon sx={{ fontSize: 18 }} />} label="Attendance Logs" iconPosition="start" />
                </Tabs>
              </Box>
            </Paper>

            {/* Document Content View */}
            <Box>
              {docTab === 0 ? (
                /* TAB 0: Digital Payslip Preview */
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 4 },
                    borderRadius: 2,
                    border: 1.5,
                    borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                    bgcolor: mode === "dark" ? "#111827" : "#ffffff",
                    fontFamily: "monospace",
                    maxWidth: 700,
                    mx: "auto",
                  }}
                >
                  {/* Payslip Header */}
                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography variant="caption" sx={{ display: "block", letterSpacing: 0.5, color: "text.secondary" }}>
                      Republic of the Philippines
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: mode === "dark" ? "#6ee7b7" : "#047857", fontSize: "0.95rem", mt: 0.5 }}>
                      Philippine Fiber Industry Development Authority
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "text.secondary", mt: 0.5, letterSpacing: 1 }}>
                      PAYSLIP
                    </Typography>
                  </Box>

                  {/* Info Grid */}
                  <Grid container spacing={1} sx={{ mb: 2, fontSize: "0.85rem" }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Employee Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedEntry.employee.name.toUpperCase()}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Position / Designation</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedEntry.employee.position}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Pay Period</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedEntry.employee.period}</Typography>
                    </Grid>
                  </Grid>

                  {/* Payslip Table Box */}
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden", mb: 4 }}>
                    {/* Table Headers */}
                    <Grid container sx={{ bgcolor: mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", py: 1, px: 2, fontWeight: 700, borderBottom: 1, borderColor: "divider", fontSize: "0.8rem" }}>
                      <Grid size={{ xs: 6 }}>Earnings</Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2 }}>Deductions</Grid>
                    </Grid>

                    {/* Table Rows */}
                    <Grid container sx={{ fontSize: "0.8rem", px: 2, py: 1.2 }}>
                      {/* Row 1 */}
                      <Grid size={{ xs: 6 }} sx={{ display: "flex", justifyContent: "space-between", pr: 2 }}>
                        <span>Rate/Month</span>
                        <span style={{ fontWeight: 700 }}>₱{n(selectedEntry.inputs.monthlyRate)}</span>
                      </Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between" }}>
                        <span>Absent/Late/Undertime</span>
                        <span style={{ color: "error.main" }}>
                          {selectedEntry.result.absentDeduction + selectedEntry.result.lateDeduction + selectedEntry.result.undertimeDeduction > 0
                            ? `(₱${n(selectedEntry.result.absentDeduction + selectedEntry.result.lateDeduction + selectedEntry.result.undertimeDeduction)})`
                            : "—"}
                        </span>
                      </Grid>

                      <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                      {/* Row 2 */}
                      <Grid size={{ xs: 6 }} sx={{ display: "flex", justifyContent: "space-between", pr: 2 }}>
                        <span>Earned for Period</span>
                        <span style={{ fontWeight: 700 }}>₱{n(selectedEntry.result.earned)}</span>
                      </Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between" }}>
                        <span>Withholding Tax</span>
                        <span style={{ color: selectedEntry.result.tax > 0 ? "error.main" : "text.secondary" }}>
                          {selectedEntry.result.tax > 0 ? `(₱${n(selectedEntry.result.tax)})` : "—"}
                        </span>
                      </Grid>

                      <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                      {/* Row 3 */}
                      <Grid size={{ xs: 6 }} sx={{ display: "flex", justifyContent: "space-between", pr: 2 }}>
                        <span>20% COC Premium</span>
                        <span style={{ fontWeight: 700 }}>₱{n(selectedEntry.result.premium)}</span>
                      </Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between" }}>
                        <span>Overpayment Recovery</span>
                        <span style={{ color: selectedEntry.result.overpayment > 0 ? "error.main" : "text.secondary" }}>
                          {selectedEntry.result.overpayment > 0 ? `(₱${n(selectedEntry.result.overpayment)})` : "—"}
                        </span>
                      </Grid>

                      <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                      {/* Row 4 */}
                      <Grid size={{ xs: 6 }} sx={{ display: "flex", justifyContent: "space-between", pr: 2, fontWeight: 700 }}>
                        <span>Gross Pay</span>
                        <span>₱{n(selectedEntry.result.grossPay)}</span>
                      </Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between" }}>
                        <span>Overpayment Premium</span>
                        <span style={{ color: selectedEntry.result.overpaymentPremium > 0 ? "error.main" : "text.secondary" }}>
                          {selectedEntry.result.overpaymentPremium > 0 ? `(₱${n(selectedEntry.result.overpaymentPremium)})` : "—"}
                        </span>
                      </Grid>

                      <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                      {/* Row 5 */}
                      <Grid size={{ xs: 6 }} sx={{ pr: 2 }}></Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span>Total Deductions</span>
                        <span style={{ color: "error.main" }}>₱{n(selectedEntry.result.totalDeductions)}</span>
                      </Grid>

                      <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, borderStyle: "double", borderColor: "text.primary" }} /></Grid>

                      {/* Row 6: Net Pay Callout */}
                      <Grid size={{ xs: 6 }} sx={{ pr: 2 }}></Grid>
                      <Grid size={{ xs: 6 }} sx={{ borderLeft: 1, borderColor: "divider", pl: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: mode === "dark" ? "#34d399" : "#059669" }}>
                          NET PAY
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 900, color: mode === "dark" ? "#34d399" : "#059669" }}>
                          ₱{n(selectedEntry.result.netPay)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Signatures Container */}
                  <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 3, fontSize: "0.75rem" }}>
                    {/* Conforme Block */}
                    <Box sx={{ minWidth: 150 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Conforme / Received by:</Typography>
                      <Box sx={{ borderBottom: 1, borderColor: "divider", w: "100%", mt: 3, mb: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                        {selectedEntry.employee.name.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Employee Signature</Typography>
                    </Box>

                    {/* Certified Correct Block */}
                    <Box sx={{ minWidth: 150, textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Certified Correct:</Typography>
                      <Box sx={{ borderBottom: 1, borderColor: "divider", w: "100%", mt: 3, mb: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                        {selectedEntry.employee.payslipSignatoryName
                          ? selectedEntry.employee.payslipSignatoryName.toUpperCase()
                          : (selectedEntry.employee.signatoryName || "AUTHORIZED OFFICER").toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedEntry.employee.payslipSignatoryTitle || selectedEntry.employee.signatoryTitle || "Payroll Officer"}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ) : docTab === 1 ? (
                /* TAB 1: Detailed Computation Worksheet */
                <Grid container spacing={3} sx={{ maxWidth: 800, mx: "auto" }}>
                  {/* Column 1: Pay Rates & Absences */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "rgba(248,250,252,0.4)",
                      }}
                    >
                      <CardContent sx={{ p: 0.5, "&:last-child": { pb: 0.5 } }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: mode === "dark" ? "#6ee7b7" : "#047857", mb: 2 }}>
                          Base Rates & Formulas
                        </Typography>

                        <Stack spacing={1.5}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <Typography variant="body2" color="text.secondary">Monthly Rate</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.inputs.monthlyRate)}</Typography>
                          </Box>

                          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <Typography variant="body2" color="text.secondary">Cutoff Working Days</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedEntry.inputs.workingDays} days</Typography>
                          </Box>

                          <Divider />

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Daily Rate</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.dailyRate)}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Formula: Monthly Rate ÷ Working Days</Typography>
                          </Box>

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Hourly Rate</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.hourlyRate)}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Formula: Daily Rate ÷ 8 hours</Typography>
                          </Box>

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Per Minute Rate</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.perMinRate)}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Formula: Hourly Rate ÷ 60 minutes</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Column 2: Net Calculations Trace */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "rgba(248,250,252,0.4)",
                      }}
                    >
                      <CardContent sx={{ p: 0.5, "&:last-child": { pb: 0.5 } }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: mode === "dark" ? "#6ee7b7" : "#047857", mb: 2 }}>
                          Calculated Services Breakdown
                        </Typography>

                        <Stack spacing={1.5}>
                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">1. Period Base Earned</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.earned)}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {selectedEntry.inputs.computationType.includes("semi-monthly")
                                ? "Semi-monthly flat base (Monthly Rate ÷ 2)"
                                : `Daily base (Daily Rate ₱${n(selectedEntry.result.dailyRate)} × days)`}
                            </Typography>
                          </Box>

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">2. Attendance Deductions</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                                -₱{n(selectedEntry.result.absentDeduction + selectedEntry.result.lateDeduction + selectedEntry.result.undertimeDeduction)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              • Absences ({selectedEntry.inputs.absentDays}d): ₱{n(selectedEntry.result.absentDeduction)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              • Lates ({selectedEntry.inputs.lateMinutes}m): ₱{n(selectedEntry.result.lateDeduction)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              • Undertimes ({selectedEntry.inputs.undertimeMinutes ?? 0}m): ₱{n(selectedEntry.result.undertimeDeduction)}
                            </Typography>
                          </Box>

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">3. 20% COC Premium</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                                +₱{n(selectedEntry.result.premium)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Formula: (Base Earned - Deductions) × 20%</Typography>
                          </Box>

                          <Divider />

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>Gross Pay</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>₱{n(selectedEntry.result.grossPay)}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">Formula: (Base - Deductions) + 20% Premium</Typography>
                          </Box>

                          <Divider />

                          <Box sx={{ fontSize: "0.85rem" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">Withholding Tax (5%)</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                                -₱{n(selectedEntry.result.tax)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Computed on Taxable Income: ₱{n(selectedEntry.result.taxableIncome)}
                            </Typography>
                          </Box>

                          {selectedEntry.result.overpayment > 0 && (
                            <Box sx={{ fontSize: "0.85rem" }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">Overpayment Recovery</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                                  -₱{n(selectedEntry.result.overpayment + selectedEntry.result.overpaymentPremium)}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Principal: ₱{n(selectedEntry.result.overpayment)} + 20% Premium: ₱{n(selectedEntry.result.overpaymentPremium)}
                              </Typography>
                            </Box>
                          )}

                          <Divider />

                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: mode === "dark" ? "#34d399" : "#059669" }}>
                              Calculated Net Pay
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: mode === "dark" ? "#34d399" : "#059669" }}>
                              ₱{n(selectedEntry.result.netPay)}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                /* TAB 2: Attendance Logs */
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
                    maxWidth: 800,
                    mx: "auto",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: mode === "dark" ? "#6ee7b7" : "#047857", mb: 2 }}>
                    Itemized Attendance Log & Adjustment Costs
                  </Typography>

                  {(!selectedEntry.inputs.lateIncidents || selectedEntry.inputs.lateIncidents.length === 0) ? (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                        Perfect Attendance — No lates, undertimes, or absences recorded for this period.
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 3 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Date/Day</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Adjustment Type</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                              <TableCell sx={{ fontWeight: 700 }} align="right">Deduction Cost</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedEntry.inputs.lateIncidents.map((incident, idx) => {
                              const isAbsent = incident.type === "absent"
                              const isLate = incident.type === "late" || !incident.type
                              const isUndertime = incident.type === "undertime"

                              const minutes = Number(incident.minutes) || 0
                              const days = Number(incident.days) || 0

                              if (!incident.date?.trim() || (isAbsent && days === 0) || (!isAbsent && minutes === 0)) {
                                return null
                              }

                              let typeLabel = ""
                              let durationText = ""
                              let cost = 0

                              if (isAbsent) {
                                typeLabel = "Absence"
                                durationText = `${days} day${days > 1 ? "s" : ""}`
                                cost = days * selectedEntry.result.dailyRate
                              } else if (isLate) {
                                typeLabel = "Tardiness (Late)"
                                durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
                                cost = minutes * selectedEntry.result.perMinRate
                              } else if (isUndertime) {
                                typeLabel = "Undertime"
                                durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
                                cost = minutes * selectedEntry.result.perMinRate
                              }

                              return (
                                <TableRow key={idx}>
                                  <TableCell sx={{ fontFamily: "monospace" }}>{incident.date}</TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: "error.main" }}>{typeLabel}</TableCell>
                                  <TableCell>{durationText}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>₱{n(cost)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={1.5} sx={{ maxWidth: 400, ml: "auto" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <Typography variant="body2" color="text.secondary">Total Lates Deducted</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.lateDeduction)}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <Typography variant="body2" color="text.secondary">Total Undertimes Deducted</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.undertimeDeduction)}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <Typography variant="body2" color="text.secondary">Total Absences Deducted</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>₱{n(selectedEntry.result.absentDeduction)}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>Total Attendance Deductions</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "error.main" }}>
                            ₱{n(selectedEntry.result.lateDeduction + selectedEntry.result.undertimeDeduction + selectedEntry.result.absentDeduction)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Stack>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 2,
              border: 1,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
            }}
          >
            <PersonIcon sx={{ fontSize: 50, color: "text.secondary", opacity: 0.4, mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Select an employee from the directory sidebar to view their payslips and computation worksheets.
            </Typography>
          </Paper>
        )}
      </Grid>
    </Grid>
  )
}
