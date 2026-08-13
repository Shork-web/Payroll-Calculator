export const DTR_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const

export interface LeaveLegendItem {
  code: string
  name: string
  category: "regular" | "family" | "special" | "cos"
  description: string
}

export const LEAVE_LEGEND_ITEMS: LeaveLegendItem[] = [
  { code: "VL", name: "Vacation Leave", category: "regular", description: "15 days per year (accumulates at 1.25 days/month) for personal trips and rest. Unused days roll over indefinitely." },
  { code: "FL", name: "Forced / Mandatory Leave", category: "regular", description: "5 days required annually if you have 10 or more VL days accumulated. Deducted from your VL balance; if not taken, these 5 days are forfeited." },
  { code: "SL", name: "Sick Leave", category: "regular", description: "15 days per year (accumulates at 1.25 days/month) for medical illnesses or medical appointments. Unused days roll over indefinitely and can be monetized at retirement." },
  { code: "ML", name: "Maternity Leave", category: "family", description: "105 days of fully paid leave for female employees for every instance of live birth, abortion, or miscarriage. Adoptive mothers can claim 60 days if the child is under 7 years old." },
  { code: "PL", name: "Paternity Leave", category: "family", description: "7 days of paid leave for married male employees to support their legitimate spouse for the first four deliveries or miscarriages." },
  { code: "SPL", name: "Solo Parent Leave", category: "family", description: "7 working days of paid leave annually for single parents to attend to parental duties, available after 6 months of service." },
  { code: "MC", name: "Special Leave Benefits for Women (Magna Carta)", category: "special", description: "Up to 2 months (60 days) of fully paid leave for recovery after surgery due to gynecological disorders." },
  { code: "VAWC", name: "VAWC Leave", category: "special", description: "Up to 10 days of paid leave for female employees who are victims of violence against women and children, used to attend to medical and legal matters." },
  { code: "SLP", name: "Special Leave Privileges (SLP)", category: "regular", description: "3 days per year for personal milestones (birthdays, anniversaries, graduations) or domestic emergencies. Non-cumulative." },
  { code: "WL", name: "Wellness Leave", category: "special", description: "Up to 5 days per year specifically for mental health, physical wellness, and medical checkups (separate from standard VL/SL)." },
  { code: "SEL", name: "Special Emergency Leave (SEL)", category: "special", description: "Up to 5 days of paid leave if you are directly affected by a natural disaster or calamity (typhoon, flood, earthquake) when your area is declared under a State of Calamity." },
  { code: "RL", name: "Rehabilitation Leave", category: "special", description: "Up to 6 months of paid leave for employees who sustain injuries or wounds while performing their official duties." },
  { code: "STL", name: "Study Leave", category: "special", description: "Up to 6 months of paid leave for qualified employees to prepare for board/bar exams or complete a master’s or doctorate thesis." },
  { code: "CTO", name: "Compensatory Time-Off (CTO) for COS", category: "cos", description: "Compensatory time-off privileges for Contract of Service (COS) employees in lieu of overtime pay." },
  { code: "Wellness Leave - COS", name: "Wellness Leave for COS", category: "cos", description: "Wellness leave privileges allocated specifically for Contract of Service (COS) employees." },
]

export const LEAVE_NAMES_MAP: Record<string, string> = {
  vl: "Vacation Leave",
  fl: "Forced / Mandatory Leave",
  sl: "Sick Leave",
  ml: "Maternity Leave",
  pl: "Paternity Leave",
  spl: "Solo Parent Leave",
  mc: "Special Leave Benefits for Women (Magna Carta)",
  vawc: "VAWC Leave",
  slp: "Special Leave Privileges",
  wl: "Wellness Leave",
  sel: "Special Emergency Leave",
  rl: "Rehabilitation Leave",
  stl: "Study Leave",
  cto: "Compensatory Time-Off",
  "cto-am": "Half Day CTO (AM)",
  "cto-pm": "Half Day CTO (PM)",
  wlcos: "Wellness Leave - COS",
}
