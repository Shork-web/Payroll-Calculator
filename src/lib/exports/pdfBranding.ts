import type { PayrollResult } from "@/features/payroll/types/payroll"
import { computationTypeLabel } from "@/features/payroll/lib/computationTypeLabels"
import { PHILFIDA_GREEN, scaleMm, type PdfDoc } from "@/lib/exports/pdfShared"

export { PHILFIDA_GREEN }

export const PHILFIDA_ORANGE: [number, number, number] = [237, 125, 49]
export const PHILFIDA_HEADER_BG: [number, number, number] = [12, 18, 16]
export const PHILFIDA_SLATE: [number, number, number] = [100, 116, 139]
export const PHILFIDA_LIGHT: [number, number, number] = [248, 250, 252]
export const PHILFIDA_NAVY: [number, number, number] = [30, 41, 59]
export const PHILFIDA_BLUE: [number, number, number] = [37, 99, 235]
export const PHILFIDA_MUTED: [number, number, number] = [241, 245, 249]

export interface MetadataField {
  label: string
  value: string
}

export interface OfficialHeaderOptions {
  documentTitle: string
  documentSubtitle?: string
  metadata?: MetadataField[]
}

/** Letterhead: logo pinned left, agency text centered on page. */
export function drawOfficialPhilfidaHeader(
  doc: PdfDoc,
  logoUrl: string,
  pageW: number,
  pageMargin: number,
  startY: number,
  options: OfficialHeaderOptions,
  scale = 1,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const contentW = pageW - pageMargin * 2
  const rm = pageW - pageMargin
  const centerX = pageW / 2
  const headerY = startY

  const logoH = s(compact ? 16 : 22)
  const logoW = Math.min(logoH * logoAspectRatio, s(48))
  doc.addImage(logoUrl, "PNG", pageMargin, headerY, logoW, logoH)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(10))
  const textMaxW = contentW - logoW - s(6)
  const agencyLines = wrapAgencyName(
    doc,
    "PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY",
    textMaxW,
  )
  const textBlockH = s(3.5) + agencyLines.length * s(3.5) + s(4) + s(3.5)
  let textY = headerY + Math.max(s(1), (logoH - textBlockH) / 2) + s(2)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(s(7.5))
  doc.setTextColor(...PHILFIDA_SLATE)
  doc.text("REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF AGRICULTURE", centerX, textY, {
    align: "center",
    maxWidth: textMaxW,
  })

  textY += s(3.5)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(10))
  doc.setTextColor(...PHILFIDA_GREEN)
  agencyLines.forEach((line) => {
    doc.text(line, centerX, textY, { align: "center" })
    textY += s(3.5)
  })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(8.5))
  doc.setTextColor(15, 23, 42)
  doc.text("Contract of Service Payroll Operations", centerX, textY + s(0.5), { align: "center" })

  textY += s(4)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(s(7.5))
  doc.setTextColor(...PHILFIDA_SLATE)
  doc.text("Official Payroll Computation & Certification", centerX, textY, { align: "center" })

  let y = headerY + logoH + s(compact ? 2.5 : 4)

  doc.setDrawColor(...PHILFIDA_GREEN)
  doc.setLineWidth(s(0.45))
  doc.line(pageMargin, y, rm, y)

  y += s(compact ? 3.5 : 5)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(compact ? 11 : 13.5))
  doc.setTextColor(15, 23, 42)
  doc.text(options.documentTitle, centerX, y, { align: "center", maxWidth: contentW })

  if (options.documentSubtitle) {
    y += s(compact ? 3 : 4)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 8 : 9))
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(options.documentSubtitle, centerX, y, { align: "center", maxWidth: contentW })
  }

  y += s(compact ? 3 : 5)

  const metadata = options.metadata ?? []
  if (metadata.length === 0) {
    return y
  }

  const metaH = s(8.5)
  doc.setFillColor(...PHILFIDA_MUTED)
  doc.rect(pageMargin, y, contentW, metaH, "F")
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.rect(pageMargin, y, contentW, metaH)

  const metaCols = metadata.length
  const colW = contentW / metaCols
  metadata.forEach((field, i) => {
    const cx = pageMargin + colW * i + colW / 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(field.label.toUpperCase(), cx, y + 3, { align: "center" })
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.text(field.value, cx, y + 6.5, { align: "center" })
    if (i > 0) {
      doc.setDrawColor(226, 232, 240)
      doc.line(pageMargin + colW * i, y, pageMargin + colW * i, y + metaH)
    }
  })

  return y + metaH + s(5)
}

