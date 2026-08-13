"use client"

import type { ComponentProps } from "react"
import { DtrCreator } from "@/features/dtr/components/DtrCreator"
import type { SavedEmployee } from "@/lib/db"

type DtrApplyPayload = Parameters<NonNullable<ComponentProps<typeof DtrCreator>["onApplyDtr"]>>[0]

interface DtrTabProps {
  savedEmployees: SavedEmployee[]
  onApplyDtr: (payload: DtrApplyPayload) => void
}

export function DtrTab({ savedEmployees, onApplyDtr }: DtrTabProps) {
  return <DtrCreator savedEmployees={savedEmployees} onApplyDtr={onApplyDtr} />
}
