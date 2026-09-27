"use client"

import React, { memo } from "react"
import {
  TableRow,
  TableCell,
  TextField,
  Typography,
  Stack,
  Chip,
  MenuItem,
  ListSubheader,
} from "@mui/material"
import type { DtrDayLog } from "@/features/dtr/types/dtr"
import { LEAVE_NAMES_MAP } from "@/features/dtr/lib/dtrConstants"

/**
 * Hoisted static list of status options so React does not allocate
 * 29 MenuItem / ListSubheader elements on every single row render.
 */
export const DTR_STATUS_MENU_ITEMS = [
  <ListSubheader
    key="hdr-att"
    disableSticky
    sx={{
      px: 2,
      fontWeight: 800,
      color: "primary.main",
      fontSize: "0.68rem",
      textTransform: "uppercase",
      lineHeight: "2.2",
      bgcolor: "background.paper",
    }}
  >
    Attendance & Travel
  </ListSubheader>,
  <MenuItem key="regular" value="regular">Regular Work</MenuItem>,
  <MenuItem key="weekend" value="weekend">Weekend</MenuItem>,
  <MenuItem key="holiday" value="holiday">Holiday (Regular)</MenuItem>,
  <MenuItem key="special-holiday" value="special-holiday">Special Holiday</MenuItem>,
  <MenuItem key="absent" value="absent">Absent (Full Day)</MenuItem>,
  <MenuItem key="absent-am" value="absent-am">Half Day Absent (AM)</MenuItem>,
  <MenuItem key="absent-pm" value="absent-pm">Half Day Absent (PM)</MenuItem>,
  <MenuItem key="ob" value="ob">Official Business (OB)</MenuItem>,
  <MenuItem key="special" value="special">Special Case (OB Partial)</MenuItem>,

  <ListSubheader
    key="hdr-plantilla"
    disableSticky
    sx={{
      px: 2,
      fontWeight: 800,
      color: "primary.main",
      fontSize: "0.68rem",
      textTransform: "uppercase",
      lineHeight: "2.2",
      bgcolor: "background.paper",
    }}
  >
    Plantilla / Permanent Leaves
  </ListSubheader>,
  <MenuItem key="leave" value="leave">General Leave</MenuItem>,
  <MenuItem key="leave-vl" value="leave-vl">Vacation Leave</MenuItem>,
  <MenuItem key="leave-fl" value="leave-fl">Forced / Mandatory Leave</MenuItem>,
  <MenuItem key="leave-sl" value="leave-sl">Sick Leave</MenuItem>,
  <MenuItem key="leave-slp" value="leave-slp">Special Leave Privileges</MenuItem>,

  <ListSubheader
    key="hdr-welfare"
    disableSticky
    sx={{
      px: 2,
      fontWeight: 800,
      color: "primary.main",
      fontSize: "0.68rem",
      textTransform: "uppercase",
      lineHeight: "2.2",
      bgcolor: "background.paper",
    }}
  >
    Special Welfare Leaves
  </ListSubheader>,
  <MenuItem key="leave-ml" value="leave-ml">Maternity Leave</MenuItem>,
  <MenuItem key="leave-pl" value="leave-pl">Paternity Leave</MenuItem>,
  <MenuItem key="leave-spl" value="leave-spl">Solo Parent Leave</MenuItem>,
  <MenuItem key="leave-mc" value="leave-mc">Special Leave Benefits for Women (Magna Carta)</MenuItem>,
  <MenuItem key="leave-vawc" value="leave-vawc">VAWC Leave</MenuItem>,

  <ListSubheader
    key="hdr-emergency"
    disableSticky
    sx={{
      px: 2,
      fontWeight: 800,
      color: "primary.main",
      fontSize: "0.68rem",
      textTransform: "uppercase",
      lineHeight: "2.2",
      bgcolor: "background.paper",
    }}
  >
    Emergency & Professional
  </ListSubheader>,
  <MenuItem key="leave-wl" value="leave-wl">Wellness Leave</MenuItem>,
  <MenuItem key="leave-sel" value="leave-sel">Special Emergency Leave</MenuItem>,
  <MenuItem key="leave-rl" value="leave-rl">Rehabilitation Leave</MenuItem>,
  <MenuItem key="leave-stl" value="leave-stl">Study Leave</MenuItem>,

  <ListSubheader
    key="hdr-cos"
    disableSticky
    sx={{
      px: 2,
      fontWeight: 800,
      color: "primary.main",
      fontSize: "0.68rem",
      textTransform: "uppercase",
      lineHeight: "2.2",
      bgcolor: "background.paper",
    }}
  >
    Contract of Service (C.O.S)
  </ListSubheader>,
  <MenuItem key="leave-cto" value="leave-cto">Compensatory Time-Off</MenuItem>,
  <MenuItem key="leave-cto-am" value="leave-cto-am">Half Day CTO (AM)</MenuItem>,
  <MenuItem key="leave-cto-pm" value="leave-cto-pm">Half Day CTO (PM)</MenuItem>,
  <MenuItem key="leave-wlcos" value="leave-wlcos">Wellness Leave - COS</MenuItem>,
]