function wrapAgencyName(doc: PdfDoc, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

function drawTextLines(
  doc: PdfDoc,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): void {
  lines.forEach((line, i) => {
    doc.text(line, x, y + i * lineHeight)
  })
}

export function drawOfficialSectionHeader(
  doc: PdfDoc,
  pageMargin: number,
  y: number,
  title: string,
  scale = 1,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const barH = s(compact ? 4 : 5)
  const headerH = s(compact ? 5.5 : 6.5)

  doc.setFillColor(...PHILFIDA_GREEN)
  doc.rect(pageMargin, y, s(2.5), barH, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(compact ? 8 : 9.5))
  doc.setTextColor(15, 23, 42)
  doc.text(title, pageMargin + s(5), y + barH * 0.72)

  return y + headerH
}

export function drawProfilePanel(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  employeeName: string,
  fields: Array<{ label: string; value: string }>,
  scale = 1,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const cols = 3
  const colW = contentW / cols
  const cellPad = s(compact ? 3 : 4)
  const cellMaxW = colW - cellPad * 2
  const labelLineH = s(compact ? 3 : 3.5)
  const valueLineH = s(compact ? 3.2 : 3.8)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(compact ? 9.5 : 11))
  const nameLines = doc.splitTextToSize(employeeName.toUpperCase(), contentW - cellPad * 2)
  const nameBlockH = s(5) + nameLines.length * valueLineH

  const rowCount = Math.ceil(fields.length / cols)
  const rowHeights: number[] = []
  for (let row = 0; row < rowCount; row++) {
    let maxH = s(8)
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      if (idx >= fields.length) break
      const field = fields[idx]
      if (!field) break
      doc.setFont("helvetica", "bold")
      doc.setFontSize(s(8.5))
      const valueLines = doc.splitTextToSize(field.value, cellMaxW)
      maxH = Math.max(maxH, labelLineH + valueLines.length * valueLineH + s(1))
    }
    rowHeights.push(maxH)
  }

  const panelH = s(compact ? 3 : 5) + nameBlockH + s(compact ? 2 : 3) + rowHeights.reduce((sum, h) => sum + h, 0) + s(compact ? 2 : 3)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.3))
  doc.rect(pageMargin, y, contentW, panelH)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(s(7))
  doc.setTextColor(...PHILFIDA_SLATE)
  doc.text("EMPLOYEE NAME", pageMargin + cellPad, y + s(4.5))

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(11))
  doc.setTextColor(15, 23, 42)
  drawTextLines(doc, nameLines, pageMargin + cellPad, y + s(8.5), valueLineH)

  const dividerY = y + s(5) + nameBlockH + s(1)
  doc.setDrawColor(203, 213, 225)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(pageMargin + cellPad, dividerY, pageMargin + contentW - cellPad, dividerY)
  doc.setLineDashPattern([], 0)

  const gridY = dividerY + s(3)
  fields.forEach((field, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const fx = pageMargin + col * colW + cellPad
    const fy = gridY + rowHeights.slice(0, row).reduce((sum, h) => sum + h, 0)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(6.5))
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(field.label.toUpperCase(), fx, fy)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(8.5))
    doc.setTextColor(15, 23, 42)
    const valueLines = doc.splitTextToSize(field.value, cellMaxW)
    drawTextLines(doc, valueLines, fx, fy + labelLineH, valueLineH)
  })

  return y + panelH + s(compact ? 2 : 4)
}

export function drawMetricCards(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  cards: Array<{ label: string; value: string; accent?: "green" | "default" }>,
  scale = 1,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const gap = s(compact ? 2 : 3)
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length
  const cardH = s(compact ? 10 : 15)

  cards.forEach((card, i) => {
    const cx = pageMargin + i * (cardW + gap)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(s(0.25))
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(cx, y, cardW, cardH, s(1), s(1), "FD")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 6 : 7))
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(card.label.toUpperCase(), cx + cardW / 2, y + s(compact ? 3.5 : 4.5), { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(compact ? 8.5 : 10.5))
    if (card.accent === "green") {
      doc.setTextColor(...PHILFIDA_GREEN)
    } else {
      doc.setTextColor(15, 23, 42)
    }
    const valueLines = doc.splitTextToSize(card.value, cardW - s(4))
    const valueBlockH = valueLines.length * s(3.8)
    const valueY = y + s(compact ? 7 : 10) + Math.max(0, (s(compact ? 3 : 5) - valueBlockH) / 2)
    valueLines.forEach((line: string, li: number) => {
      doc.text(line, cx + cardW / 2, valueY + li * s(3.8), { align: "center" })
    })
  })

  return y + cardH + s(compact ? 4 : 5)
}

export interface PdfPageBreakContext {
  maxContentY: number
  topMargin: number
  onNewPage: () => void
}

export type TableRowType = "earning" | "deduction" | "total" | "neutral" | "section"

export interface OfficialTableRow {
  index: string
  description: string
  category: string
  amount: string
  rowType?: TableRowType
  isBold?: boolean
}

export interface DrawOfficialTableOptions {
  useBlackText?: boolean
  compact?: boolean
  /** Extra height (mm at baseline scale) added to each table row to fill the page. */
  rowStretch?: number
}

