import { PH_HOLIDAYS } from "@/lib/holidays"
import { toIsoDate } from "@/lib/format"

const holidaySet = new Set(PH_HOLIDAYS)

export function getMonthFromDateString(dateStr: string): { year: number; month: number } {
  const [yearPart, monthPart] = dateStr.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)

  return {
    year: Number.isNaN(year) ? 0 : year,
    month: Number.isNaN(month) ? 1 : month,
  }
}

function parseIsoDateLocal(iso: string): Date {
  const [yearPart, monthPart, dayPart] = iso.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  return new Date(year, month - 1, day)
}

/** Weekdays (Mon–Fri) from period start through end, inclusive. */
export function computeWorkingDaysInRange(periodStart: string, periodEnd: string): number {
  const start = parseIsoDateLocal(periodStart)
  const end = parseIsoDateLocal(periodEnd)

  if (end < start) {
    return 0
  }

  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/** Weekdays in the month minus PH holidays. Month is 1-indexed. */
export function computeWorkingDays(year: number, month: number): number {
  const lastDay = new Date(year, month, 0).getDate()
  let count = 0

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day)
    const dayOfWeek = date.getDay()

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    if (holidaySet.has(toIsoDate(date))) {
      continue
    }

    count++
  }

  return count
}