function getMergeHint(log: DtrDayLog): string {
  const has0 = Boolean(log.amIn && log.amIn.trim() && log.amIn !== "-")
  const has1 = Boolean(log.amOut && log.amOut.trim() && log.amOut !== "-")
  const has2 = Boolean(log.pmIn && log.pmIn.trim() && log.pmIn !== "-")
  const has3 = Boolean(log.pmOut && log.pmOut.trim() && log.pmOut !== "-")

  if ((has0 && has3 && !has1 && !has2) || (has0 && has1 && has2 && has3)) {
    return "💡 PDF Merges: Middle cells (AM Out & PM In)"
  }
  if (has0 && has1 && !has2 && !has3) {
    return "💡 PDF Merges: Afternoon cells (PM In & PM Out)"
  }
  if (!has0 && !has1 && has2 && has3) {
    return "💡 PDF Merges: Morning cells (AM In & AM Out)"
  }
  if (!has0 && !has1 && !has2 && !has3) {
    return "💡 PDF Merges: Full row (All 4 cells)"
  }
  if (has0 && !has1 && !has2 && !has3) {
    return "💡 PDF Merges: AM Out to PM Out"
  }
  if (!has0 && !has1 && !has2 && has3) {
    return "💡 PDF Merges: AM In to PM In"
  }
  return "💡 PDF Merges: Empty time cells into note"
}

export interface DtrDayRowProps {
  log: DtrDayLog
  mode: "light" | "dark"
  onLogChange: (dayNum: number, field: keyof DtrDayLog, value: string) => void
  onApplySpecialPreset: (
    dayNum: number,
    preset: "middle" | "afternoon" | "morning" | "fullday"
  ) => void
}