export function drawOfficialTable(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  title: string,
  rows: OfficialTableRow[],
  scale = 1,
  pageBreak?: PdfPageBreakContext,
  options: DrawOfficialTableOptions = {},
): number {
  const { useBlackText = false, compact = false, rowStretch = 0 } = options
  const blackText: [number, number, number] = [15, 23, 42]
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, title, scale, compact)

  const rm = pageMargin + contentW
  const colIndexW = s(compact ? 7 : 10)
  const amountColW = s(compact ? 26 : 34)
  const typeColW = s(compact ? 20 : 28)
  const colDescW = contentW - colIndexW - typeColW - amountColW - s(compact ? 4 : 6)
  const colDescX = pageMargin + colIndexW + s(2)
  const colTypeX = pageMargin + colIndexW + colDescW + s(compact ? 2 : 4)
  const colIndexCenterX = pageMargin + colIndexW / 2
  const headerH = s(compact ? 5 : 7)
  const minRowH = s(compact ? 4 : 6.5)
  const descMaxW = colDescW - s(2)
  const typeMaxW = typeColW - s(2)
  let segmentTopY = y

  const drawTableHeader = () => {
    doc.setFillColor(...PHILFIDA_NAVY)
    doc.rect(pageMargin, y, contentW, headerH, "F")

    const headers = ["#", "DESCRIPTION", "TYPE", "AMOUNT (PHP)"]
    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(compact ? 7 : 8.5))
    doc.setTextColor(255, 255, 255)
    headers.forEach((h, i) => {
      if (i === headers.length - 1) {
        doc.text(h, rm - s(3), y + s(compact ? 3.5 : 5.2), { align: "right" })
      } else if (i === 0) {
        doc.text(h, colIndexCenterX, y + s(compact ? 3.5 : 5.2), { align: "center" })
      } else if (i === 1) {
        doc.text(h, colDescX, y + s(compact ? 3.5 : 5.2))
      } else {
        doc.text(h, colTypeX, y + s(compact ? 3.5 : 5.2))
      }
    })

    y += headerH
  }

  drawTableHeader()

  rows.forEach((row, rowIndex) => {
    const isSection = row.rowType === "section"
    const isTotal = row.rowType === "total"
    doc.setFont("helvetica", row.isBold || isTotal || isSection ? "bold" : "normal")
    doc.setFontSize(
      isTotal ? s(compact ? 8 : 10)
        : isSection ? s(compact ? 6.5 : 8)
          : s(compact ? 7 : 9),
    )
    const descLines = doc.splitTextToSize(row.description, isSection ? contentW - s(8) : descMaxW)
    const typeLines = isSection ? [] : doc.splitTextToSize(row.category, typeMaxW)
    const textLineH = s(compact ? 3 : 4)
    const textBlockH = Math.max(descLines.length, typeLines.length || 1) * textLineH
    const thisRowH = (isSection
      ? s(compact ? 3.5 : 6)
      : Math.max(minRowH, s(compact ? 2 : 3) + textBlockH)) + scaleMm(rowStretch, scale)

    if (pageBreak && y + thisRowH > pageBreak.maxContentY) {
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(s(0.35))
      doc.rect(pageMargin, segmentTopY, contentW, y - segmentTopY)

      pageBreak.onNewPage()
      y = pageBreak.topMargin
      segmentTopY = y
      drawTableHeader()
    }

    const isShaded = !isSection && !isTotal && rowIndex % 2 === 0

    if (isSection) {
      doc.setFillColor(241, 245, 249)
      doc.rect(pageMargin, y, contentW, thisRowH, "F")
    } else if (isTotal) {
      doc.setFillColor(...PHILFIDA_MUTED)
      doc.rect(pageMargin, y, contentW, thisRowH, "F")
    } else if (isShaded) {
      doc.setFillColor(252, 252, 253)
      doc.rect(pageMargin, y, contentW, thisRowH, "F")
    }

    const textY = y + (rowStretch > 0 && !isSection
      ? Math.max(s(compact ? 3 : 4), (thisRowH - textBlockH) / 2)
      : s(isSection ? (compact ? 2.6 : 3.8) : (compact ? 3 : 4)))
    doc.setFont("helvetica", row.isBold || isTotal || isSection ? "bold" : "normal")
    doc.setFontSize(
      isTotal ? s(compact ? 8 : 10)
        : isSection ? s(compact ? 6.5 : 8)
          : s(compact ? 7 : 9),
    )

    if (isSection) {
      doc.setTextColor(71, 85, 105)
      drawTextLines(doc, descLines, colDescX, textY, textLineH)
    } else {
      doc.setTextColor(15, 23, 42)
      if (row.index) {
        doc.text(row.index, colIndexCenterX, textY, { align: "center" })
      }
      drawTextLines(doc, descLines, colDescX, textY, textLineH)

      const typeColor: [number, number, number] = useBlackText
        ? blackText
        : row.rowType === "earning"
          ? PHILFIDA_BLUE
          : row.rowType === "deduction"
            ? PHILFIDA_ORANGE
            : row.rowType === "total"
              ? PHILFIDA_GREEN
              : PHILFIDA_SLATE
      doc.setTextColor(...typeColor)
      drawTextLines(doc, typeLines, colTypeX, textY, textLineH)

      doc.setFont("helvetica", row.isBold || isTotal ? "bold" : "normal")
      doc.setTextColor(...typeColor)
      doc.text(row.amount, rm - s(3), textY, { align: "right" })
    }

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(s(0.2))
    doc.line(pageMargin, y + thisRowH, rm, y + thisRowH)

    y += thisRowH
  })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.35))
  doc.rect(pageMargin, segmentTopY, contentW, y - segmentTopY)

  return y + s(compact ? 2 : 4)
}

