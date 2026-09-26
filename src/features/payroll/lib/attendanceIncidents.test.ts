import { describe, expect, it } from "vitest"
import {
  isHalfDayAttendanceType,
  isDayBasedAttendanceType,
  absenceDaysForIncident,
  attendanceTypeLabel,
  attendanceDurationText,
} from "./attendanceIncidents"

describe("attendanceIncidents", () => {
  it("recognizes halfday, halfday-am, and halfday-pm as half day types", () => {
    expect(isHalfDayAttendanceType("halfday")).toBe(true)
    expect(isHalfDayAttendanceType("halfday-am")).toBe(true)
    expect(isHalfDayAttendanceType("halfday-pm")).toBe(true)
    expect(isHalfDayAttendanceType("absent")).toBe(false)
    expect(isHalfDayAttendanceType("late")).toBe(false)
    expect(isHalfDayAttendanceType("undertime")).toBe(false)
    expect(isHalfDayAttendanceType(undefined)).toBe(false)
  })

  it("recognizes absent and all half day types as day-based", () => {
    expect(isDayBasedAttendanceType("absent")).toBe(true)
    expect(isDayBasedAttendanceType("halfday")).toBe(true)
    expect(isDayBasedAttendanceType("halfday-am")).toBe(true)
    expect(isDayBasedAttendanceType("halfday-pm")).toBe(true)
    expect(isDayBasedAttendanceType("late")).toBe(false)
    expect(isDayBasedAttendanceType("undertime")).toBe(false)
  })

  it("computes absence days correctly for half day variants and full day absences", () => {
    expect(absenceDaysForIncident({ type: "halfday" })).toBe(0.5)
    expect(absenceDaysForIncident({ type: "halfday-am" })).toBe(0.5)
    expect(absenceDaysForIncident({ type: "halfday-pm" })).toBe(0.5)
    expect(absenceDaysForIncident({ type: "absent", days: 1 })).toBe(1)
    expect(absenceDaysForIncident({ type: "absent", days: "2" })).toBe(2)
    expect(absenceDaysForIncident({ type: "late", minutes: 15 })).toBe(0)
  })

  it("returns explicit morning and afternoon labels for half day absences", () => {
    expect(attendanceTypeLabel("halfday-am")).toBe("Half-day absence (Morning)")
    expect(attendanceTypeLabel("halfday-pm")).toBe("Half-day absence (Afternoon)")
    expect(attendanceTypeLabel("halfday")).toBe("Half-day absence")
    expect(attendanceTypeLabel("absent")).toBe("Absence")
    expect(attendanceTypeLabel("undertime")).toBe("Undertime")
    expect(attendanceTypeLabel("late")).toBe("Tardiness (Late)")
  })

  it("formats duration text for attendance types", () => {
    expect(attendanceDurationText({ type: "halfday-am" })).toBe("0.5 days")
    expect(attendanceDurationText({ type: "halfday-pm" })).toBe("0.5 days")
    expect(attendanceDurationText({ type: "absent", days: 1 })).toBe("1 day")
    expect(attendanceDurationText({ type: "absent", days: 2 })).toBe("2 days")
    expect(attendanceDurationText({ type: "late", minutes: 10 })).toBe("10 mins")
  })
})
