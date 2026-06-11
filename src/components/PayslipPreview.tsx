import { formatPeso } from "@/lib/format"
import type { EmployeeInfo, PayrollInputs, PayrollResult } from "@/types/payroll"

const cellClassName = "border border-gray-300 px-3 py-2 text-sm"
const amountClassName = `${cellClassName} text-right tabular-nums`
const labelClassName = `${cellClassName} text-left`

export interface PayslipPreviewProps {
  employee: EmployeeInfo | null
  result: PayrollResult | null
  inputs?: PayrollInputs | null
  className?: string | undefined
}

export function PayslipPreview({ employee, result, inputs, className }: PayslipPreviewProps) {
  const isReady = employee !== null && result !== null

  const sectionClassName = [
    "rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-950",
    "print:border-gray-400 print:shadow-none",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  if (!isReady) {
    return (
      <section className={sectionClassName}>
        <div className="flex min-h-[280px] items-center justify-center font-serif text-gray-500 dark:text-gray-400">
          Fill in the form to preview
        </div>
      </section>
    )
  }

  const monthlyRate = result.earned * 2

  const formatDeduction = (value: number) => (value > 0 ? formatPeso(value) : "")

  return (
    <section className={sectionClassName}>
      <article className="font-serif text-gray-900 dark:text-gray-100">
        <header className="mb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Republic of the Philippines
          </p>
          <p className="mt-1 text-base font-bold text-[#0F6E56]">
            Philippine Fiber Industry Development Authority
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-700 dark:text-gray-300">
            PAYSLIP
          </p>
        </header>

        <div className="mb-6 space-y-1 text-sm">
          <p>
            <span className="font-medium">Name:</span> {employee.name}
          </p>
          <p>
            <span className="font-medium">Position:</span> {employee.position}
          </p>
          <p>
            <span className="font-medium">Period:</span> {employee.period}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Earnings</h3>
            <table className="w-full border-collapse">
              <tbody>
                <PayslipRow label="Rate/Month" value={formatPeso(monthlyRate)} />
                <PayslipRow
                  label="Earned for the Period"
                  value={formatPeso(result.earned)}
                />
                <PayslipRow label="20% Premium" value={formatPeso(result.premium)} />
                <PayslipRow label="Gross Pay" value={formatPeso(result.grossPay)} />
                <PayslipRow
                  label="Net Pay"
                  value={formatPeso(result.netPay)}
                  highlight
                />
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Deductions</h3>
            <table className="w-full border-collapse">
              <tbody>
                <PayslipRow
                  label="Absent"
                  value={formatDeduction(result.absentDeduction)}
                />
                <PayslipRow
                  label={
                    inputs && inputs.lateMinutes > 0
                      ? `Late (${inputs.lateMinutes} mins${inputs.lateDates ? ` — ${inputs.lateDates}` : ""})`
                      : "Late"
                  }
                  value={formatDeduction(result.lateDeduction)}
                />
                <PayslipRow
                  label={
                    inputs && (inputs.undertimeMinutes ?? 0) > 0
                      ? `Undertime (${inputs.undertimeMinutes} mins${inputs.undertimeDates ? ` — ${inputs.undertimeDates}` : ""})`
                      : "Undertime"
                  }
                  value={formatDeduction(result.undertimeDeduction)}
                />
                <PayslipRow label="5% tax" value={formatPeso(result.tax)} />
                <PayslipRow
                  label="Overpayment"
                  value={formatDeduction(result.overpayment)}
                />
                <PayslipRow
                  label="Overpayment (premium)"
                  value={formatDeduction(result.overpaymentPremium)}
                />
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  )
}

function PayslipRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  const rowClassName = highlight ? "bg-gray-100 font-bold dark:bg-gray-800" : ""

  return (
    <tr className={rowClassName}>
      <td className={labelClassName}>{label}</td>
      <td className={amountClassName}>{value}</td>
    </tr>
  )
}