export function drawOfficialSignatories(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  blocks: Array<{ label: string; name: string; title: string }>,
  scale = 1,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, "OFFICIAL SIGNATORIES & CERTIFICATION", scale, compact)
  y += s(compact ? 3 : 4)

  const blockW = contentW / blocks.length
  const labelLineH = s(compact ? 3.8 : 4)
  const gapLabelToLine = s(compact ? 5 : 6)
  const gapLineToName = s(compact ? 5 : 6)
  const nameLineH = s(compact ? 3.6 : 4)
  const gapNameToTitle = s(compact ? 2.5 : 3.5)
  const titleLineH = s(compact ? 3.4 : 3.8)
  let maxBlockH = 0

  blocks.forEach((block, i) => {
    const bx = pageMargin + i * blockW + s(4)
    const lineW = Math.min(blockW - s(10), s(72))
    const textMaxW = blockW - s(8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 7.5 : 8.5))
    doc.setTextColor(...PHILFIDA_SLATE)
    const labelLines = doc.splitTextToSize(block.label, textMaxW)
    drawTextLines(doc, labelLines, bx, y, labelLineH)

    const labelOffset = labelLines.length * labelLineH
    const lineY = y + labelOffset + gapLabelToLine
    doc.setDrawColor(15, 23, 42)
    doc.setLineWidth(s(0.35))
    doc.line(bx, lineY, bx + lineW, lineY)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(compact ? 8.5 : 9.5))
    doc.setTextColor(15, 23, 42)
    const nameLines = doc.splitTextToSize(block.name.toUpperCase(), textMaxW)
    const nameY = lineY + gapLineToName
    drawTextLines(doc, nameLines, bx, nameY, nameLineH)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 7.5 : 8.5))
    doc.setTextColor(...PHILFIDA_SLATE)
    const titleLines = doc.splitTextToSize(block.title, textMaxW)
    const titleY = nameY + nameLines.length * nameLineH + gapNameToTitle
    drawTextLines(doc, titleLines, bx, titleY, titleLineH)

    const blockH = titleY + titleLines.length * titleLineH - y
    maxBlockH = Math.max(maxBlockH, blockH)
  })

  return y + maxBlockH + s(compact ? 6 : 10)
}

export function drawOfficialFooter(
  doc: PdfDoc,
  pageW: number,
  pageMargin: number,
  contentW: number,
  y: number,
  note?: string,
  issuedDate?: string,
  scale = 1,
  disclaimer = "This computation certifies Contract of Service compensation for the pay period stated above, including base pay, the 20% premium, attendance adjustments, and applicable deductions. It is prepared for payroll processing, official certification, and employee conforme.",
  compact = false,
): void {
  const s = (v: number) => scaleMm(v, scale)
  const rm = pageMargin + contentW
  const lineH = s(compact ? 3.5 : 4)

  y += s(compact ? 4 : 5)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(s(0.3))
  doc.line(pageMargin, y, rm, y)

  y += s(compact ? 5 : 6)
  if (issuedDate) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 7.5 : 8.5))
    doc.setTextColor(15, 23, 42)
    doc.text(`Date Issued: ${issuedDate}`, rm, y, { align: "right" })
    y += s(compact ? 5 : 6)
  }

  doc.setFont("helvetica", "italic")
  doc.setFontSize(s(compact ? 7 : 8))
  doc.setTextColor(...PHILFIDA_SLATE)

  if (note) {
    const noteLines = doc.splitTextToSize(note, contentW)
    noteLines.forEach((line: string) => {
      doc.text(line, pageW / 2, y, { align: "center" })
      y += lineH
    })
    y += s(compact ? 3 : 4)
  }

  const lines = doc.splitTextToSize(disclaimer, contentW)
  lines.forEach((line: string) => {
    doc.text(line, pageW / 2, y, { align: "center" })
    y += lineH
  })
}

