import type { PayrollInputs } from "@/features/payroll/types/payroll"

export type ComputationType = PayrollInputs["computationType"]

export const COMPUTATION_TYPE_OPTIONS: ReadonlyArray<{
  value: ComputationType
  label: string
}> = [
  { value: "semi-monthly", label: "Semi-Monthly (with tax)" },
  { value: "semi-monthly-no-tax", label: "Semi-Monthly (no tax)" },
  { value: "daily", label: "Daily Rate (with tax)" },
  { value: "monthly", label: "Monthly (with tax)" },
  { value: "monthly-no-tax", label: "Monthly (no tax)" },
] as const

export function computationTypeLabel(type: ComputationType): string {
  return COMPUTATION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

/** Abbreviated label for tight table columns. */
export function computationTypeShortLabel(type: ComputationType): string {
  switch (type) {
    case "daily":
      return "Daily"
    case "monthly":
      return "Monthly"
    case "monthly-no-tax":
      return "Monthly (NT)"
    case "semi-monthly-no-tax":
      return "Semi-Mo (NT)"
    default:
      return "Semi-Mo"
  }
}
