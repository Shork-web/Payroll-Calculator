import type { CSSProperties } from "react"
import { Box, Typography, Paper, Stack, Divider, useTheme } from "@mui/material"

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

  const exemptionLabel = `After ₱${formatPeso(SEMI_MONTHLY_EXEMPTION)} exemption`
  const displayGross = result ? result.total + result.premium : undefined

  const lateSubtitle = result && inputs && inputs.lateMinutes > 0
    ? `${inputs.lateMinutes} mins${inputs.lateDates ? ` — Late on ${inputs.lateDates}` : ""}`
    : undefined

  const undertimeSubtitle = result && inputs && (inputs.undertimeMinutes ?? 0) > 0
    ? `${inputs.undertimeMinutes} mins${inputs.undertimeDates ? ` — UT on ${inputs.undertimeDates}` : ""}`
    : undefined

  return (
    <Paper sx={{ p: 3, elevation: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Pay summary
        </Typography>
        {action}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        {/* RATE DERIVATION */}
        <Typography variant="caption" sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, mt: 2 }}>
          Rate Derivation
        </Typography>
        <MetricCard
          label="Working days this month"
          subtitle="Determines daily divisor"
          value={result?.workingDays === undefined ? PLACEHOLDER : String(result.workingDays)}
        />
        <MetricCard
          label="Daily rate"
          value={formatValue(result?.dailyRate)}
        />
        <MetricCard
          label="Per-hour rate"
          value={formatValue(result?.hourlyRate)}
        />
        <MetricCard
          label="Per-minute rate"
          value={formatValue(result?.perMinRate)}
        />

        {/* COMPUTATION */}
        <Typography variant="caption" sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, mt: 2 }}>
          Computation
        </Typography>
        <MetricCard
          label="Earned Pay"
          subtitle="Monthly rate ÷ 2 (fixed base)"
          value={formatValue(result?.earned)}
        />
        <MetricCard
          label="Less: Absent"
          value={formatValue(result?.absentDeduction)}
          valueColor={result?.absentDeduction && result.absentDeduction > 0 ? "error" : "text.disabled"}
        />
        <MetricCard
          label="Less: Late"
          subtitle={lateSubtitle}
          value={formatValue(result?.lateDeduction)}
          valueColor={result?.lateDeduction && result.lateDeduction > 0 ? "error" : "text.disabled"}
        >
          {result && inputs && inputs.lateIncidents && inputs.lateIncidents.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 1 }}>
              {inputs.lateIncidents
                .filter((incident) => incident.type === "late")
                .map((incident, index) => {
                  if (!incident.date?.trim() || !(Number(incident.minutes) > 0)) {
                    return null
                  }
                  const incidentDeduction = Number(incident.minutes) * result.perMinRate
                  return (
                    <Box key={index} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "text.secondary" }}>
                      <span>• {incident.date} ({incident.minutes} mins)</span>
                      <Typography sx={{ fontWeight: 600 }}>{formatPeso(incidentDeduction)}</Typography>
                    </Box>
                  )
                })}
            </Box>
          )}
        </MetricCard>
        <MetricCard
          label="Less: Undertime"
          subtitle={undertimeSubtitle}
          value={formatValue(result?.undertimeDeduction)}
          valueColor={result?.undertimeDeduction && result.undertimeDeduction > 0 ? "error" : "text.disabled"}
        >
          {result && inputs && inputs.lateIncidents && inputs.lateIncidents.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 1 }}>
              {inputs.lateIncidents
                .filter((incident) => incident.type === "undertime")
                .map((incident, index) => {
                  if (!incident.date?.trim() || !(Number(incident.minutes) > 0)) {
                    return null
                  }
                  const incidentDeduction = Number(incident.minutes) * result.perMinRate
                  return (
                    <Box key={index} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "text.secondary" }}>
                      <span>• {incident.date} ({incident.minutes} mins)</span>
                      <Typography sx={{ fontWeight: 600 }}>{formatPeso(incidentDeduction)}</Typography>
                    </Box>
                  )
                })}
            </Box>
          )}
        </MetricCard>
        <MetricCard
          label="Sub-total"
          value={formatValue(result?.total)}
        />
        <MetricCard
          label="Add: 20% Premium"
          subtitle="20% of Sub-total"
          value={formatValue(result?.premium)}
        />
        <MetricCard
          label="Gross Pay"
          subtitle="Sub-total + Premium"
          value={formatValue(displayGross)}
          sx={{ bgcolor: mode === "dark" ? "rgba(5, 150, 105, 0.15)" : "rgba(5, 150, 105, 0.08)", borderColor: "success.main" }}
        />

        {/* DEDUCTIONS */}
        <Typography variant="caption" sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, mt: 2 }}>
          Deductions from Gross Pay
        </Typography>
        <MetricCard
          label="Taxable Income"
          subtitle={exemptionLabel}
          value={formatValue(result?.taxableIncome)}
        />
        <MetricCard
          label="Less: 5% Withholding Tax"
          value={formatValue(result?.tax)}
          valueColor={result?.tax && result.tax > 0 ? "error" : "text.disabled"}
        />
        <MetricCard
          label="Less: Overpayment"
          value={formatValue(result?.overpayment)}
          valueColor={result?.overpayment && result.overpayment > 0 ? "error" : "text.disabled"}
        />
        <MetricCard
          label="Less: Overpayment Premium"
          subtitle="20% of Overpayment"
          value={formatValue(result?.overpaymentPremium)}
          valueColor={result?.overpaymentPremium && result.overpaymentPremium > 0 ? "error" : "text.disabled"}
        />

        {/* RESULT */}
        <Typography variant="caption" sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, mt: 2 }}>
          Result
        </Typography>
        <MetricCard
          label="Net Amount"
          value={formatValue(result?.netPay)}
          valueColor="success"
          valueStyle={{ fontSize: "28px" }}
          sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1", lg: "1 / -1" }, bgcolor: mode === "dark" ? "rgba(5, 150, 105, 0.15)" : "rgba(5, 150, 105, 0.08)", borderColor: "success.main" }}
        />
      </Box>
    </Paper>
  )
}

function MetricCard({
  label,
  subtitle,
  value,
  valueColor,
  valueStyle,
  sx,
  children,
}: {
  label: string
  subtitle?: string | undefined
  value: string
  valueColor?: "error" | "success" | "text.disabled" | "text.secondary" | undefined
  valueStyle?: CSSProperties | undefined
  sx?: object | undefined
  children?: React.ReactNode | undefined
}) {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "grey.50", ...sx }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
        {label}
      </Typography>
      {subtitle ? <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>{subtitle}</Typography> : null}
      <Typography sx={{ mt: 1, fontWeight: 600, color: valueColor || "text.primary", ...valueStyle }}>
        {value}
      </Typography>
      {children}
    </Paper>
  )
}