const DEFAULT_COMPUTATION_FOOTER_DISCLAIMER =
  "This computation certifies Contract of Service compensation for the pay period stated above, including base pay, the 20% premium, attendance adjustments, and applicable deductions. It is prepared for payroll processing, official certification, and employee conforme."

function tableLayoutMetrics(contentW: number, scale: number, compact: boolean) {
  const s = (v: number) => scaleMm(v, scale)
  const colIndexW = s(compact ? 7 : 10)
  const amountColW = s(compact ? 26 : 34)
  const typeColW = s(compact ? 20 : 28)
  const colDescW = contentW - colIndexW - typeColW - amountColW - s(compact ? 4 : 6)
  return {
    s,
    descMaxW: colDescW - s(2),
    typeMaxW: typeColW - s(2),
    headerH: s(compact ? 5 : 7),
    minRowH: s(compact ? 4 : 6.5),
    textLineH: s(compact ? 3 : 4),
    sectionRowH: s(compact ? 3.5 : 6),
    padRow: s(compact ? 2 : 3),
  }
}

function measureTableRowHeight(
  doc: PdfDoc,
  row: OfficialTableRow,
  contentW: number,
  scale: number,
  compact: boolean,
  rowStretch = 0,
): number {
  const { s, descMaxW, typeMaxW, minRowH, textLineH, sectionRowH, padRow } = tableLayoutMetrics(contentW, scale, compact)
  const isSection = row.rowType === "section"
  doc.setFont("helvetica", row.isBold || row.rowType === "total" || isSection ? "bold" : "normal")
  doc.setFontSize(
    row.rowType === "total" ? s(compact ? 8 : 10)
      : isSection ? s(compact ? 6.5 : 8)
        : s(compact ? 7 : 9),
  )
  const descLines = doc.splitTextToSize(row.description, isSection ? contentW - s(8) : descMaxW)
  const typeLines = isSection ? [] : doc.splitTextToSize(row.category, typeMaxW)
  const textBlockH = Math.max(descLines.length, typeLines.length || 1) * textLineH
  const base = isSection ? sectionRowH : Math.max(minRowH, padRow + textBlockH)
  return base + scaleMm(rowStretch, scale)
}

export function estimateOfficialPhilfidaHeaderHeight(scale: number, compact = false): number {
  const s = (v: number) => scaleMm(v, scale)
  const logoH = s(compact ? 16 : 22)
  return logoH + s(compact ? 19 : 26)
}

export function estimateOfficialSectionHeaderHeight(scale: number, compact = false): number {
  const s = (v: number) => scaleMm(v, scale)
  return s(compact ? 5.5 : 6.5)
}

export function estimateProfilePanelHeight(
  doc: PdfDoc,
  contentW: number,
  employeeName: string,
  fields: Array<{ label: string; value: string }>,
  scale: number,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const cols = 3
  const colW = contentW / cols
  const cellPad = s(compact ? 3 : 4)
  const cellMaxW = colW - cellPad * 2
  const labelLineH = s(compact ? 3 : 3.5)
  const valueLineH = s(compact ? 3.2 : 3.8)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(compact ? 9.5 : 11))
  const nameLines = doc.splitTextToSize(employeeName.toUpperCase(), contentW - cellPad * 2)
  const nameBlockH = s(5) + nameLines.length * valueLineH

  const rowCount = Math.ceil(fields.length / cols)
  const rowHeights: number[] = []
  for (let row = 0; row < rowCount; row++) {
    let maxH = s(8)
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      if (idx >= fields.length) break
      const field = fields[idx]
      if (!field) break
      doc.setFont("helvetica", "bold")
      doc.setFontSize(s(8.5))
      const valueLines = doc.splitTextToSize(field.value, cellMaxW)
      maxH = Math.max(maxH, labelLineH + valueLines.length * valueLineH + s(1))
    }
    rowHeights.push(maxH)
  }

  const panelH = s(compact ? 3 : 5) + nameBlockH + s(compact ? 2 : 3)
    + rowHeights.reduce((sum, h) => sum + h, 0) + s(compact ? 2 : 3)
  return panelH + s(compact ? 2 : 4)
}

export function estimateMetricCardsHeight(scale: number, compact = false): number {
  const s = (v: number) => scaleMm(v, scale)
  return s(compact ? 10 : 15) + s(compact ? 4 : 5)
}

export function estimateOfficialTableHeight(
  doc: PdfDoc,
  contentW: number,
  rows: OfficialTableRow[],
  scale: number,
  compact = false,
  rowStretch = 0,
): number {
  const { s, headerH } = tableLayoutMetrics(contentW, scale, compact)
  let height = estimateOfficialSectionHeaderHeight(scale, compact) + headerH
  rows.forEach((row) => {
    height += measureTableRowHeight(doc, row, contentW, scale, compact, rowStretch)
  })
  return height + s(compact ? 2 : 4)
}

