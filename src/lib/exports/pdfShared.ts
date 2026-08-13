import jsPDF from "jspdf"

import type { EmployeeInfo, PayrollInputs } from "@/features/payroll/types/payroll"

export type PdfDoc = InstanceType<typeof jsPDF>

export const PHILFIDA_GREEN: [number, number, number] = [15, 110, 86]

/** Narrow side margin for official computation PDFs (mm) at A4 baseline. */
export const PDF_NARROW_MARGIN = 8

/** A4 baseline used to scale computation templates onto other paper sizes. */
export const PDF_BASE_WIDTH = 210
export const PDF_BASE_HEIGHT = 297

/** Multiplier applied so body text stays readable when printed. */
export const PDF_FONT_BOOST = 1.1

export type PdfPaperSize = "a4" | "letter" | "legal"

export const PDF_PAPER_SIZE_STORAGE_KEY = "payroll-pdf-paper-size"

export function getPdfPaperSize(): PdfPaperSize {
  if (typeof window === "undefined") return "a4"
  const stored = localStorage.getItem(PDF_PAPER_SIZE_STORAGE_KEY)
  if (stored === "letter" || stored === "legal" || stored === "a4") return stored
  return "a4"
}

export function setPdfPaperSize(size: PdfPaperSize): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PDF_PAPER_SIZE_STORAGE_KEY, size)
  window.dispatchEvent(new CustomEvent("pdf-paper-size-change", { detail: size }))
}

export function resolvePdfPaperFormat(paperSize: PdfPaperSize): string | number[] {
  switch (paperSize) {
    case "letter":
      return "letter"
    case "legal":
      return [215.9, 330.2]
    default:
      return "a4"
  }
}

export function createComputationPdfDoc(paperSize: PdfPaperSize = "a4"): PdfDoc {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: resolvePdfPaperFormat(paperSize),
  })
}

export interface PdfPageLayout {
  pageW: number
  pageH: number
  margin: number
  contentW: number
  /** Unified scale factor for spacing, fonts, and element sizes. */
  scale: number
  /** Top Y offset for content. */
  startY: number
  /** Bottom limit before a page break is required. */
  maxContentY: number
}

/** Layout tuned for print readability; overflow is handled via pagination. */
export function createPdfPageLayout(doc: PdfDoc): PdfPageLayout {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const scaleW = pageW / PDF_BASE_WIDTH
  const margin = PDF_NARROW_MARGIN * scaleW
  const contentW = pageW - margin * 2
  const scale = Math.min(scaleW, 1.08) * PDF_FONT_BOOST

  return {
    pageW,
    pageH,
    margin,
    contentW,
    scale,
    startY: margin,
    maxContentY: pageH - margin,
  }
}

export function scaleMm(value: number, scale: number): number {
  return value * scale
}

export function wrapLines(doc: PdfDoc, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

export function n(v: number): string {
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function buildPayrollExportFilename(
  employee: EmployeeInfo,
  inputs: PayrollInputs,
  suffix: "COMPUTATION" | "PHILFIDA_PAYSLIP",
): string {
  const rawName = employee.name || ""
  let lastName = "EMPLOYEE"
  if (rawName.includes(",")) {
    lastName = (rawName.split(",")[0] || "").trim()
  } else {
    const parts = rawName.trim().split(/\s+/)
    if (parts.length > 0) {
      lastName = parts[parts.length - 1] || "EMPLOYEE"
    }
  }
  const cleanLastName = lastName.replace(/[^a-z0-9_-]/gi, "").toUpperCase()

  const year = inputs.periodStart ? inputs.periodStart.substring(0, 4) : new Date().getFullYear().toString()

  let month = ""
  if (inputs.periodStart) {
    const parts = inputs.periodStart.split("-")
    if (parts.length > 1) {
      const mIdx = parseInt(parts[1] || "", 10) - 1
      const months = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
      ]
      if (mIdx >= 0 && mIdx < 12) {
        month = months[mIdx] || ""
      }
    }
  }
  if (!month) {
    month = new Date().toLocaleString("en-US", { month: "long" }).toUpperCase()
  }

  const endDayParts = inputs.periodEnd ? inputs.periodEnd.split("-") : []
  const endDay = endDayParts.length > 2 ? parseInt(endDayParts[2] || "", 10) : 15
  const cutoff = endDay <= 15 ? "1ST_CUTOFF" : "2ND_CUTOFF"

  return `${cleanLastName}_${suffix}_${month}_${cutoff}_${year}.pdf`
}
