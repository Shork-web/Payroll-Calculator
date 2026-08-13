import type { PayrollResult } from "@/features/payroll/types/payroll"
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
): number {
  const s = (v: number) => scaleMm(v, scale)
  const contentW = pageW - pageMargin * 2
  const rm = pageW - pageMargin
  const centerX = pageW / 2
  const headerY = startY

  const logoH = s(22)
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

  let y = headerY + logoH + s(4)

  doc.setDrawColor(...PHILFIDA_GREEN)
  doc.setLineWidth(s(0.45))
  doc.line(pageMargin, y, rm, y)

  y += s(5)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(13.5))
  doc.setTextColor(15, 23, 42)
  doc.text(options.documentTitle, centerX, y, { align: "center", maxWidth: contentW })

  if (options.documentSubtitle) {
    y += s(4)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(9))
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(options.documentSubtitle, centerX, y, { align: "center", maxWidth: contentW })
  }

  y += s(5)

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
): number {
  const s = (v: number) => scaleMm(v, scale)
  doc.setFillColor(...PHILFIDA_GREEN)
  doc.rect(pageMargin, y - s(3.5), s(2.5), s(5), "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(9.5))
  doc.setTextColor(15, 23, 42)
  doc.text(title, pageMargin + s(5), y)
  return y + s(6)
}

export function drawProfilePanel(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  employeeName: string,
  fields: Array<{ label: string; value: string }>,
  scale = 1,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const cols = 3
  const colW = contentW / cols
  const cellPad = s(4)
  const cellMaxW = colW - cellPad * 2
  const labelLineH = s(3.5)
  const valueLineH = s(3.8)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(11))
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

  const panelH = s(5) + nameBlockH + s(3) + rowHeights.reduce((sum, h) => sum + h, 0) + s(3)
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

  return y + panelH + s(4)
}

export function drawMetricCards(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  cards: Array<{ label: string; value: string; accent?: "green" | "default" }>,
  scale = 1,
): number {
  const s = (v: number) => scaleMm(v, scale)
  const gap = s(3)
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length
  const cardH = s(15)

  cards.forEach((card, i) => {
    const cx = pageMargin + i * (cardW + gap)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(s(0.25))
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(cx, y, cardW, cardH, s(1), s(1), "FD")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(7))
    doc.setTextColor(...PHILFIDA_SLATE)
    doc.text(card.label.toUpperCase(), cx + cardW / 2, y + s(4.5), { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(10.5))
    if (card.accent === "green") {
      doc.setTextColor(...PHILFIDA_GREEN)
    } else {
      doc.setTextColor(15, 23, 42)
    }
    const valueLines = doc.splitTextToSize(card.value, cardW - s(4))
    const valueBlockH = valueLines.length * s(3.8)
    const valueY = y + s(10) + Math.max(0, (s(5) - valueBlockH) / 2)
    valueLines.forEach((line: string, li: number) => {
      doc.text(line, cx + cardW / 2, valueY + li * s(3.8), { align: "center" })
    })
  })

  return y + cardH + s(5)
}

export interface PdfPageBreakContext {
  maxContentY: number
  topMargin: number
  onNewPage: () => void
}

export type TableRowType = "earning" | "deduction" | "total" | "neutral"

export interface OfficialTableRow {
  index: string
  description: string
  category: string
  amount: string
  rowType?: TableRowType
  isBold?: boolean
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
): number {
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, title, scale)

  const rm = pageMargin + contentW
  const colIndexW = s(10)
  const amountColW = s(34)
  const typeColW = s(28)
  const colDescW = contentW - colIndexW - typeColW - amountColW - s(6)
  const colDescX = pageMargin + colIndexW + s(2)
  const colTypeX = pageMargin + colIndexW + colDescW + s(4)
  const colIndexCenterX = pageMargin + colIndexW / 2
  const headerH = s(7)
  const minRowH = s(6.5)
  const descMaxW = colDescW - s(2)
  const typeMaxW = typeColW - s(2)
  let segmentTopY = y

  const drawTableHeader = () => {
    doc.setFillColor(...PHILFIDA_NAVY)
    doc.rect(pageMargin, y, contentW, headerH, "F")

    const headers = ["#", "DESCRIPTION", "TYPE", "AMOUNT (PHP)"]
    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(8.5))
    doc.setTextColor(255, 255, 255)
    headers.forEach((h, i) => {
      if (i === headers.length - 1) {
        doc.text(h, rm - s(3), y + s(5.2), { align: "right" })
      } else if (i === 0) {
        doc.text(h, colIndexCenterX, y + s(5.2), { align: "center" })
      } else if (i === 1) {
        doc.text(h, colDescX, y + s(5.2))
      } else {
        doc.text(h, colTypeX, y + s(5.2))
      }
    })

    y += headerH
  }

  drawTableHeader()

  rows.forEach((row, rowIndex) => {
    doc.setFont("helvetica", row.isBold || row.rowType === "total" ? "bold" : "normal")
    doc.setFontSize(row.rowType === "total" ? s(10) : s(9))
    const descLines = doc.splitTextToSize(row.description, descMaxW)
    const typeLines = doc.splitTextToSize(row.category, typeMaxW)
    const textLineH = s(4)
    const textBlockH = Math.max(descLines.length, typeLines.length) * textLineH
    const thisRowH = Math.max(minRowH, s(3) + textBlockH)

    if (pageBreak && y + thisRowH > pageBreak.maxContentY) {
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(s(0.35))
      doc.rect(pageMargin, segmentTopY, contentW, y - segmentTopY)

      pageBreak.onNewPage()
      y = pageBreak.topMargin
      segmentTopY = y
      drawTableHeader()
    }

    const isTotal = row.rowType === "total"
    const isShaded = rowIndex % 2 === 0 && !isTotal

    if (isTotal) {
      doc.setFillColor(...PHILFIDA_MUTED)
      doc.rect(pageMargin, y, contentW, thisRowH, "F")
    } else if (isShaded) {
      doc.setFillColor(252, 252, 253)
      doc.rect(pageMargin, y, contentW, thisRowH, "F")
    }

    const textY = y + s(4)
    doc.setFont("helvetica", row.isBold || isTotal ? "bold" : "normal")
    doc.setFontSize(isTotal ? s(10) : s(9))
    doc.setTextColor(15, 23, 42)
    doc.text(row.index, colIndexCenterX, textY, { align: "center" })
    drawTextLines(doc, descLines, colDescX, textY, textLineH)

    const typeColor = row.rowType === "earning"
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

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(s(0.2))
    doc.line(pageMargin, y + thisRowH, rm, y + thisRowH)

    y += thisRowH
  })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.35))
  doc.rect(pageMargin, segmentTopY, contentW, y - segmentTopY)

  return y + s(4)
}