export function estimateOfficialSignatoriesHeight(
  doc: PdfDoc,
  contentW: number,
  blocks: Array<{ label: string; name: string; title: string }>,
  scale: number,
  compact = false,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const labelLineH = s(compact ? 3.8 : 4)
  const gapLabelToLine = s(compact ? 5 : 6)
  const gapLineToName = s(compact ? 5 : 6)
  const nameLineH = s(compact ? 3.6 : 4)
  const gapNameToTitle = s(compact ? 2.5 : 3.5)
  const titleLineH = s(compact ? 3.4 : 3.8)
  let maxBlockH = 0
  const blockW = contentW / blocks.length
  blocks.forEach((block) => {
    const textMaxW = blockW - s(8)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 7.5 : 8.5))
    const labelLines = doc.splitTextToSize(block.label, textMaxW)
    const labelOffset = labelLines.length * labelLineH
    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(compact ? 8.5 : 9.5))
    const nameLines = doc.splitTextToSize(block.name.toUpperCase(), textMaxW)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(compact ? 7.5 : 8.5))
    const titleLines = doc.splitTextToSize(block.title, textMaxW)
    const blockH = labelOffset + gapLabelToLine + gapLineToName
      + nameLines.length * nameLineH + gapNameToTitle
      + titleLines.length * titleLineH
    maxBlockH = Math.max(maxBlockH, blockH)
  })
  return estimateOfficialSectionHeaderHeight(scale, compact)
    + s(compact ? 3 : 4)
    + maxBlockH
    + s(compact ? 6 : 10)
}

export function estimateOfficialFooterHeight(
  doc: PdfDoc,
  contentW: number,
  note: string | undefined,
  scale: number,
  compact = false,
  disclaimer = DEFAULT_COMPUTATION_FOOTER_DISCLAIMER,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const lineH = s(compact ? 3.5 : 4)
  let height = s(compact ? 4 : 5) + s(compact ? 5 : 6) + s(compact ? 5 : 6)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(s(compact ? 7 : 8))
  if (note?.trim()) {
    height += doc.splitTextToSize(note, contentW).length * lineH + s(compact ? 3 : 4)
  }
  height += doc.splitTextToSize(disclaimer, contentW).length * lineH
  return height
}

export interface ComputationPageFillLayout {
  scale: number
  rowStretch: number
  signatoriesY: number
  footerY: number
}

/** Sizes computation PDF content to fill one page; table rows expand to use remaining space. */
export function computeComputationPageFillLayout(
  doc: PdfDoc,
  pageH: number,
  margin: number,
  contentW: number,
  baseScale: number,
  tableRows: OfficialTableRow[],
  profileFields: Array<{ label: string; value: string }>,
  employeeName: string,
  signatoryBlocks: Array<{ label: string; name: string; title: string }>,
  footerNote: string | undefined,
  compact = true,
): ComputationPageFillLayout {
  const available = pageH - margin * 2
  let cs = baseScale
  let rowStretch = 0

  const measure = (stretch: number) => {
    const top = estimateOfficialPhilfidaHeaderHeight(cs, compact)
      + estimateOfficialSectionHeaderHeight(cs, compact)
      + estimateProfilePanelHeight(doc, contentW, employeeName, profileFields, cs, compact)
      + estimateMetricCardsHeight(cs, compact)
    const table = estimateOfficialTableHeight(doc, contentW, tableRows, cs, compact, stretch)
    const sig = estimateOfficialSignatoriesHeight(doc, contentW, signatoryBlocks, cs, compact)
    const footer = estimateOfficialFooterHeight(doc, contentW, footerNote, cs, compact)
    return { top, table, sig, footer, total: top + table + sig + footer }
  }

  for (let i = 0; i < 10; i++) {
    const dims = measure(0)
    if (dims.total > available) {
      cs *= 0.94
      continue
    }
    if (dims.total < available * 0.985 && cs < baseScale * 1.15) {
      cs *= 1.03
      continue
    }
    break
  }

  const dims = measure(0)
  const tableBudget = Math.max(0, available - dims.top - dims.sig - dims.footer)
  if (tableRows.length > 0 && dims.table < tableBudget) {
    rowStretch = (tableBudget - dims.table) / (tableRows.length * cs)
  }

  const finalDims = measure(rowStretch)
  const footerY = pageH - margin - finalDims.footer
  const signatoriesY = footerY - finalDims.sig

  return { scale: cs, rowStretch, signatoriesY, footerY }
}

export interface PayslipSplitRow {
  leftLabel?: string
  leftAmount?: string
  leftBold?: boolean
  rightLabel?: string
  rightAmount?: string
  rightBold?: boolean
  rightDetail?: string
}

