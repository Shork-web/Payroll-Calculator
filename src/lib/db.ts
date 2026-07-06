import { db } from "./firebase"
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  writeBatch,
} from "firebase/firestore"
import type { PayrollEntry, Signatory } from "@/types/payroll"

export interface SavedEmployee {
  id: string
  name: string
  position: string
  monthlyRate: number
  computationType: "semi-monthly" | "daily" | "monthly" | "semi-monthly-no-tax" | "monthly-no-tax"
  workingDays: number
  signatoryName?: string | undefined
  signatoryTitle?: string | undefined
  payslipSignatoryName?: string | undefined
  payslipSignatoryTitle?: string | undefined
  payslipSignatories?: Signatory[] | undefined
}

const checkDb = () => {
  if (!db) {
    throw new Error("Firestore is not initialized. Verify your Firebase credentials.")
  }
}

/**
 * Saves a single payroll entry for a user.
 */
export async function savePayrollEntry(userId: string, entry: PayrollEntry) {
  checkDb()
  const docRef = doc(db!, "users", userId, "entries", entry.id)
  await setDoc(docRef, {
    ...entry,
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}

/**
 * Deletes a single payroll entry for a user.
 */
export async function deletePayrollEntry(userId: string, entryId: string) {
  checkDb()
  const docRef = doc(db!, "users", userId, "entries", entryId)
  await deleteDoc(docRef)
}

/**
 * Fetches all payroll entries for a user.
 */
export async function getUserEntries(userId: string): Promise<PayrollEntry[]> {
  checkDb()
  const colRef = collection(db!, "users", userId, "entries")
  const snapshot = await getDocs(query(colRef))
  const entries: PayrollEntry[] = []
  snapshot.forEach((docSnap) => {
    entries.push(docSnap.data() as PayrollEntry)
  })
  return entries
}

/**
 * Saves the global sheet signatories configuration for a user.
 */
export async function saveUserSignatories(userId: string, signatories: Signatory[]) {
  checkDb()
  const docRef = doc(db!, "users", userId, "settings", "payroll")
  await setDoc(docRef, { signatories }, { merge: true })
}

/**
 * Loads the sheet signatories for a user. Returns null if not configured yet.
 */
export async function getUserSignatories(userId: string): Promise<Signatory[] | null> {
  checkDb()
  const docRef = doc(db!, "users", userId, "settings", "payroll")
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return docSnap.data().signatories as Signatory[]
  }
  return null
}

/**
 * Saves an employee profile for reusable form loading.
 */
export async function saveEmployee(userId: string, employee: SavedEmployee) {
  checkDb()
  const docRef = doc(db!, "users", userId, "employees", employee.id)
  await setDoc(docRef, employee, { merge: true })
}

/**
 * Fetches all saved employee profiles for a user.
 */
export async function getUserEmployees(userId: string): Promise<SavedEmployee[]> {
  checkDb()
  const colRef = collection(db!, "users", userId, "employees")
  const snapshot = await getDocs(colRef)
  const employees: SavedEmployee[] = []
  snapshot.forEach((docSnap) => {
    employees.push(docSnap.data() as SavedEmployee)
  })
  return employees
}

/**
 * Deletes a saved employee profile.
 */
export async function deleteEmployee(userId: string, employeeId: string) {
  checkDb()
  const docRef = doc(db!, "users", userId, "employees", employeeId)
  await deleteDoc(docRef)
}

/**
 * Atomic batch operation to sync/merge guest in-memory entries into a newly logged-in account.
 */
export async function mergeLocalEntries(userId: string, localEntries: PayrollEntry[]) {
  checkDb()
  if (localEntries.length === 0) return
  
  const batch = writeBatch(db!)
  for (const entry of localEntries) {
    const docRef = doc(db!, "users", userId, "entries", entry.id)
    batch.set(docRef, {
      ...entry,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
  }
  await batch.commit()
}

/**
 * Saves a single payroll history entry for a user.
 */
export async function saveHistoryEntry(userId: string, entry: PayrollEntry) {
  checkDb()
  const docRef = doc(db!, "users", userId, "payslipHistory", entry.id)
  await setDoc(docRef, {
    ...entry,
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}

/**
 * Deletes a single payroll history entry for a user.
 */
export async function deleteHistoryEntry(userId: string, entryId: string) {
  checkDb()
  const docRef = doc(db!, "users", userId, "payslipHistory", entryId)
  await deleteDoc(docRef)
}

/**
 * Fetches all payroll history entries for a user.
 */
export async function getUserHistory(userId: string): Promise<PayrollEntry[]> {
  checkDb()
  const colRef = collection(db!, "users", userId, "payslipHistory")
  const snapshot = await getDocs(query(colRef))
  const history: PayrollEntry[] = []
  snapshot.forEach((docSnap) => {
    history.push(docSnap.data() as PayrollEntry)
  })
  return history
}

/**
 * Atomic batch operation to sync/merge guest in-memory history into a newly logged-in account.
 */
export async function mergeLocalHistory(userId: string, localHistory: PayrollEntry[]) {
  checkDb()
  if (localHistory.length === 0) return
  
  const batch = writeBatch(db!)
  for (const entry of localHistory) {
    const docRef = doc(db!, "users", userId, "payslipHistory", entry.id)
    batch.set(docRef, {
      ...entry,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
  }
  await batch.commit()
}
