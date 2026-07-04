import { Box, Typography, Paper, useTheme, Stack } from "@mui/material"

import { formatPeso } from "@/lib/format"
import { SEMI_MONTHLY_EXEMPTION } from "@/lib/payroll"
import type { PayrollInputs, PayrollResult } from "@/types/payroll"

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
      ? `Daily rate (₱${formatPeso(result.dailyRate)}) × ${result.periodWorkingDays} weekdays`
      : result.computationType === "monthly" || result.computationType === "monthly-no-tax"
        ? "Monthly rate (fixed base)"
        : "Monthly rate ÷ 2 (fixed base)"
    : undefined

  const lateSubtitle = result && inputs && inputs.lateMinutes > 0
    ? `${inputs.lateMinutes} mins${inputs.lateDates ? ` — Late on ${inputs.lateDates}` : ""}`
    : undefined

  const undertimeSubtitle = result && inputs && (inputs.undertimeMinutes ?? 0) > 0
    ? `${inputs.undertimeMinutes} mins${inputs.undertimeDates ? ` — UT on ${inputs.undertimeDates}` : ""}`
    : undefined

  const absentSubtitle = result && inputs && inputs.absentDays > 0
    ? `${inputs.absentDays} day${inputs.absentDays > 1 ? "s" : ""}${inputs.absentDates ? ` — Absent on ${inputs.absentDates}` : ""}`
    : undefined

  const showAdditionalTax = inputs && inputs.additionalTax > 0
  const taxLabel = showAdditionalTax ? "Less: Withholding Tax" : "Less: 5% Withholding Tax"
  const taxSubtitle = result && inputs && showAdditionalTax
    ? `5% WT (₱${formatPeso(result.tax - inputs.additionalTax)}) + Add. Tax (₱${formatPeso(inputs.additionalTax)})`
    : undefined

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
          Pay Summary
        </Typography>
        {action}
      </Box>

      {/* Derived Rates Summary Bar */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: 1,
          p: 1.5,
          borderRadius: 2,
          bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "grey.50",
          border: 1,
          borderColor: "divider",
          mb: 2,
        }}
      >
        <RateMetric
          label="Working Days"
          value={result?.workingDays === undefined ? PLACEHOLDER : String(result.workingDays)}
        />
        <RateMetric
          label="Daily Rate"
          value={formatValue(result?.dailyRate)}
        />
        <RateMetric
          label="Hourly Rate"
          value={formatValue(result?.hourlyRate)}
        />
        <RateMetric
          label="Per-Minute Rate"
          value={formatValue(result?.perMinRate)}
        />
      </Box>

      {/* Itemized Ledger (Earnings vs Deductions) */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 2, md: 3 } }}>
        
        {/* Earnings Column */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 2 }}>
            Earnings
          </Typography>
          
          <Stack spacing={0.5}>
            <LedgerRow
              label="Base Earned Pay"
              subtitle={earnedSubtitle}
              value={formatValue(result?.earned)}
            />
            <LedgerRow
              label="20% Premium Surcharge"
              subtitle="20% of Sub-total"
              value={formatValue(result?.premium)}
            />
            
            <Box sx={{ pt: 2, mt: 1 }}>
              <LedgerRow
                label="Gross Pay"
                value={formatValue(displayGross)}
                isBold
                isTotal
                color="success.main"
              />
            </Box>
          </Stack>
        </Box>

        {/* Deductions Column */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 2 }}>
            Deductions
          </Typography>
          
          <Stack spacing={0.5}>
            <Box>
              <LedgerRow
                label="Absent Days"
                subtitle={absentSubtitle}
                value={formatValue(result?.absentDeduction)}
                isNegative={result?.absentDeduction && result.absentDeduction > 0 ? true : false}
              />
              {result && inputs && inputs.lateIncidents && (
                <IncidentLogList
                  incidents={inputs.lateIncidents}
                  type="absent"
                  rate={result.dailyRate}
                  unit="d"
                />
              )}
            </Box>

            <Box>
              <LedgerRow
                label="Late Minutes"
                subtitle={lateSubtitle}
                value={formatValue(result?.lateDeduction)}
                isNegative={result?.lateDeduction && result.lateDeduction > 0 ? true : false}
              />
              {result && inputs && inputs.lateIncidents && (
                <IncidentLogList
                  incidents={inputs.lateIncidents}
                  type="late"
                  rate={result.perMinRate}
                  unit="m"
                />
              )}
            </Box>

            <Box>
              <LedgerRow
                label="Undertime Minutes"
                subtitle={undertimeSubtitle}
                value={formatValue(result?.undertimeDeduction)}
                isNegative={result?.undertimeDeduction && result.undertimeDeduction > 0 ? true : false}
              />
              {result && inputs && inputs.lateIncidents && (
                <IncidentLogList
                  incidents={inputs.lateIncidents}
                  type="undertime"
                  rate={result.perMinRate}
                  unit="m"
                />
              )}
            </Box>

            <LedgerRow
              label="Taxable Income"
              subtitle={exemptionLabel}
              value={formatValue(result?.taxableIncome)}
            />

            <LedgerRow
              label={taxLabel}
              subtitle={taxSubtitle}
              value={formatValue(result?.tax)}
              isNegative={result?.tax && result.tax > 0 ? true : false}
            />

            <LedgerRow
              label="Overpayment Recovery"
              value={formatValue(result?.overpayment)}
              isNegative={result?.overpayment && result.overpayment > 0 ? true : false}
            />

            <LedgerRow
              label="Overpayment Surcharge (20%)"
              value={formatValue(result?.overpaymentPremium)}
              isNegative={result?.overpaymentPremium && result.overpaymentPremium > 0 ? true : false}
            />
            
            <Box sx={{ pt: 2, mt: 1 }}>
              <LedgerRow
                label="Total Deductions"
                value={formatValue(result?.totalDeductions)}
                isBold
                isTotal
                isNegative={result?.totalDeductions && result.totalDeductions > 0 ? true : false}
              />
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Net Pay Banner */}
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: mode === "dark" ? "rgba(5, 150, 105, 0.15)" : "rgba(5, 150, 105, 0.06)",
          border: 1,
          borderColor: mode === "dark" ? "success.dark" : "success.light",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: mode === "dark" ? "#6ee7b7" : "#047857", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Net Take-home Pay
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Final payroll payout for the designated cutoff period
          </Typography>
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            color: mode === "dark" ? "#34d399" : "#059669",
            letterSpacing: -0.5,
          }}
        >
          {formatValue(result?.netPay)}
        </Typography>
      </Box>
    </Paper>
  )
}

function RateMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
        {value}
      </Typography>
    </Box>
  )
}

function LedgerRow({
  label,
  subtitle,
  value,
  isNegative,
  isBold,
  isTotal,
  color,
}: {
  label: string
  subtitle?: string | undefined
  value: string
  isNegative?: boolean | undefined
  isBold?: boolean | undefined
  isTotal?: boolean | undefined
  color?: string | undefined
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        py: 1,
        borderBottom: isTotal ? "2px double" : "1px dashed",
        borderColor: isTotal ? "divider" : "rgba(0, 0, 0, 0.05)",
        "&": {
          borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
        }
      }}
    >
      <Box sx={{ pr: 2 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isBold || isTotal ? 700 : 500,
            color: color || "text.primary",
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.72rem" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isBold || isTotal ? 700 : 600,
          color: color || (isNegative && value !== PLACEHOLDER && value !== "₱0.00" ? "error.main" : "text.primary"),
        }}
      >
        {isNegative && value !== PLACEHOLDER && value !== "₱0.00" ? `(${value})` : value}
      </Typography>
    </Box>
  )
}

function IncidentLogList({
  incidents,
  type,
  rate,
  unit,
}: {
  incidents: Array<{ date: string; minutes: number; type: "late" | "undertime" | "absent"; days?: number }>
  type: "late" | "undertime" | "absent"
  rate: number
  unit: string
}) {
  const filtered = incidents.filter((i) => i.type === type)
  if (filtered.length === 0) return null

  return (
    <Box sx={{ pl: 2, mt: 0.5, borderLeft: "2px solid", borderColor: "divider" }}>
      {filtered.map((incident, idx) => {
        const count = type === "absent" ? incident.days ?? 0 : incident.minutes
        if (!incident.date?.trim() || !(count > 0)) return null
        const deduction = count * rate

        return (
          <Box
            key={idx}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 0.25,
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              • {incident.date} ({count}{unit})
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {formatPeso(deduction)}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
