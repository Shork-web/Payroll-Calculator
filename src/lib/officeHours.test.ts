import { describe, expect, it } from "vitest"

interface DtrDayLog {
  day: number
  dayName: string
  amIn: string
  amOut: string
  pmIn: string
  pmOut: string
  status:
    | "regular"
    | "absent"
    | "weekend"
    | "holiday"
    | "leave"
    | "ob"
    | "special"
    | "leave-vl"
    | "leave-fl"
    | "leave-sl"
    | "leave-ml"
    | "leave-pl"
    | "leave-spl"
    | "leave-mc"
    | "leave-vawc"
    | "leave-slp"
    | "leave-wl"
    | "leave-sel"
    | "leave-rl"
    | "leave-stl"
    | "leave-cto"
    | "leave-cto-am"
    | "leave-cto-pm"
    | "leave-wlcos"
  lateMinutes: number
  undertimeMinutes: number
}

function parseTimeToMinutes(t: string, isPm = false): number {
  if (!t || !t.includes(":")) return 0
  const [hStr, mStr] = t.split(":")
  let h = parseInt(hStr || "0", 10)
  const m = parseInt(mStr || "0", 10)
  if (isPm && h < 12) {
    h += 12
  }
  return h * 60 + m
}

const getDefaultTimesForDay = () => {
  return { amIn: "08:00", amOut: "12:00", pmIn: "01:00", pmOut: "05:00" }
}

const computeDayAdjustments = (log: DtrDayLog): { lateMinutes: number; undertimeMinutes: number } => {
  if (
    log.status !== "regular" &&
    log.status !== "special" &&
    log.status !== "leave-cto-am" &&
    log.status !== "leave-cto-pm"
  ) {
    return { lateMinutes: 0, undertimeMinutes: 0 }
  }

  let late = 0
  let ut = 0

  const calcSchedule = (
    targetAmInStr: string,
    targetAmOutStr: string,
    targetPmInStr: string,
    targetPmOutStr: string
  ) => {
    let l = 0
    let u = 0
    const targetAmIn = parseTimeToMinutes(targetAmInStr, false)
    const targetAmOut = parseTimeToMinutes(targetAmOutStr, false)
    const targetPmIn = parseTimeToMinutes(targetPmInStr, true)
    const targetPmOut = parseTimeToMinutes(targetPmOutStr, true)

    if (log.amIn && log.status !== "leave-cto-am") {
      const amInMin = parseTimeToMinutes(log.amIn, false)
      if (amInMin > targetAmIn) {
        l += amInMin - targetAmIn
      }
    }

    if (log.pmIn && log.status !== "leave-cto-pm") {
      const pmInMin = parseTimeToMinutes(log.pmIn, true)
      if (pmInMin > targetPmIn) {
        l += pmInMin - targetPmIn
      }
    }

    if (log.status !== "special") {
      if (log.amOut && log.status !== "leave-cto-am") {
        const amOutMin = parseTimeToMinutes(log.amOut, false)
        if (amOutMin < targetAmOut) {
          u += targetAmOut - amOutMin
        }
      }
      if (log.pmOut && log.status !== "leave-cto-pm") {
        const pmOutMin = parseTimeToMinutes(log.pmOut, true)
        if (pmOutMin < targetPmOut) {
          u += targetPmOut - pmOutMin
        }
      }
    }

    return { late: l, ut: u }
  }

  const dayNameLower = (log.dayName || "").toLowerCase()
  const isMonday = dayNameLower.startsWith("mon")
  const isTuesdayToFriday =
    dayNameLower.startsWith("tue") ||
    dayNameLower.startsWith("wed") ||
    dayNameLower.startsWith("thu") ||
    dayNameLower.startsWith("fri")

  if (isMonday) {
    // Monday Strict (7-4 or 8-5)
    const option1 = calcSchedule("07:00", "12:00", "01:00", "04:00") // 7-4
    const option2 = calcSchedule("08:00", "12:00", "01:00", "05:00") // 8-5
    const opt1Total = option1.late + option1.ut
    const opt2Total = option2.late + option2.ut

    if (opt1Total < opt2Total) {
      late = option1.late
      ut = option1.ut
    } else {
      late = option2.late
      ut = option2.ut
    }
  } else if (isTuesdayToFriday) {
    // Tuesday-Friday Flexi (7-4, 8-5, 9-6)
    let requiredPmOutMin = 1020 // Default 5:00 PM (17:00) in minutes
    
    if (log.amIn && log.status !== "leave-cto-am") {
      const amInMin = parseTimeToMinutes(log.amIn, false)
      if (amInMin <= 420) { // 7:00 AM or earlier
        requiredPmOutMin = 960 // 4:00 PM (16:00)
      } else if (amInMin > 420 && amInMin <= 540) { // between 7:00 AM and 9:00 AM
        requiredPmOutMin = amInMin + 540 // AM IN + 8 hours work + 1 hour lunch
      } else { // after 9:00 AM
        late += amInMin - 540 // Late relative to 9:00 AM
        requiredPmOutMin = 1080 // 6:00 PM (18:00)
      }
    }

    if (log.pmIn && log.status !== "leave-cto-pm") {
      const pmInMin = parseTimeToMinutes(log.pmIn, true)
      if (pmInMin > 780) { // PM IN target: 1:00 PM
        late += pmInMin - 780
      }
    }

    if (log.status !== "special") {
      if (log.amOut && log.status !== "leave-cto-am") {
        const amOutMin = parseTimeToMinutes(log.amOut, false)
        if (amOutMin < 720) { // AM OUT target: 12:00 PM
          ut += 720 - amOutMin
        }
      }

      if (log.pmOut && log.status !== "leave-cto-pm") {
        const pmOutMin = parseTimeToMinutes(log.pmOut, true)
        if (pmOutMin < requiredPmOutMin) {
          ut += requiredPmOutMin - pmOutMin
        }
      }
    }
  } else {
    // Fallback for other days (e.g. working weekends) - default 8-5 schedule
    const fallbackOpt = calcSchedule("08:00", "12:00", "01:00", "05:00")
    late = fallbackOpt.late
    ut = fallbackOpt.ut
  }

  return { lateMinutes: late, undertimeMinutes: ut }
}

