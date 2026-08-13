import type { PayrollEntry } from "@/features/payroll/types/payroll"
import type { SavedDtr } from "@/features/dtr/types/dtr"
import { STORAGE_KEYS } from "./keys"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const stored = localStorage.getItem(key)
  if (!stored) return fallback
  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadGuestEntries(): PayrollEntry[] {
  return readJson<PayrollEntry[]>(STORAGE_KEYS.payrollEntries, [])
}

export function saveGuestEntries(entries: PayrollEntry[]): void {
  writeJson(STORAGE_KEYS.payrollEntries, entries)
}

export function loadGuestHistory(): PayrollEntry[] {
  return readJson<PayrollEntry[]>(STORAGE_KEYS.payslipHistory, [])
}

export function saveGuestHistory(history: PayrollEntry[]): void {
  writeJson(STORAGE_KEYS.payslipHistory, history)
}

export function clearGuestPayrollData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.payrollEntries)
  localStorage.removeItem(STORAGE_KEYS.payslipHistory)
}

export function loadGuestDtrs(): SavedDtr[] {
  return readJson<SavedDtr[]>(STORAGE_KEYS.dtrs, [])
}

export function saveGuestDtrs(dtrs: SavedDtr[]): void {
  writeJson(STORAGE_KEYS.dtrs, dtrs)
}

export function clearGuestDtrs(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.dtrs)
}
