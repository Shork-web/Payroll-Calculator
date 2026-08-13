import jsPDF from "jspdf"

import { formatPayPeriod } from "@/shared/lib/format"
import type { PayrollEntry } from "@/features/payroll/types/payroll"
import { n } from "@/lib/exports/pdfShared"
export function exportAttendanceCertificatePdf(entry: PayrollEntry): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  const { employee, inputs, result } = entry
  const period = formatPayPeriod(inputs.periodStart, inputs.periodEnd)

  const pageW = 210
  const pageMargin = 20
  const contentW = pageW - pageMargin * 2
  const amountCol = pageW - pageMargin - 5
  const RM = pageW - pageMargin

  let y = 15

  // 1. Header with Republic of the Philippines branding
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text("REPUBLIC OF THE PHILIPPINES", pageW / 2, y, { align: "center" })

  y += 4.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(15, 110, 86) // PhilFIDA Emerald
  doc.text("PHILIPPINE FIBER INDUSTRY DEVELOPMENT AUTHORITY", pageW / 2, y, { align: "center" })

  y += 3
  // Elegant double lines
  doc.setDrawColor(15, 110, 86) // PhilFIDA Emerald
  doc.setLineWidth(0.5)
  doc.line(pageMargin, y, RM, y)
  
  y += 0.8
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, RM, y)

  y += 12
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 0)
  doc.text("CERTIFICATION OF ATTENDANCE ADJUSTMENTS", pageW / 2, y, { align: "center" })

  y += 10
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(50, 50, 50)
  
  const introText1 = `This is to certify that the following attendance records and salary deductions due to absences, lates, and undertimes were calculated for ${employee.name.toUpperCase()} for the pay period of ${period}.`
  const lines = doc.splitTextToSize(introText1, contentW)
  doc.text(lines, pageMargin, y)

  y += lines.length * 5 + 8

  // Rates sub-card
  const rateBoxH = 18
  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(pageMargin, y, contentW, rateBoxH, 1.5, 1.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("BASE CALCULATION RATES", pageMargin + 5, y + 5)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text(`Daily Rate: Php ${n(result.dailyRate)}`, pageMargin + 5, y + 11)
  doc.text(`Hourly Rate: Php ${n(result.hourlyRate)}`, pageMargin + 65, y + 11)
  doc.text(`Per-Minute Rate: Php ${n(result.perMinRate)}`, pageMargin + 125, y + 11)

  y += rateBoxH + 10

  // 2. Incident logs table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 110, 86)
  doc.text("ITEMIZED ADJUSTMENT LOG", pageMargin, y)

  y += 4

  // Table header
  doc.setFillColor(241, 245, 249) // light slate
  doc.rect(pageMargin, y, contentW, 7, "F")
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.2)
  doc.line(pageMargin, y, RM, y)
  doc.line(pageMargin, y + 7, RM, y + 7)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text("Date", pageMargin + 4, y + 4.8)
  doc.text("Incident Type", pageMargin + 40, y + 4.8)
  doc.text("Duration", pageMargin + 95, y + 4.8)
  doc.text("Equivalent Deduction", amountCol - 4, y + 4.8, { align: "right" })

  y += 7

  const incidents = inputs.lateIncidents || []
  let hasIncidents = false

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)

  incidents.forEach((item) => {
    const isLate = item.type === "late" || !item.type
    const isUndertime = item.type === "undertime"
    const isAbsent = item.type === "absent"

    const minutes = Number(item.minutes) || 0
    const days = Number(item.days) || 0

    if (item.date?.trim() && ((!isAbsent && minutes > 0) || (isAbsent && days > 0))) {
      hasIncidents = true

      let deductionText = ""
      let durationText = ""
      let typeText = ""

      if (isAbsent) {
        typeText = "Absence"
        durationText = `${days} day${days > 1 ? "s" : ""}`
        deductionText = `Php ${n(days * result.dailyRate)}`
      } else if (isLate) {
        typeText = "Tardiness (Late)"
        durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
        deductionText = `Php ${n(minutes * result.perMinRate)}`
      } else if (isUndertime) {
        typeText = "Undertime"
        durationText = `${minutes} min${minutes > 1 ? "s" : ""}`
        deductionText = `Php ${n(minutes * result.perMinRate)}`
      }

      doc.text(item.date, pageMargin + 4, y + 5)
      doc.text(typeText, pageMargin + 40, y + 5)
      doc.text(durationText, pageMargin + 95, y + 5)
      doc.text(deductionText, amountCol - 4, y + 5, { align: "right" })

      y += 8.5
      doc.line(pageMargin, y - 1, RM, y - 1)
    }
  })

  if (!hasIncidents) {
    doc.text("No lates, undertimes, or absences recorded. (Perfect Attendance)", pageMargin + 4, y + 5)
    y += 8.5
    doc.line(pageMargin, y - 1, RM, y - 1)
  }

  // Summary Row
  y += 2
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Total Deductions for Period", pageMargin + 4, y + 4)

  const totalDeductions = result.absentDeduction + result.lateDeduction + result.undertimeDeduction
  doc.text(`Php ${n(totalDeductions)}`, amountCol - 4, y + 4, { align: "right" })
  
  y += 7.5
  doc.line(pageMargin, y, RM, y)

  y += 18

  // Certification statement
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  doc.text("This certification is issued for internal administrative and auditing purposes.", pageMargin, y)

  y += 25

  // Signature Block
  const sigW = Math.min(70, (contentW - 15) / 2)
  const employeeLineX = pageMargin
  const certifiedLineX = RM - sigW

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  
  doc.text("Conforme / Received by:", employeeLineX, y)
  doc.text("Certified Correct:", certifiedLineX, y)

  y += 12
  doc.setDrawColor(200, 200, 200)
  doc.line(employeeLineX, y, employeeLineX + sigW, y)
  doc.line(certifiedLineX, y, certifiedLineX + sigW, y)

  y += 4
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text(employee.name.toUpperCase(), employeeLineX, y)
  
  const officerName = employee.payslipSignatoryName || employee.signatoryName || "Authorized Officer"
  doc.text(officerName.toUpperCase(), certifiedLineX, y)

  y += 3.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(employee.position || "Employee Signature", employeeLineX, y)

  const officerTitle = employee.payslipSignatoryTitle || employee.signatoryTitle || "Payroll Officer"
  doc.text(officerTitle, certifiedLineX, y)

  doc.save(`${employee.name.replace(/\s+/g, "_")}_Attendance_Log.pdf`)
}