describe("Office Hours Calculations", () => {
  describe("getDefaultTimesForDay", () => {
    it("returns correct default times", () => {
      expect(getDefaultTimesForDay()).toEqual({ amIn: "08:00", amOut: "12:00", pmIn: "01:00", pmOut: "05:00" })
    })
  })

  describe("Monday Strict Calculations", () => {
    it("calculates 0 late/undertime when perfectly matching 8-5 on Monday", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates 0 late/undertime when perfectly matching 7-4 on Monday", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "07:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("detects 5 mins late relative to 8-5 schedule on Monday when arriving at 8:05", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:05",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 5, undertimeMinutes: 0 })
    })

    it("detects 10 mins undertime relative to 7-4 schedule on Monday when leaving at 3:50 PM", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "07:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "03:50",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 10 })
    })
  })

  describe("Tuesday-Friday Flexi Calculations", () => {
    it("calculates 0 late/undertime for arrival at 7:30 AM and departure at 4:30 PM", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "07:30",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:30",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates 15 mins undertime if arriving at 7:30 AM and departing at 4:15 PM", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "07:30",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:15",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 15 })
    })

    it("calculates 0 late/undertime for early arrival (e.g. 6:45 AM) with departure at 4:00 PM", () => {
      const result = computeDayAdjustments({
        day: 3,
        dayName: "Wed",
        amIn: "06:45",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates tardiness when arriving after 9:00 AM (e.g., 9:15 AM)", () => {
      const result = computeDayAdjustments({
        day: 4,
        dayName: "Thu",
        amIn: "09:15",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "06:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 15, undertimeMinutes: 0 })
    })

    it("calculates tardiness and undertime when arriving after 9:00 AM (e.g., 9:15 AM) and leaving early (e.g., 5:45 PM)", () => {
      const result = computeDayAdjustments({
        day: 4,
        dayName: "Thu",
        amIn: "09:15",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:45",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 15, undertimeMinutes: 15 })
    })
  })

  describe("Half Day CTO Calculations", () => {
    it("ignores morning late/undertime for leave-cto-am on Monday Strict", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:15", // late in morning, but ignored
        amOut: "11:45", // undertime in morning, but ignored
        pmIn: "01:00", // on time for afternoon
        pmOut: "05:00", // on time for afternoon
        status: "leave-cto-am",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates afternoon late and undertime for leave-cto-am on Monday Strict", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "",
        amOut: "",
        pmIn: "01:10", // 10 mins late
        pmOut: "03:50", // 10 mins undertime (based on 4:00 PM target of 7-4 option)
        status: "leave-cto-am",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 10, undertimeMinutes: 10 })
    })

    it("ignores afternoon late/undertime for leave-cto-pm on Tuesday-Friday Flexi", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "08:00", // on time
        amOut: "12:00", // on time
        pmIn: "01:15", // late in afternoon, but ignored
        pmOut: "04:30", // undertime in afternoon, but ignored
        status: "leave-cto-pm",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates morning late and undertime for leave-cto-pm on Tuesday-Friday Flexi", () => {
      const result = computeDayAdjustments({
        day: 3,
        dayName: "Wed",
        amIn: "09:05", // 5 mins late relative to 09:00 AM limit
        amOut: "11:50", // 10 mins undertime relative to 12:00 PM target
        pmIn: "",
        pmOut: "",
        status: "leave-cto-pm",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 5, undertimeMinutes: 10 })
    })
  })
})
