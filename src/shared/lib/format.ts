export const formatPeso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getDefaultPayPeriod(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  if (day <= 15) {
    return {
      periodStart: toIsoDate(new Date(year, month, 1)),
      periodEnd: toIsoDate(new Date(year, month, 15)),
    }
  }

  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    periodStart: toIsoDate(new Date(year, month, 16)),
    periodEnd: toIsoDate(new Date(year, month, lastDay)),
  }
}

function parseIsoDate(iso: string): Date {
  const [yearPart, monthPart, dayPart] = iso.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  return new Date(year, month - 1, day)
}

/** e.g. "April 13, 2026" for late-deduction labels in export */
export function formatShortDate(iso: string): string {
  const date = parseIsoDate(iso)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** e.g. "May 1 - 15, 2026" for payslip and export labels */
export function formatPayPeriod(periodStart: string, periodEnd: string): string {
  const start = parseIsoDate(periodStart)
  const end = parseIsoDate(periodEnd)

  const startMonth = start.toLocaleDateString("en-US", { month: "long" })
  const endMonth = end.toLocaleDateString("en-US", { month: "long" })
  const year = end.getFullYear()

  if (start.getFullYear() === year && start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
  }

  if (start.getFullYear() === year) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
  }

  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${year}`
}
