"use client"

import { EmployeeRecordsViewer } from "@/features/records/components/EmployeeRecordsViewer"
import type { PayrollEntry } from "@/features/payroll/types/payroll"

interface RecordsTabProps {
  entries: PayrollEntry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function RecordsTab({ entries, onEdit, onDelete }: RecordsTabProps) {
  return <EmployeeRecordsViewer entries={entries} onEdit={onEdit} onDelete={onDelete} />
}