export const DtrDayRow = memo(function DtrDayRow({
  log,
  mode,
  onLogChange,
  onApplySpecialPreset,
}: DtrDayRowProps) {
  const isRegular = log.status === "regular" || log.status === "special"
  const isAmEnabled = isRegular || log.status === "leave-cto-pm" || log.status === "absent-pm"
  const isPmEnabled = isRegular || log.status === "leave-cto-am" || log.status === "absent-am"

  return (
    <>
      <TableRow
        sx={{
          bgcolor:
            log.status === "weekend"
              ? mode === "dark"
                ? "rgba(255,255,255,0.01)"
                : "grey.50"
              : log.status === "absent" || log.status === "absent-am" || log.status === "absent-pm"
              ? mode === "dark"
                ? "rgba(239, 68, 68, 0.05)"
                : "rgba(239, 68, 68, 0.02)"
              : log.status === "special"
              ? mode === "dark"
                ? "rgba(124, 58, 237, 0.05)"
                : "rgba(124, 58, 237, 0.02)"
              : "transparent",
        }}
      >
        {/* Day Column */}
        <TableCell sx={{ fontWeight: 700 }}>
          {log.day}{" "}
          <span style={{ fontWeight: 400, color: "gray", fontSize: "0.72rem" }}>
            ({log.dayName})
          </span>
        </TableCell>

        {/* Status Column */}
        <TableCell>
          <TextField
            select
            size="small"
            fullWidth
            value={log.status}
            onChange={(e) => onLogChange(log.day, "status", e.target.value)}
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            sx={{ fontSize: "0.8rem" }}
          >
            {DTR_STATUS_MENU_ITEMS}
          </TextField>
        </TableCell>

        {log.status === "leave" ||
        (log.status.startsWith("leave-") &&
          log.status !== "leave-cto-am" &&
          log.status !== "leave-cto-pm") ? (
          <TableCell colSpan={4}>
            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", pl: 1 }}>
              On Leave / Excused (
              {log.status === "leave"
                ? "General"
                : LEAVE_NAMES_MAP[log.status.substring(6)] || log.status.substring(6).toUpperCase()}
              )
            </Typography>
          </TableCell>
        ) : log.status === "holiday" || log.status === "special-holiday" ? (
          <TableCell colSpan={4}>
            <TextField
              size="small"
              placeholder={
                log.status === "special-holiday"
                  ? "Enter Special Holiday Reason (e.g. Ninoy Aquino Day)"
                  : "Enter Holiday Reason (e.g. Independence Day)"
              }
              value={log.reason ?? log.specialNote ?? ""}
              onChange={(e) => {
                onLogChange(log.day, "reason", e.target.value)
                onLogChange(log.day, "specialNote", e.target.value)
              }}
              fullWidth
              variant="standard"
              slotProps={{ input: { disableUnderline: false } }}
              sx={{ fontStyle: "italic", input: { fontSize: "0.8rem", py: 0.2 } }}
            />
          </TableCell>
        ) : log.status === "ob" ? (
          <TableCell colSpan={4}>
            <TextField
              size="small"
              placeholder="Enter Travel Location (e.g. Quezon City Office)"
              value={log.location || ""}
              onChange={(e) => onLogChange(log.day, "location", e.target.value)}
              fullWidth
              variant="standard"
              slotProps={{ input: { disableUnderline: false } }}
              sx={{ fontStyle: "italic", input: { fontSize: "0.8rem", py: 0.2 } }}
            />
          </TableCell>
        ) : log.status === "absent-am" ? (
          <>
            <TableCell
              colSpan={2}
              align="center"
              sx={{
                bgcolor:
                  mode === "dark" ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.04)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "error.main", letterSpacing: 0.5 }}
              >
                ABSENT (MORNING)
              </Typography>
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="01:00"
                value={log.pmIn}
                onChange={(e) => onLogChange(log.day, "pmIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="05:00"
                value={log.pmOut}
                onChange={(e) => onLogChange(log.day, "pmOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
          </>
        ) : log.status === "absent-pm" ? (
          <>
            <TableCell>
              <TextField
                size="small"
                placeholder="08:00"
                value={log.amIn}
                onChange={(e) => onLogChange(log.day, "amIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="12:00"
                value={log.amOut}
                onChange={(e) => onLogChange(log.day, "amOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell
              colSpan={2}
              align="center"
              sx={{
                bgcolor:
                  mode === "dark" ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.04)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "error.main", letterSpacing: 0.5 }}
              >
                ABSENT (AFTERNOON)
              </Typography>
            </TableCell>
          </>
        ) : log.status === "leave-cto-am" ? (
          <>
            <TableCell
              colSpan={2}
              align="center"
              sx={{
                bgcolor:
                  mode === "dark" ? "rgba(147, 51, 234, 0.08)" : "rgba(147, 51, 234, 0.04)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "secondary.main", letterSpacing: 0.5 }}
              >
                CTO (MORNING)
              </Typography>
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="01:00"
                value={log.pmIn}
                onChange={(e) => onLogChange(log.day, "pmIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="05:00"
                value={log.pmOut}
                onChange={(e) => onLogChange(log.day, "pmOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
          </>
        ) : log.status === "leave-cto-pm" ? (
          <>
            <TableCell>
              <TextField
                size="small"
                placeholder="08:00"
                value={log.amIn}
                onChange={(e) => onLogChange(log.day, "amIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                placeholder="12:00"
                value={log.amOut}
                onChange={(e) => onLogChange(log.day, "amOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
            <TableCell
              colSpan={2}
              align="center"
              sx={{
                bgcolor:
                  mode === "dark" ? "rgba(147, 51, 234, 0.08)" : "rgba(147, 51, 234, 0.04)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "secondary.main", letterSpacing: 0.5 }}
              >
                CTO (AFTERNOON)
              </Typography>
            </TableCell>
          </>
        ) : (
          <>
            {/* AM IN */}
            <TableCell>
              <TextField
                size="small"
                placeholder="08:00"
                value={log.amIn}
                disabled={!isAmEnabled}
                onChange={(e) => onLogChange(log.day, "amIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>

            {/* AM OUT */}
            <TableCell>
              <TextField
                size="small"
                placeholder={log.status === "special" && log.specialNote ? "(Merged)" : "12:00"}
                value={log.amOut}
                disabled={!isAmEnabled}
                onChange={(e) => onLogChange(log.day, "amOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>

            {/* PM IN */}
            <TableCell>
              <TextField
                size="small"
                placeholder={log.status === "special" && log.specialNote ? "(Merged)" : "01:00"}
                value={log.pmIn}
                disabled={!isPmEnabled}
                onChange={(e) => onLogChange(log.day, "pmIn", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>

            {/* PM OUT */}
            <TableCell>
              <TextField
                size="small"
                placeholder="05:00"
                value={log.pmOut}
                disabled={!isPmEnabled}
                onChange={(e) => onLogChange(log.day, "pmOut", e.target.value)}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
              />
            </TableCell>
          </>
        )}

        {/* Day Late */}
        <TableCell
          align="right"
          sx={{
            fontWeight: 600,
            color: log.lateMinutes > 0 ? "error.main" : "text.secondary",
          }}
        >
          {log.lateMinutes > 0 ? `${log.lateMinutes}m` : "—"}
        </TableCell>

        {/* Day Undertime */}
        <TableCell
          align="right"
          sx={{
            fontWeight: 600,
            color: log.undertimeMinutes > 0 ? "error.main" : "text.secondary",
          }}
        >
          {log.undertimeMinutes > 0 ? `${log.undertimeMinutes}m` : "—"}
        </TableCell>
      </TableRow>

      {log.status === "special" && (
        <TableRow
          sx={{
            bgcolor:
              mode === "dark" ? "rgba(124, 58, 237, 0.03)" : "rgba(124, 58, 237, 0.01)",
          }}
        >
          <TableCell colSpan={8} sx={{ pt: 0.5, pb: 1.5, px: 2 }}>
            <Stack spacing={1}>
              <TextField
                size="small"
                label="📋 Special Case Details (e.g. Attended DA Event, OB Travel)"
                placeholder="Describe the official travel or reason for the time gap..."
                value={log.specialNote || ""}
                onChange={(e) => onLogChange(log.day, "specialNote", e.target.value)}
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiInputLabel-root": { fontSize: "0.78rem" },
                  "& .MuiOutlinedInput-root": { fontSize: "0.82rem" },
                }}
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.72rem", color: "text.secondary", mr: 0.5 }}
                >
                  Merge Presets:
                </Typography>
                <Chip
                  label="Official Event (8 AM - 5 PM)"
                  size="small"
                  variant="outlined"
                  onClick={() => onApplySpecialPreset(log.day, "middle")}
                  sx={{ fontSize: "0.7rem", cursor: "pointer", height: 22 }}
                />
                <Chip
                  label="Afternoon OB (1 PM - 5 PM)"
                  size="small"
                  variant="outlined"
                  onClick={() => onApplySpecialPreset(log.day, "afternoon")}
                  sx={{ fontSize: "0.7rem", cursor: "pointer", height: 22 }}
                />
                <Chip
                  label="Morning OB (8 AM - 12 PM)"
                  size="small"
                  variant="outlined"
                  onClick={() => onApplySpecialPreset(log.day, "morning")}
                  sx={{ fontSize: "0.7rem", cursor: "pointer", height: 22 }}
                />
                <Chip
                  label="Full Day Note"
                  size="small"
                  variant="outlined"
                  onClick={() => onApplySpecialPreset(log.day, "fullday")}
                  sx={{ fontSize: "0.7rem", cursor: "pointer", height: 22 }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.72rem",
                    color: "primary.main",
                    fontStyle: "italic",
                    ml: "auto",
                  }}
                >
                  {getMergeHint(log)}
                </Typography>
              </Stack>
            </Stack>
          </TableCell>
        </TableRow>
      )}
    </>
  )
})
