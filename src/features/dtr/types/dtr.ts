export interface DtrDayLog {
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
    | "special-holiday"
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
  location?: string
  specialNote?: string
  reason?: string
}

export interface SavedDtr {
  id: string
  employeeName: string
  month: number
  year: number
  cutoffPeriod: "1st-half" | "2nd-half" | "full-month"
  dtrNo: string
  designation: string
  department: string
  timeScheduleFrom: string
  timeScheduleTo: string
  supervisorName: string
  supervisorTitle: string
  days: DtrDayLog[]
  updatedAt: string
}
