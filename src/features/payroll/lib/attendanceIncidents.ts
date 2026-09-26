export const HALFDAY_ABSENCE_DAYS = 0.5

export type AttendanceIncidentType =
  | "late"
  | "undertime"
  | "absent"
  | "halfday"
  | "halfday-am"
  | "halfday-pm"

export type AttendanceIncident = {
  date: string
  minutes: number
  type: AttendanceIncidentType
  days?: number
}

export function isHalfDayAttendanceType(type?: string | undefined): boolean {
  return type === "halfday" || type === "halfday-am" || type === "halfday-pm"
}

export function isDayBasedAttendanceType(type?: string | undefined): boolean {
  return type === "absent" || isHalfDayAttendanceType(type)
}

export function absenceDaysForIncident(item: { type?: string | undefined; days?: unknown; minutes?: unknown }): number {
  if (isHalfDayAttendanceType(item.type)) return HALFDAY_ABSENCE_DAYS
  if (item.type === "absent") return Number(item.days) || 0
  return 0
}

export function attendanceTypeLabel(type?: string | undefined): string {
  if (type === "undertime") return "Undertime"
  if (type === "absent") return "Absence"
  if (type === "halfday-am") return "Half-day absence (Morning)"
  if (type === "halfday-pm") return "Half-day absence (Afternoon)"
  if (type === "halfday") return "Half-day absence"
  return "Tardiness (Late)"
}

export function attendanceDurationText(item: { type?: string | undefined; minutes?: unknown; days?: unknown }): string {
  const days = absenceDaysForIncident(item)
  if (isDayBasedAttendanceType(item.type)) {
    return `${days} day${days === 1 ? "" : "s"}`
  }
  const minutes = Number(item.minutes) || 0
  return `${minutes} min${minutes === 1 ? "" : "s"}`
}