/** Classic side-by-side earnings / deductions table with official PhilFIDA styling. */
export function drawPayslipSplitTable(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  rows: PayslipSplitRow[],
  netPay: string,
  scale = 1,
): number {
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, "PAY ADVICE — EARNINGS & DEDUCTIONS", scale)

  const halfW = contentW / 2
  const midCol = pageMargin + halfW
  const rm = pageMargin + contentW
  const pad = s(3.5)
  const headerH = s(7)
  const dataRowH = s(7)
  const netRowH = s(9)
  const tableTop = y
  const tableH = headerH + dataRowH * rows.length + netRowH

  doc.setDrawColor(...PHILFIDA_GREEN)
  doc.setLineWidth(s(0.45))
  doc.rect(pageMargin, tableTop, contentW, tableH)

  doc.setFillColor(...PHILFIDA_NAVY)
  doc.rect(pageMargin, y, contentW, headerH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(8.5))
  doc.setTextColor(255, 255, 255)
  doc.text("EARNINGS", pageMargin + pad, y + s(5))
  doc.text("DEDUCTIONS", midCol + pad, y + s(5))
  y += headerH

  const leftAmtX = midCol - pad
  const rightAmtX = rm - pad
  const leftLabelX = pageMargin + pad
  const rightLabelX = midCol + pad

  rows.forEach((row, index) => {
    const shaded = index % 2 === 0
    if (shaded) {
      doc.setFillColor(252, 252, 253)
      doc.rect(pageMargin, y, contentW, dataRowH, "F")
    }

    if (row.leftLabel) {
      doc.setFont("helvetica", row.leftBold ? "bold" : "normal")
      doc.setFontSize(row.leftBold ? s(9.5) : s(8.5))
      doc.setTextColor(15, 23, 42)
      doc.text(row.leftLabel, leftLabelX, y + s(4.8))
      if (row.leftAmount) {
        doc.text(row.leftAmount, leftAmtX, y + s(4.8), { align: "right" })
      }
    }

    if (row.rightLabel) {
      doc.setFont("helvetica", row.rightBold ? "bold" : "normal")
      doc.setFontSize(row.rightBold ? s(9.5) : s(8.5))
      doc.setTextColor(15, 23, 42)
      doc.text(row.rightLabel, rightLabelX, y + s(4.8))

      if (row.rightDetail?.trim()) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(s(7))
        doc.setTextColor(...PHILFIDA_SLATE)
        doc.text(row.rightDetail, rightLabelX, y + s(4.8) + s(3))
      }

      if (row.rightAmount !== undefined) {
        doc.setFont("helvetica", row.rightBold ? "bold" : "normal")
        doc.setFontSize(row.rightBold ? s(9.5) : s(8.5))
        if (row.rightBold) {
          doc.setTextColor(...PHILFIDA_GREEN)
        } else {
          doc.setTextColor(15, 23, 42)
        }
        doc.text(row.rightAmount || "—", rightAmtX, y + s(4.8), { align: "right" })
      }
    }

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(s(0.2))
    doc.line(pageMargin, y + dataRowH, rm, y + dataRowH)
    y += dataRowH
  })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.3))
  doc.line(midCol, tableTop + headerH, midCol, tableTop + tableH - netRowH)

  const netY = tableTop + tableH - netRowH
  doc.setFillColor(...PHILFIDA_LIGHT)
  doc.rect(midCol, netY, halfW, netRowH, "F")

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(s(0.2))
  doc.line(pageMargin, netY, rm, netY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(10))
  doc.setTextColor(...PHILFIDA_GREEN)
  doc.text("NET PAY", rightLabelX, netY + s(5.8))
  doc.setFontSize(s(11))
  doc.text(`Php ${netPay}`, rightAmtX, netY + s(5.8), { align: "right" })

  return tableTop + tableH + s(5)
}

export const PAYSLIP_FOOTER_DISCLAIMER =
  "This pay advice reflects Contract of Service compensation for the period indicated and is issued for official record, employee conforme, and payroll certification. It is system-generated; no stamp is required."

let logoDataUrl: string | null = null
let logoAspectRatio = 3.2

/** Logo path served from /public — always use this instead of a webpack import so PDF exports match the file on disk. */
const PHILFIDA_LOGO_URL = "/philfida-logo.png"

/** Max pixel dimension before embedding — PDF only displays ~15–25 mm tall. */
const PDF_LOGO_MAX_PX = 400

function isBackgroundPixel(r: number, g: number, b: number, threshold = 48): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max <= threshold && max - min <= 12
}

function imageHasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 255) < 250) return true
  }
  return false
}

/** Remove only edge-connected dark background; keeps black text/details inside the artwork. */
function removeEdgeConnectedBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    queue.push(y * width + x)
  }

  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }

  while (queue.length > 0) {
    const p = queue.pop()
    if (p === undefined || visited[p]) continue
    visited[p] = 1

    const i = p * 4
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    if (!isBackgroundPixel(r, g, b)) continue

    data[i + 3] = 0

    const x = p % width
    const y = Math.floor(p / width)
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }

  ctx.putImageData(imageData, 0, 0)
}

