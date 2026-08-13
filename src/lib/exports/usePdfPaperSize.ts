"use client"

import { useCallback, useEffect, useState } from "react"

import {
  getPdfPaperSize,
  setPdfPaperSize as persistPdfPaperSize,
  type PdfPaperSize,
} from "@/lib/exports/pdfShared"

export function usePdfPaperSize() {
  const [paperSize, setPaperSizeState] = useState<PdfPaperSize>("a4")

  useEffect(() => {
    setPaperSizeState(getPdfPaperSize())

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<PdfPaperSize>).detail
      if (detail === "a4" || detail === "letter" || detail === "legal") {
        setPaperSizeState(detail)
      }
    }

    window.addEventListener("pdf-paper-size-change", onChange)
    return () => window.removeEventListener("pdf-paper-size-change", onChange)
  }, [])

  const setPaperSize = useCallback((size: PdfPaperSize) => {
    persistPdfPaperSize(size)
    setPaperSizeState(size)
  }, [])

  return [paperSize, setPaperSize] as const
}
