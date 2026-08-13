"use client"

import React, { createContext, useCallback, useContext, useState } from "react"
import { Alert, Snackbar } from "@mui/material"

export type ToastSeverity = "success" | "error" | "info" | "warning"

interface ToastContextType {
  showToast: (message: string, severity?: ToastSeverity) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: ToastSeverity
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  const showToast = useCallback((message: string, severity: ToastSeverity = "info") => {
    setToast({ open: true, message, severity })
  }, [])

  const handleClose = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