export function drawOfficialSignatories(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  blocks: Array<{ label: string; name: string; title: string }>,
  scale = 1,
): number {
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, "OFFICIAL SIGNATORIES & CERTIFICATION", scale)

  const blockW = contentW / blocks.length
  blocks.forEach((block, i) => {
    const bx = pageMargin + i * blockW + s(4)
    const lineW = Math.min(blockW - s(10), s(72))
    const textMaxW = blockW - s(8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(8.5))
    doc.setTextColor(...PHILFIDA_SLATE)
    const labelLines = doc.splitTextToSize(block.label, textMaxW)
    drawTextLines(doc, labelLines, bx, y, s(3.5))

    const labelOffset = labelLines.length * s(3.5)
    doc.setDrawColor(15, 23, 42)
    doc.setLineWidth(s(0.35))
    doc.line(bx, y + labelOffset + s(4), bx + lineW, y + labelOffset + s(4))

    doc.setFont("helvetica", "bold")
    doc.setFontSize(s(9.5))
    doc.setTextColor(15, 23, 42)
    const nameLines = doc.splitTextToSize(block.name.toUpperCase(), textMaxW)
    drawTextLines(doc, nameLines, bx, y + labelOffset + s(8), s(3.8))

    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(8.5))
    doc.setTextColor(...PHILFIDA_SLATE)
    const titleLines = doc.splitTextToSize(block.title, textMaxW)
    drawTextLines(doc, titleLines, bx, y + labelOffset + s(8) + nameLines.length * s(3.8) + s(1), s(3.5))
  })

  return y + s(28)
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
): void {
  const s = (v: number) => scaleMm(v, scale)
  const rm = pageMargin + contentW
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(s(0.3))
  doc.line(pageMargin, y, rm, y)

  y += s(5)
  if (issuedDate) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(s(8.5))
    doc.setTextColor(15, 23, 42)
    doc.text(`Date Issued: ${issuedDate}`, rm, y, { align: "right" })
    y += s(4.5)
  }

  doc.setFont("helvetica", "italic")
  doc.setFontSize(s(8))
  doc.setTextColor(...PHILFIDA_SLATE)

  if (note) {
    const noteLines = doc.splitTextToSize(note, contentW)
    noteLines.forEach((line: string) => {
      doc.text(line, pageW / 2, y, { align: "center" })
      y += s(3.5)
    })
    y += s(1.5)
  }

  const lines = doc.splitTextToSize(disclaimer, contentW)
  lines.forEach((line: string) => {
    doc.text(line, pageW / 2, y, { align: "center" })
    y += s(3.5)
  })
}

export interface PayslipLineItem {
  label: string
  amount: string
  detail?: string
  emphasis?: "normal" | "bold" | "subtotal"
}

