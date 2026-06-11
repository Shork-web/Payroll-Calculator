import type { CSSProperties } from "react"

import { formatPeso } from "@/lib/format"
import { SEMI_MONTHLY_EXEMPTION } from "@/lib/payroll"
import type { PayrollInputs, PayrollResult } from "@/types/payroll"

const PLACEHOLDER = "—"

const cardClassName =
  "rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"

const labelClassName = "text-sm font-medium text-gray-600 dark:text-gray-400"

const metricValueClassName =
  "mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100"

const subtitleClassName = "mt-0.5 text-xs text-gray-500 dark:text-gray-400"

const sectionHeadingClassName =
  "col-span-full border-t border-gray-200 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400"

export interface PaySummaryProps {
  result: PayrollResult | null
  inputs: PayrollInputs | null
}

export function PaySummary({ result, inputs }: PaySummaryProps) {
  const formatValue = (value: number | undefined) =>
    value === undefined ? PLACEHOLDER : formatPeso(value)

  const deductionValueClass = (value: number | undefined) => {
    if (value === undefined) {
      return metricValueClassName
    }
    if (value > 0) {
      return `${metricValueClassName} text-red-600 dark:text-red-400`
    }
    return `${metricValueClassName} text-gray-400 dark:text-gray-500`
  }

  const exemptionLabel = `After ₱${formatPeso(SEMI_MONTHLY_EXEMPTION)} exemption`
  const displayGross = result ? result.total + result.premium : undefined

  const lateSubtitle = result && inputs && inputs.lateMinutes > 0
    ? `${inputs.lateMinutes} mins${inputs.lateDates ? ` — Late on ${inputs.lateDates}` : ""}`
    : undefined

  const undertimeSubtitle = result && inputs && (inputs.undertimeMinutes ?? 0) > 0
    ? `${inputs.undertimeMinutes} mins${inputs.undertimeDates ? ` — UT on ${inputs.undertimeDates}` : ""}`
    : undefined

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-950">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Pay summary
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* RATE DERIVATION */}
        <p className={sectionHeadingClassName}>Rate Derivation</p>
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
        <p className={sectionHeadingClassName}>Computation</p>
        <MetricCard
          label="Earned Pay"
          subtitle="Monthly rate ÷ 2 (fixed base)"
          value={formatValue(result?.earned)}
        />
        <MetricCard
          label="Less: Absent"
          value={formatValue(result?.absentDeduction)}
          valueClassName={deductionValueClass(result?.absentDeduction)}
        />
        <MetricCard
          label="Less: Late"
          subtitle={lateSubtitle}
          value={formatValue(result?.lateDeduction)}
          valueClassName={deductionValueClass(result?.lateDeduction)}
        >
          {result && inputs && inputs.lateIncidents && inputs.lateIncidents.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-800/50 flex flex-col gap-1 text-xs">
              {inputs.lateIncidents
                .filter((incident) => incident.type === "late")
                .map((incident, index) => {
                  if (!incident.date?.trim() || !(Number(incident.minutes) > 0)) {
                    return null
                  }
                  const incidentDeduction = Number(incident.minutes) * result.perMinRate
                  return (
                    <div key={index} className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>• {incident.date} ({incident.minutes} mins)</span>
                      <span className="font-medium tabular-nums">{formatPeso(incidentDeduction)}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </MetricCard>
        <MetricCard
          label="Less: Undertime"
          subtitle={undertimeSubtitle}
          value={formatValue(result?.undertimeDeduction)}
          valueClassName={deductionValueClass(result?.undertimeDeduction)}
        >
          {result && inputs && inputs.lateIncidents && inputs.lateIncidents.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-800/50 flex flex-col gap-1 text-xs">
              {inputs.lateIncidents
                .filter((incident) => incident.type === "undertime")
                .map((incident, index) => {
                  if (!incident.date?.trim() || !(Number(incident.minutes) > 0)) {
                    return null
                  }
                  const incidentDeduction = Number(incident.minutes) * result.perMinRate
                  return (
                    <div key={index} className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>• {incident.date} ({incident.minutes} mins)</span>
                      <span className="font-medium tabular-nums">{formatPeso(incidentDeduction)}</span>
                    </div>
                  )
                })}
            </div>
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
          className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
        />

        {/* DEDUCTIONS */}
        <p className={sectionHeadingClassName}>Deductions from Gross Pay</p>
        <MetricCard
          label="Taxable Income"
          subtitle={exemptionLabel}
          value={formatValue(result?.taxableIncome)}
        />
        <MetricCard
          label="Less: 5% Withholding Tax"
          value={formatValue(result?.tax)}
          valueClassName={deductionValueClass(result?.tax)}
        />
        <MetricCard
          label="Less: Overpayment"
          value={formatValue(result?.overpayment)}
          valueClassName={deductionValueClass(result?.overpayment)}
        />
        <MetricCard
          label="Less: Overpayment Premium"
          subtitle="20% of Overpayment"
          value={formatValue(result?.overpaymentPremium)}
          valueClassName={deductionValueClass(result?.overpaymentPremium)}
        />

        {/* RESULT */}
        <p className={sectionHeadingClassName}>Result</p>
        <MetricCard
          label="Net Amount"
          value={formatValue(result?.netPay)}
          valueClassName="mt-1 font-bold text-emerald-700 dark:text-emerald-400"
          valueStyle={{ fontSize: "28px" }}
          className="sm:col-span-2 lg:col-span-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
        />
      </div>
    </section>
  )
}

function MetricCard({
  label,
  subtitle,
  value,
  valueClassName = metricValueClassName,
  valueStyle,
  className,
  children,
}: {
  label: string
  subtitle?: string | undefined
  value: string
  valueClassName?: string | undefined
  valueStyle?: CSSProperties | undefined
  className?: string | undefined
  children?: React.ReactNode | undefined
}) {
  return (
    <article className={`${cardClassName} ${className ?? ""}`.trim()}>
      <p className={labelClassName}>{label}</p>
      {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
      <p className={valueClassName} style={valueStyle}>
        {value}
      </p>
      {children}
    </article>
  )
}
