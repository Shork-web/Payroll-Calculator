"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PayrollEntry, Signatory } from "@/features/payroll/types/payroll"
import {
  getUserEntries,
  getUserHistory,
  getUserSignatories,
  mergeLocalEntries,
  mergeLocalHistory,
} from "@/lib/db"
import {
  clearGuestPayrollData,
  loadGuestEntries,
  loadGuestHistory,
  saveGuestEntries,
  saveGuestHistory,
} from "@/shared/lib/storage/guestStorage"
import { useToast } from "@/shared/context/ToastContext"
import type { User } from "firebase/auth"

const DEFAULT_SIGNATORIES: Signatory[] = [
  { label: "Prepared by:", name: "", title: "" },
  { label: "Certified Correct:", name: "", title: "" },
]

interface UsePayrollDataOptions {
  user: User | null
  onEmployeesSync?: () => void
}

export function usePayrollData({ user, onEmployeesSync }: UsePayrollDataOptions) {
  const { showToast } = useToast()
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [historyEntries, setHistoryEntries] = useState<PayrollEntry[]>([])
  const [signatories, setSignatories] = useState<Signatory[]>(DEFAULT_SIGNATORIES)
  const [dbLoading, setDbLoading] = useState(false)

  const entriesRef = useRef(entries)
  const historyEntriesRef = useRef(historyEntries)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    historyEntriesRef.current = historyEntries
  }, [historyEntries])

  // Load guest data on mount
  useEffect(() => {
    setEntries(loadGuestEntries())
    setHistoryEntries(loadGuestHistory())
  }, [])

  // Persist guest data to localStorage
  useEffect(() => {
    if (!user) {
      saveGuestEntries(entries)
    }
  }, [entries, user])

  useEffect(() => {
    if (!user) {
      saveGuestHistory(historyEntries)
    }
  }, [historyEntries, user])

  // Sync with cloud when auth state changes
  useEffect(() => {
    let active = true

    const syncData = async () => {
      if (!user) {
        setEntries(loadGuestEntries())
        setHistoryEntries(loadGuestHistory())
        setSignatories(DEFAULT_SIGNATORIES)
        return
      }

      setDbLoading(true)
      try {
        const localEntries = entriesRef.current
        const localHistory = historyEntriesRef.current
        const hadGuestData = localEntries.length > 0 || localHistory.length > 0

        if (localEntries.length > 0) {
          await mergeLocalEntries(user.uid, localEntries)
        }
        if (localHistory.length > 0) {
          await mergeLocalHistory(user.uid, localHistory)
        }

        if (hadGuestData) {
          clearGuestPayrollData()
        }

        const [cloudEntries, cloudHistory, cloudSignatories] = await Promise.all([
          getUserEntries(user.uid),
          getUserHistory(user.uid),
          getUserSignatories(user.uid),
        ])

        if (!active) return

        setEntries(cloudEntries)
        setHistoryEntries(cloudHistory)
        if (cloudSignatories) {
          setSignatories(cloudSignatories)
        }

        onEmployeesSync?.()

        if (hadGuestData) {
          showToast("Guest data synced to your cloud account.", "success")
        }
      } catch (error) {
        console.error("Error syncing cloud data:", error)
        showToast("Failed to sync cloud data. Check your connection.", "error")
      } finally {
        if (active) setDbLoading(false)
      }
    }

    syncData()

    return () => {
      active = false
    }
  }, [user, onEmployeesSync, showToast])

  const cacheToGuestStorage = useCallback(() => {
    saveGuestEntries(entriesRef.current)
    saveGuestHistory(historyEntriesRef.current)
  }, [])

  return {
    entries,
    setEntries,
    historyEntries,
    setHistoryEntries,
    signatories,
    setSignatories,
    dbLoading,
    setDbLoading,
    cacheToGuestStorage,
  }
}
