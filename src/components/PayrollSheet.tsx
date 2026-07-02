import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Stack, useTheme, TextField } from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Paid as PaidIcon,
  TrendingDown as DeductionsIcon,
  AccountBalanceWallet as WalletIcon,
  PictureAsPdf as PdfIcon,
  Layers as LayersIcon,
  Add as AddIcon,
} from "@mui/icons-material"
import type { PayrollEntry, Signatory } from "@/types/payroll"
import { formatPeso } from "@/lib/format"

export interface PayrollSheetProps {
  entries: PayrollEntry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onExportConsolidated: () => void
  onExportPayslips: () => void
  signatories: Signatory[]
  onSignatoriesChange: (val: Signatory[]) => void
}

export function PayrollSheet({
  entries,
  onEdit,
  onDelete,
  onExportConsolidated,
  onExportPayslips,
  signatories,
  onSignatoriesChange,
}: PayrollSheetProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  // Aggregate Metrics
  const totalEmployees = entries.length
  const totalGross = entries.reduce((sum, e) => sum + (e.result.total + e.result.premium), 0)
  const totalDeductions = entries.reduce((sum, e) => sum + e.result.totalDeductions, 0)
  const totalNet = entries.reduce((sum, e) => sum + e.result.netPay, 0)

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 4 },
        borderRadius: 4,
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "background.paper",
        backdropFilter: "blur(8px)",
        boxShadow: mode === "dark" ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)",
      }}
    >
      {/* Title & Bulk Export Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
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
              color="success"
              startIcon={<LayersIcon />}
              onClick={onExportConsolidated}
              sx={{
                fontWeight: 700,
                borderRadius: 2.5,
                borderColor: mode === "dark" ? "#34d399" : "#059669",
                color: mode === "dark" ? "#6ee7b7" : "#059669",
                "&:hover": {
                  borderColor: mode === "dark" ? "#6ee7b7" : "#047857",
                  bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                }
              }}
            >
              Export Sheet
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<PdfIcon />}
              onClick={onExportPayslips}
              sx={{
                fontWeight: 700,
                borderRadius: 2.5,
                bgcolor: mode === "dark" ? "#047857" : "#059669",
                "&:hover": {
                  bgcolor: mode === "dark" ? "#065f46" : "#047857",
                }
              }}
            >
              Export Payslips
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
        <Stack spacing={4}>
          {/* Consolidated Metrics Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
            <MetricSummaryCard
              icon={<PeopleIcon />}
              label="Employees"
              value={String(totalEmployees)}
              color="info"
            />
            <MetricSummaryCard
              icon={<PaidIcon />}
              label="Total Gross"
              value={formatPeso(totalGross)}
              color="success"
            />
            <MetricSummaryCard
              icon={<DeductionsIcon />}
              label="Total Deductions"
              value={formatPeso(totalDeductions)}
              color="error"
            />
            <MetricSummaryCard
              icon={<WalletIcon />}
              label="Total Net Pay"
              value={formatPeso(totalNet)}
              color="primary"
            />
          </Box>

          {/* Register Signatories Input Section */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3.5,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              bgcolor: mode === "dark" ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
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
                color="success"
                startIcon={<AddIcon />}
                onClick={() => {
                  onSignatoriesChange([...signatories, { label: "Prepared by:", name: "", title: "" }])
                }}
                sx={{
                  fontSize: "0.75rem",
                  borderRadius: 2,
                  fontWeight: 600,
                  borderColor: mode === "dark" ? "#34d399" : "#059669",
                  color: mode === "dark" ? "#6ee7b7" : "#059669",
                  "&:hover": {
                    borderColor: mode === "dark" ? "#6ee7b7" : "#047857",
                    bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                  }
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
              <Stack spacing={2} sx={{ mt: 1 }}>
                {signatories.map((sig, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "background.paper",
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      flexDirection: { xs: "column", md: "row" }
                    }}
                  >
                    <TextField
                      label="Prepared By / Role / Label"
                      placeholder="e.g. Prepared by:"
                      size="small"
                      sx={{ flex: 1, width: "100%" }}
                      value={sig.label}
                      onChange={(e) => {
                        const newSigs = [...signatories]
                        newSigs[index]! = { ...newSigs[index]!, label: e.target.value }
                        onSignatoriesChange(newSigs)
                      }}
                    />
                    <TextField
                      label="Signatory Name"
                      placeholder="e.g. Juan dela Cruz"
                      size="small"
                      sx={{ flex: 1.5, width: "100%" }}
                      value={sig.name}
                      onChange={(e) => {
                        const newSigs = [...signatories]
                        newSigs[index]! = { ...newSigs[index]!, name: e.target.value }
                        onSignatoriesChange(newSigs)
                      }}
                    />
                    <TextField
                      label="Signatory Title"
                      placeholder="e.g. Administrative Officer V"
                      size="small"
                      sx={{ flex: 1.5, width: "100%" }}
                      value={sig.title}
                      onChange={(e) => {
                        const newSigs = [...signatories]
                        newSigs[index]! = { ...newSigs[index]!, title: e.target.value }
                        onSignatoriesChange(newSigs)
                      }}
                    />
                    <IconButton
                      onClick={() => {
                        const newSigs = signatories.filter((_, idx) => idx !== index)
                        onSignatoriesChange(newSigs)
                      }}
                      sx={{
                        color: "error.main",
                        border: 1,
                        borderColor: "error.light",
                        borderRadius: 2,
                        p: 0.75,
                        alignSelf: { xs: "flex-end", md: "auto" },
                        "&:hover": {
                          bgcolor: "error.light",
                          color: "white"
                        }
                      }}
                      title="Remove signatory"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Directory Data Table */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              bgcolor: "transparent"
            }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                <TableRow>
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
                      : "Semi-Mo"

                  return (
                    <TableRow
                      key={entry.id}
                      sx={{
                        "&:hover": {
                          bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"
                        }
                      }}
                    >
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

function MetricSummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: "info" | "success" | "error" | "primary"
}) {
  const theme = useTheme()
  const mode = theme.palette.mode

  let colorAccent = "#059669"
  if (color === "error") colorAccent = "#dc2626"
  if (color === "info") colorAccent = "#2563eb"
  if (color === "primary") colorAccent = theme.palette.primary.main

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: 3,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "grey.50",
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          bgcolor: color === "success"
            ? "rgba(5, 150, 105, 0.1)"
            : color === "error"
              ? "rgba(220, 38, 38, 0.1)"
              : color === "info"
                ? "rgba(37, 99, 235, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
          color: colorAccent,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  )
}
