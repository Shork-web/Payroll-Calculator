import { useState, useEffect } from "react"
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Stack, useTheme, TextField, Checkbox } from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  PictureAsPdf as PdfIcon,
  Layers as LayersIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material"
import type { PayrollEntry, Signatory } from "@/types/payroll"
import { formatPeso } from "@/lib/format"

export interface PayrollSheetProps {
  entries: PayrollEntry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onExportConsolidated: (selectedEntries: PayrollEntry[]) => void
  onExportPayslips: (selectedEntries: PayrollEntry[]) => void
  onExportComputations: (selectedEntries: PayrollEntry[]) => void
  onExportCsv: (selectedEntries: PayrollEntry[]) => void
  signatories: Signatory[]
  onSignatoriesChange: (val: Signatory[]) => void
}

export function PayrollSheet({
  entries,
  onEdit,
  onDelete,
  onExportConsolidated,
  onExportPayslips,
  onExportComputations,
  onExportCsv,
  signatories,
  onSignatoriesChange,
}: PayrollSheetProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Automatically sync selection state when entries list changes (e.g. addition, deletion)
  useEffect(() => {
    setSelectedIds((prev) => {
      const entryIds = entries.map((e) => e.id)
      const currentEntryIdsSet = new Set(entryIds)
      
      // Filter out any IDs that no longer exist in the entries
      const stillValidSelected = prev.filter((id) => currentEntryIdsSet.has(id))
      
      // Auto-select any new entries that aren't in the selection state
      const prevSet = new Set(prev)
      const newIdsToSelect = entryIds.filter((id) => !prevSet.has(id))
      
      if (newIdsToSelect.length > 0 || stillValidSelected.length !== prev.length) {
        return [...stillValidSelected, ...newIdsToSelect]
      }
      return prev
    })
  }, [entries])

  // Aggregate Metrics
  const totalEmployees = entries.length
  const totalGross = entries.reduce((sum, e) => sum + (e.result.total + e.result.premium), 0)
  const totalDeductions = entries.reduce((sum, e) => sum + e.result.totalDeductions, 0)
  const totalNet = entries.reduce((sum, e) => sum + e.result.netPay, 0)

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 1.5,
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
        boxShadow: mode === "dark" ? "none" : "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Title & Bulk Export Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
            Payroll Directory
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Summary and records of all computed employee payroll entries
          </Typography>
        </Box>
        
        {entries.length > 0 && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<LayersIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => {
                const selectedEntries = entries.filter((e) => selectedIds.includes(e.id))
                onExportConsolidated(selectedEntries)
              }}
              sx={{
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Export Register ({selectedIds.length})
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<DescriptionIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => {
                const selectedEntries = entries.filter((e) => selectedIds.includes(e.id))
                onExportCsv(selectedEntries)
              }}
              sx={{
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Export CSV ({selectedIds.length})
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PdfIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => {
                const selectedEntries = entries.filter((e) => selectedIds.includes(e.id))
                onExportPayslips(selectedEntries)
              }}
              sx={{
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Export Bulk Payslips ({selectedIds.length})
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PdfIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => {
                const selectedEntries = entries.filter((e) => selectedIds.includes(e.id))
                onExportComputations(selectedEntries)
              }}
              sx={{
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Export Bulk Computations ({selectedIds.length})
            </Button>
          </Stack>
        )}
      </Box>

      {entries.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: "center",
            borderStyle: "dashed",
            borderRadius: 3.5,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(15, 23, 42, 0.01)"
          }}
        >
          <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
            Payroll Sheet is Empty
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360, mx: "auto", mt: 1 }}>
            Fill out the configuration form, preview the summary, and click &quot;Add to Payroll Sheet&quot; to populate entries here.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {/* Consolidated Metrics Grid */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              borderColor: "divider",
              bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "grey.50",
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
              gap: 1.5,
            }}
          >
            <FlatMetric label="Total Employees" value={String(totalEmployees)} />
            <FlatMetric label="Total Gross" value={formatPeso(totalGross)} color="success.main" />
            <FlatMetric label="Total Deductions" value={formatPeso(totalDeductions)} color="error.main" />
            <FlatMetric label="Total Net Pay" value={formatPeso(totalNet)} color="primary.main" isBold />
          </Paper>

          {/* Register Signatories Input Section */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 3,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              bgcolor: mode === "dark" ? "rgba(30,41,59,0.1)" : "background.paper",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.9rem", color: "text.primary" }}>
                  Consolidated Register Signatories
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                  Configure signature blocks (e.g., Prepared By, Certified Correct, Approved By) for the exported consolidated payroll sheet.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  onSignatoriesChange([...signatories, { label: "Prepared by:", name: "", title: "" }])
                }}
                sx={{
                  borderRadius: 1.5,
                  fontWeight: 700,
                }}
              >
                Add Signatory
              </Button>
            </Box>

            {signatories.length === 0 ? (
              <Box sx={{ py: 2, textAlign: "center" }}>
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                  No signatories configured. Click &quot;Add Signatory&quot; to configure signature blocks.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 1 }}>
                {signatories.map((sig, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: "divider",
                      bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "grey.50",
                      display: "flex",
                      gap: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <Stack spacing={1.5} sx={{ flex: 1 }}>
                      <TextField
                        label="Label (e.g. Prepared by:)"
                        placeholder="e.g. Prepared by:"
                        size="small"
                        fullWidth
                        value={sig.label}
                        onChange={(e) => {
                          const newSigs = [...signatories]
                          newSigs[index]! = { ...newSigs[index]!, label: e.target.value }
                          onSignatoriesChange(newSigs)
                        }}
                      />
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                        <TextField
                          label="Signatory Name"
                          placeholder="e.g. Juan dela Cruz"
                          size="small"
                          fullWidth
                          value={sig.name}
                          onChange={(e) => {
                            const newSigs = [...signatories]
                            newSigs[index]! = { ...newSigs[index]!, name: e.target.value }
                            onSignatoriesChange(newSigs)
                          }}
                        />
                        <TextField
                          label="Title / Designation"
                          placeholder="e.g. AO V"
                          size="small"
                          fullWidth
                          value={sig.title}
                          onChange={(e) => {
                            const newSigs = [...signatories]
                            newSigs[index]! = { ...newSigs[index]!, title: e.target.value }
                            onSignatoriesChange(newSigs)
                          }}
                        />
                      </Box>
                    </Stack>
                    <IconButton
                      onClick={() => {
                        const newSigs = signatories.filter((_, idx) => idx !== index)
                        onSignatoriesChange(newSigs)
                      }}
                      sx={{
                        color: "error.main",
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1.5,
                        p: 0.75,
                        "&:hover": {
                          bgcolor: "error.light",
                          color: "white",
                          borderColor: "error.light",
                        }
                      }}
                      title="Remove signatory"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>


          {/* Directory Data Table */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              bgcolor: "transparent"
            }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="success"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < entries.length}
                      checked={entries.length > 0 && selectedIds.length === entries.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(entries.map((ent) => ent.id))
                        } else {
                          setSelectedIds([])
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Gross Pay</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Deductions</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Net Pay</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => {
                  const displayGross = entry.result.total + entry.result.premium
                  const modeLabel = entry.result.computationType === "daily"
                    ? "Daily"
                    : entry.result.computationType === "monthly"
                      ? "Monthly"
                      : entry.result.computationType === "monthly-no-tax"
                        ? "Monthly (No Tax)"
                        : entry.result.computationType === "semi-monthly-no-tax"
                          ? "Semi-Mo (No Tax)"
                          : "Semi-Mo"
                  const isSelected = selectedIds.includes(entry.id)

                  return (
                    <TableRow
                      key={entry.id}
                      selected={isSelected}
                      sx={{
                        bgcolor: isSelected
                          ? mode === "dark"
                            ? "rgba(52, 211, 153, 0.08)"
                            : "rgba(5, 150, 105, 0.04)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isSelected
                            ? mode === "dark"
                              ? "rgba(52, 211, 153, 0.12)"
                              : "rgba(5, 150, 105, 0.08)"
                            : mode === "dark"
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(0,0,0,0.01)"
                        }
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="success"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, entry.id])
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== entry.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {entry.employee.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {entry.employee.position}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {modeLabel}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatPeso(displayGross)}</TableCell>
                      <TableCell align="right" sx={{ color: entry.result.totalDeductions > 0 ? "error.main" : "text.secondary" }}>
                        {formatPeso(entry.result.totalDeductions)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "success.main" }}>
                        {formatPeso(entry.result.netPay)}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                          <IconButton
                            size="small"
                            onClick={() => onEdit(entry.id)}
                            sx={{
                              color: "primary.main",
                              "&:hover": {
                                bgcolor: "primary.light",
                                color: "white"
                              }
                            }}
                            title="Edit entry"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onDelete(entry.id)}
                            sx={{
                              color: "error.main",
                              "&:hover": {
                                bgcolor: "error.light",
                                color: "white"
                              }
                            }}
                            title="Delete entry"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Paper>
  )
}

function FlatMetric({
  label,
  value,
  color,
  isBold,
}: {
  label: string
  value: string
  color?: string
  isBold?: boolean
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: isBold ? 850 : 700,
          color: color || "text.primary",
          mt: 0.5,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
