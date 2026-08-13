import type { DtrDayLog } from "@/features/dtr/types/dtr"
import { parseTimeToMinutes } from "./dtrTimeUtils"

export function computeDayAdjustments(
  log: DtrDayLog,
): { lateMinutes: number; undertimeMinutes: number } {
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
    targetPmOutStr: string,
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
    let requiredPmOutMin = 1020

    if (log.amIn && log.status !== "leave-cto-am") {
      const amInMin = parseTimeToMinutes(log.amIn, false)
      if (amInMin <= 420) {
        requiredPmOutMin = 960
      } else if (amInMin > 420 && amInMin <= 480) {
        requiredPmOutMin = amInMin + 540
      } else {
        late += amInMin - 480
        requiredPmOutMin = 1020
      }
    } else {
      let pmLate = 0
      if (log.pmIn && log.status !== "leave-cto-pm") {
        const pmInMin = parseTimeToMinutes(log.pmIn, true)
        if (pmInMin > 780) {
          pmLate = pmInMin - 780
        }
      }

      let utOption1 = 0
      let utOption2 = 0
      if (log.status !== "special" && log.pmOut && log.status !== "leave-cto-pm") {
        const pmOutMin = parseTimeToMinutes(log.pmOut, true)
        if (pmOutMin < 960) {
          utOption1 = 960 - pmOutMin
        }
        if (pmOutMin < 1020) {
          utOption2 = 1020 - pmOutMin
        }
      }

      const opt1Total = pmLate + utOption1
      const opt2Total = pmLate + utOption2

      if (opt1Total < opt2Total) {
        late += pmLate
        ut += utOption1
        requiredPmOutMin = 960
      } else {
        late += pmLate
        ut += utOption2
        requiredPmOutMin = 1020
      }
    }

    if (log.amIn && log.status !== "leave-cto-am") {
      if (log.pmIn && log.status !== "leave-cto-pm") {
        const pmInMin = parseTimeToMinutes(log.pmIn, true)
        if (pmInMin > 780) {
          late += pmInMin - 780
        }
      }

      if (log.status !== "special") {
        if (log.amOut) {
          const amOutMin = parseTimeToMinutes(log.amOut, false)
          if (amOutMin < 720) {
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
    }
  } else if (isTuesdayToFriday) {
    let requiredPmOutMin = 1020

    if (log.amIn && log.status !== "leave-cto-am") {
      const amInMin = parseTimeToMinutes(log.amIn, false)
      if (amInMin <= 420) {
        requiredPmOutMin = 960
      } else if (amInMin > 420 && amInMin <= 540) {
        requiredPmOutMin = amInMin + 540
      } else {
        late += amInMin - 540
        requiredPmOutMin = 1080
      }
    }

    if (log.pmIn && log.status !== "leave-cto-pm") {
      const pmInMin = parseTimeToMinutes(log.pmIn, true)
      if (pmInMin > 780) {
        late += pmInMin - 780
      }
    }

    if (log.status !== "special") {
      if (log.amOut && log.status !== "leave-cto-am") {
        const amOutMin = parseTimeToMinutes(log.amOut, false)
        if (amOutMin < 720) {
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
    const fallbackOpt = calcSchedule("08:00", "12:00", "01:00", "05:00")
    late = fallbackOpt.late
    ut = fallbackOpt.ut
  }

  return { lateMinutes: late, undertimeMinutes: ut }
}