async function loadLogoImage(): Promise<HTMLImageElement> {
  const response = await fetch(PHILFIDA_LOGO_URL, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to load PhilFIDA logo from /philfida-logo.png")
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Failed to decode PhilFIDA logo"))
      img.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function loadPhilfidaLogo(): Promise<string> {
  if (logoDataUrl) return logoDataUrl

  const img = await loadLogoImage()
  logoAspectRatio = img.naturalWidth / img.naturalHeight

  let targetW = img.naturalWidth
  let targetH = img.naturalHeight
  const maxDim = Math.max(targetW, targetH)
  if (maxDim > PDF_LOGO_MAX_PX) {
    const ratio = PDF_LOGO_MAX_PX / maxDim
    targetW = Math.round(targetW * ratio)
    targetH = Math.round(targetH * ratio)
  }

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  ctx.drawImage(img, 0, 0, targetW, targetH)

  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  if (!imageHasTransparency(sample)) {
    removeEdgeConnectedBackground(ctx, canvas.width, canvas.height)
  }

  logoDataUrl = canvas.toDataURL("image/png")
  return logoDataUrl
}

export function computationModeLabel(computationType: PayrollResult["computationType"]): string {
  return computationTypeLabel(computationType)
}

export interface LetterheadOptions {
  documentTitle: string
  subtitleLines?: string[]
}

/** Draw branded letterhead; returns Y position for body content. */
export function drawPhilfidaLetterhead(
  doc: PdfDoc,
  logoUrl: string,
  pageW: number,
  pageMargin: number,
  startY: number,
  options: LetterheadOptions,
): number {
  const contentW = pageW - pageMargin * 2
  const rm = pageW - pageMargin
  let y = startY

  const logoH = 14
  const logoW = Math.min(logoH * logoAspectRatio, contentW * 0.6)
  const logoX = pageMargin + (contentW - logoW) / 2
  doc.addImage(logoUrl, "PNG", logoX, y, logoW, logoH)

  y += logoH + 4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...PHILFIDA_SLATE)
  doc.text("Republic of the Philippines", pageW / 2, y, { align: "center" })

  y += 4.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...PHILFIDA_GREEN)
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

  y += 3.5
  doc.setDrawColor(...PHILFIDA_GREEN)
  doc.setLineWidth(0.6)
  doc.line(pageMargin, y, rm, y)
  y += 0.6
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, rm, y)

  y += 7
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(options.documentTitle, pageW / 2, y, { align: "center" })

  if (options.subtitleLines?.length) {
    y += 5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...PHILFIDA_SLATE)
    for (const line of options.subtitleLines) {
      doc.text(line, pageW / 2, y, { align: "center" })
      y += 4.5
    }
  }

  return y + 6
}

export function drawSectionHeader(
  doc: PdfDoc,
  pageMargin: number,
  y: number,
  title: string,
): number {
  doc.setFillColor(...PHILFIDA_GREEN)
  doc.rect(pageMargin, y - 3.5, 2.5, 5, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text(title, pageMargin + 5, y)
  return y + 6.5
}

export interface TableRowOptions {
  isBold?: boolean
  isDeduction?: boolean
  shaded?: boolean
  labelIndent?: number
}

export function drawTableRow(
  doc: PdfDoc,
  pageMargin: number,
  amountCol: number,
  rm: number,
  y: number,
  label: string,
  value: string,
  rowIndex: number,
  options: TableRowOptions = {},
): number {
  const { isBold = false, isDeduction = false, shaded, labelIndent = 4 } = options
  const useShade = shaded ?? rowIndex % 2 === 0

  if (useShade) {
    doc.setFillColor(...PHILFIDA_LIGHT)
    doc.rect(pageMargin, y - 4, rm - pageMargin, 6.5, "F")
  }

  doc.setFont("helvetica", isBold ? "bold" : "normal")
  doc.setFontSize(9)
  if (isDeduction) {
    doc.setTextColor(185, 28, 28)
  } else {
    doc.setTextColor(51, 65, 85)
  }
  doc.text(label, pageMargin + labelIndent, y)
  doc.text(value, amountCol, y, { align: "right" })

  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.3)
  doc.line(pageMargin, y + 2.5, rm, y + 2.5)

  return y + 6.5
}

export function drawNetPayBanner(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  amountCol: number,
  y: number,
  netPay: number,
  formatAmount: (v: number) => string,
): number {
  const cardH = 14
  doc.setFillColor(...PHILFIDA_GREEN)
  doc.roundedRect(pageMargin, y, contentW, cardH, 1.5, 1.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255)
  doc.text("NET PAY DUE", pageMargin + 6, y + 9)
  doc.setFontSize(12.5)
  doc.text("Php " + formatAmount(netPay), amountCol, y + 9, { align: "right" })

  return y + cardH + 12
}