/** Two-column earnings / deductions ledger for official payslips. */
export function drawPayslipLedger(
  doc: PdfDoc,
  pageMargin: number,
  contentW: number,
  y: number,
  earnings: PayslipLineItem[],
  deductions: PayslipLineItem[],
  netPay: string,
  scale = 1,
): number {
  const s = (v: number) => scaleMm(v, scale)
  y = drawOfficialSectionHeader(doc, pageMargin, y, "PAY ADVICE — EARNINGS & DEDUCTIONS", scale)

  const halfW = contentW / 2
  const leftX = pageMargin
  const rightX = pageMargin + halfW
  const pad = s(3.5)
  const headerH = s(7)
  const minRowH = s(7)
  const labelMaxW = halfW - pad * 2 - s(30)
  const tableTop = y

  doc.setFillColor(...PHILFIDA_NAVY)
  doc.rect(leftX, y, halfW, headerH, "F")
  doc.rect(rightX, y, halfW, headerH, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(8.5))
  doc.setTextColor(255, 255, 255)
  doc.text("EARNINGS (PHP)", leftX + halfW / 2, y + s(5.2), { align: "center" })
  doc.text("DEDUCTIONS (PHP)", rightX + halfW / 2, y + s(5.2), { align: "center" })
  y += headerH

  const measureSide = (items: PayslipLineItem[]): number[] => {
    return items.map((item) => {
      const emphasis = item.emphasis ?? "normal"
      doc.setFont("helvetica", emphasis === "bold" || emphasis === "subtotal" ? "bold" : "normal")
      doc.setFontSize(emphasis === "subtotal" ? s(9.5) : s(8.5))
      const labelLines = doc.splitTextToSize(item.label, labelMaxW)
      let h = labelLines.length * s(3.6) + s(2)
      if (item.detail?.trim()) {
        doc.setFontSize(s(7))
        h += doc.splitTextToSize(item.detail, labelMaxW).length * s(3.2) + s(0.5)
      }
      return Math.max(minRowH, h)
    })
  }

  const leftHeights = measureSide(earnings)
  const rightHeights = measureSide(deductions)
  const rowCount = Math.max(earnings.length, deductions.length, 1)

  const drawSideItem = (
    item: PayslipLineItem | undefined,
    x: number,
    rowY: number,
    rowH: number,
    amtX: number,
    shaded: boolean,
  ) => {
    if (!item) {
      if (shaded) {
        doc.setFillColor(252, 252, 253)
        doc.rect(x, rowY, halfW, rowH, "F")
      }
      return
    }

    const emphasis = item.emphasis ?? "normal"
    if (emphasis === "subtotal") {
      doc.setFillColor(...PHILFIDA_MUTED)
      doc.rect(x, rowY, halfW, rowH, "F")
    } else if (shaded) {
      doc.setFillColor(252, 252, 253)
      doc.rect(x, rowY, halfW, rowH, "F")
    }

    let textY = rowY + s(4)
    doc.setFont("helvetica", emphasis === "bold" || emphasis === "subtotal" ? "bold" : "normal")
    doc.setFontSize(emphasis === "subtotal" ? s(9.5) : s(8.5))
    doc.setTextColor(15, 23, 42)
    const labelLines = doc.splitTextToSize(item.label, labelMaxW)
    drawTextLines(doc, labelLines, x + pad, textY, s(3.6))
    textY += labelLines.length * s(3.6)

    if (item.detail?.trim()) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(s(7))
      doc.setTextColor(...PHILFIDA_SLATE)
      const detailLines = doc.splitTextToSize(item.detail, labelMaxW)
      drawTextLines(doc, detailLines, x + pad, textY, s(3.2))
    }

    if (item.amount) {
      doc.setFont("helvetica", emphasis === "bold" || emphasis === "subtotal" ? "bold" : "normal")
      doc.setFontSize(emphasis === "subtotal" ? s(9.5) : s(8.5))
      doc.setTextColor(...(emphasis === "subtotal" ? PHILFIDA_GREEN : [15, 23, 42] as [number, number, number]))
      doc.text(item.amount, amtX, rowY + s(4.8), { align: "right" })
    }
  }

  for (let i = 0; i < rowCount; i++) {
    const rowH = Math.max(leftHeights[i] ?? minRowH, rightHeights[i] ?? minRowH, minRowH)
    const shaded = i % 2 === 0
    drawSideItem(earnings[i], leftX, y, rowH, leftX + halfW - pad, shaded)
    drawSideItem(deductions[i], rightX, y, rowH, pageMargin + contentW - pad, shaded)

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(s(0.2))
    doc.line(leftX, y + rowH, pageMargin + contentW, y + rowH)
    y += rowH
  }

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.35))
  doc.line(pageMargin + halfW, tableTop, pageMargin + halfW, y)

  const netH = s(11)
  doc.setFillColor(15, 23, 42)
  doc.rect(pageMargin, y, contentW, netH, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(s(11))
  doc.setTextColor(255, 255, 255)
  doc.text("NET PAY DUE", pageMargin + pad, y + s(7))
  doc.setTextColor(...PHILFIDA_GREEN)
  doc.setFontSize(s(12))
  doc.text(`Php ${netPay}`, pageMargin + contentW - pad, y + s(7.2), { align: "right" })

  y += netH
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(s(0.35))
  doc.rect(pageMargin, tableTop, contentW, y - tableTop)

  return y + s(5)
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
  switch (computationType) {
    case "daily":
      return "Daily"
    case "monthly":
      return "Monthly"
    case "monthly-no-tax":
      return "Monthly (No Tax)"
    case "semi-monthly-no-tax":
      return "Semi-Monthly (No Tax)"
    default:
      return "Semi-Monthly"
  }
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
