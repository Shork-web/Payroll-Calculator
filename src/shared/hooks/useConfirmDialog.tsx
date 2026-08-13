"use client"

import { useCallback, useRef, useState } from "react"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: "error" | "primary" | "warning"
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setOptions(nextOptions)
    })
  }, [])

  const handleClose = useCallback((confirmed: boolean) => {
    setOptions(null)
    resolveRef.current?.(confirmed)
    resolveRef.current = null
  }, [])

  const dialog = options ? (
    <ConfirmDialog
      open
      title={options.title}
      message={options.message}
      {...(options.confirmLabel ? { confirmLabel: options.confirmLabel } : {})}
      {...(options.cancelLabel ? { cancelLabel: options.cancelLabel } : {})}
      {...(options.confirmColor ? { confirmColor: options.confirmColor } : {})}
      onConfirm={() => handleClose(true)}
      onCancel={() => handleClose(false)}
    />
  ) : null

  return { confirm, dialog }
}
