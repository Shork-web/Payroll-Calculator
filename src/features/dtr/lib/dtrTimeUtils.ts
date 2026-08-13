export function parseTimeToMinutes(t: string, isPm = false): number {
  if (!t || !t.includes(":")) return 0
  const [hStr, mStr] = t.split(":")
  let h = parseInt(hStr || "0", 10)
  const m = parseInt(mStr || "0", 10)
  if (isPm && h < 12) {
    h += 12
  }
  return h * 60 + m
}

export function getDefaultTimesForDay() {
  return { amIn: "08:00", amOut: "12:00", pmIn: "01:00", pmOut: "05:00" }
}
