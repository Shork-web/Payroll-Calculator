import { Box, Typography, Paper, useTheme, Stack, Divider } from "@mui/material"

import { formatPeso } from "@/shared/lib/format"
import { SEMI_MONTHLY_EXEMPTION } from "@/features/payroll/lib/payroll"
import type { PayrollInputs, PayrollResult } from "@/features/payroll/types/payroll"

const PLACEHOLDER = "—"

export interface PaySummaryProps {
  result: PayrollResult | null
  inputs: PayrollInputs | null
  action?: React.ReactNode
}

export function PaySummary({ result, inputs, action }: PaySummaryProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  const formatValue = (value: number | undefined) =>
    value === undefined ? PLACEHOLDER : formatPeso(value)

  const exemptionLabel = `After ₱${formatPeso(result?.exemptionLimit ?? SEMI_MONTHLY_EXEMPTION)} exemption`
  const displayGross = result ? result.total + result.premium : undefined

  const earnedSubtitle = result
    ? result.computationType === "daily"
      ? `₱${formatPeso(result.dailyRate)} × ${result.periodWorkingDays} days`
      : result.computationType === "monthly" || result.computationType === "monthly-no-tax"
        ? "Monthly base"
        : "Semi-monthly base"
    : undefined

  const showAdditionalTax = inputs && inputs.additionalTax > 0
  const taxLabel = showAdditionalTax ? "Withholding tax" : "5% withholding tax"

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 1.25,
        border: 1,
        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
        overflow: "visible",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.3, mb: action ? 1 : 1.25 }}>
        Pay summary
      </Typography>

      {action && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 1.5,
            pb: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {action}
        </Box>
      )}

      <Box
        sx={{
          mb: 1.5,
          px: 1.5,
          py: 1.25,
          borderRadius: 1,
          bgcolor: mode === "dark" ? "rgba(5, 150, 105, 0.12)" : "rgba(5, 150, 105, 0.06)",
          border: 1,
          borderColor: mode === "dark" ? "success.dark" : "success.light",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: "success.main", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Net take-home
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 900,
            color: "success.main",
            letterSpacing: -0.5,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatValue(result?.netPay)}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 1,
          mb: 1.5,
          py: 1,
          px: 1,
          borderRadius: 1,
          bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "grey.50",
          border: 1,
          borderColor: "divider",
        }}
      >
        <RateMetric label="W. days" value={result?.workingDays === undefined ? PLACEHOLDER : String(result.workingDays)} />
        <RateMetric label="Daily" value={formatValue(result?.dailyRate)} />
        <RateMetric label="Hourly" value={formatValue(result?.hourlyRate)} />
        <RateMetric label="/ min" value={formatValue(result?.perMinRate)} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: { xs: 1.5, sm: 2.5 },
          px: 0.25,
        }}
      >
        <LedgerColumn title="Earnings">
          <LedgerRow label="Base earned" subtitle={earnedSubtitle} value={formatValue(result?.earned)} />
          <LedgerRow label="20% premium" value={formatValue(result?.premium)} />
          <LedgerRow label="Underpayment" value={formatValue(result?.underpayment)} />
          <LedgerRow label="Underpayment premium" value={formatValue(result?.underpaymentPremium)} />
          <LedgerRow label="Gross pay" value={formatValue(displayGross)} isTotal color="success.main" />
        </LedgerColumn>

        <LedgerColumn title="Deductions">
          <LedgerRow
            label="Absent"
            subtitle={inputs && inputs.absentDays > 0 ? `${inputs.absentDays}d` : undefined}
            value={formatValue(result?.absentDeduction)}
            isNegative={!!result?.absentDeduction}
          />
          <LedgerRow
            label="Late"
            subtitle={inputs && inputs.lateMinutes > 0 ? `${inputs.lateMinutes}m` : undefined}
            value={formatValue(result?.lateDeduction)}
            isNegative={!!result?.lateDeduction}
          />
          <LedgerRow
            label="Undertime"
            subtitle={inputs && (inputs.undertimeMinutes ?? 0) > 0 ? `${inputs.undertimeMinutes}m` : undefined}
            value={formatValue(result?.undertimeDeduction)}
            isNegative={!!result?.undertimeDeduction}
          />
          <LedgerRow label="Taxable income" subtitle={exemptionLabel} value={formatValue(result?.taxableIncome)} />
          <LedgerRow label={taxLabel} value={formatValue(result?.tax)} isNegative={!!result?.tax} />
          <LedgerRow label="Overpayment" value={formatValue(result?.overpayment)} isNegative={!!result?.overpayment} />
          <LedgerRow label="OP surcharge" value={formatValue(result?.overpaymentPremium)} isNegative={!!result?.overpaymentPremium} />
          <LedgerRow label="Total deductions" value={formatValue(result?.totalDeductions)} isTotal isNegative={!!result?.totalDeductions} />
        </LedgerColumn>
      </Box>
    </Paper>
  )
}

function RateMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: "center", px: 0.5, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.65rem", lineHeight: 1.35 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          display: "block",
          fontSize: "0.72rem",
          lineHeight: 1.4,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function LedgerColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0, px: 0.25 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontSize: "0.65rem",
          display: "block",
          mb: 0.75,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={0} divider={<Divider flexItem sx={{ borderStyle: "dotted", opacity: 0.5 }} />}>
        {children}
      </Stack>
    </Box>
  )
}

function LedgerRow({
  label,
  subtitle,
  value,
  isNegative,
  isTotal,
  color,
}: {
  label: string
  subtitle?: string | undefined
  value: string
  isNegative?: boolean | undefined
  isTotal?: boolean | undefined
  color?: string | undefined
}) {
  const showNegative = isNegative && value !== PLACEHOLDER && value !== "₱0.00"

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", py: 0.5, gap: 1.5 }}>
      <Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: isTotal ? 700 : 500,
            color: color || "text.primary",
            display: "block",
            fontSize: isTotal ? "0.75rem" : "0.72rem",
            lineHeight: 1.35,
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.62rem", display: "block", lineHeight: 1.3, mt: 0.15 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: isTotal ? 700 : 600,
          flexShrink: 0,
          fontSize: isTotal ? "0.75rem" : "0.72rem",
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          pl: 0.5,
          color: color || (showNegative ? "error.main" : "text.primary"),
        }}
      >
        {showNegative ? `(${value})` : value}
      </Typography>
    </Box>
  )
}
