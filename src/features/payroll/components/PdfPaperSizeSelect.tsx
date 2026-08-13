"use client"

import { MenuItem, TextField } from "@mui/material"

import { usePdfPaperSize } from "@/lib/exports/usePdfPaperSize"
import type { PdfPaperSize } from "@/lib/exports/pdfShared"

export interface PdfPaperSizeSelectProps {
  fullWidth?: boolean
  size?: "small" | "medium"
}

export function PdfPaperSizeSelect({ fullWidth = false, size = "small" }: PdfPaperSizeSelectProps) {
  const [paperSize, setPaperSize] = usePdfPaperSize()

  return (
    <TextField
      select
      label="Paper size"
      size={size}
      fullWidth={fullWidth}
      value={paperSize}
      onChange={(e) => setPaperSize(e.target.value as PdfPaperSize)}
      sx={{ minWidth: fullWidth ? undefined : 140 }}
    >
      <MenuItem value="a4">A4</MenuItem>
      <MenuItem value="letter">Letter</MenuItem>
      <MenuItem value="legal">Legal</MenuItem>
    </TextField>
  )
}
