import { describe, expect, it } from "vitest"

import { computeDayAdjustments } from "./dayAdjustments"
import { getDefaultTimesForDay } from "./dtrTimeUtils"

describe("Office Hours Calculations", () => {
  describe("getDefaultTimesForDay", () => {
    it("returns correct default times", () => {
      expect(getDefaultTimesForDay()).toEqual({ amIn: "08:00", amOut: "12:00", pmIn: "01:00", pmOut: "05:00" })
    })
  })

  describe("Monday Flexi Calculations", () => {
    it("calculates 0 late/undertime when perfectly matching 8-5 on Monday", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates 0 late/undertime when perfectly matching 7-4 on Monday", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "07:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates 0 late/undertime for arrival at 7:11 AM and departure at 4:28 PM on Monday", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "07:11",
        amOut: "12:14",
        pmIn: "12:32",
        pmOut: "04:28",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("detects 5 mins late relative to 8-5 schedule on Monday when arriving at 8:05", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:05",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 5, undertimeMinutes: 0 })
    })

    it("detects 10 mins undertime relative to 7-4 schedule on Monday when leaving at 3:50 PM", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "07:00",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "03:50",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 10 })
    })
  })

  describe("Tuesday-Friday Flexi Calculations", () => {
    it("calculates 0 late/undertime for arrival at 7:30 AM and departure at 4:30 PM", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "07:30",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:30",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates 15 mins undertime if arriving at 7:30 AM and departing at 4:15 PM", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "07:30",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:15",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 15 })
    })

    it("calculates 0 late/undertime for early arrival (e.g. 6:45 AM) with departure at 4:00 PM", () => {
      const result = computeDayAdjustments({
        day: 3,
        dayName: "Wed",
        amIn: "06:45",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "04:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates tardiness when arriving after 9:00 AM (e.g., 9:15 AM)", () => {
      const result = computeDayAdjustments({
        day: 4,
        dayName: "Thu",
        amIn: "09:15",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "06:00",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 15, undertimeMinutes: 0 })
    })

    it("calculates tardiness and undertime when arriving after 9:00 AM (e.g., 9:15 AM) and leaving early (e.g., 5:45 PM)", () => {
      const result = computeDayAdjustments({
        day: 4,
        dayName: "Thu",
        amIn: "09:15",
        amOut: "12:00",
        pmIn: "01:00",
        pmOut: "05:45",
        status: "regular",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 15, undertimeMinutes: 15 })
    })
  })

  describe("Half Day CTO Calculations", () => {
    it("ignores morning late/undertime for leave-cto-am on Monday Strict", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "08:15", // late in morning, but ignored
        amOut: "11:45", // undertime in morning, but ignored
        pmIn: "01:00", // on time for afternoon
        pmOut: "05:00", // on time for afternoon
        status: "leave-cto-am",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates afternoon late and undertime for leave-cto-am on Monday Strict", () => {
      const result = computeDayAdjustments({
        day: 1,
        dayName: "Mon",
        amIn: "",
        amOut: "",
        pmIn: "01:10", // 10 mins late
        pmOut: "03:50", // 10 mins undertime (based on 4:00 PM target of 7-4 option)
        status: "leave-cto-am",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 10, undertimeMinutes: 10 })
    })

    it("ignores afternoon late/undertime for leave-cto-pm on Tuesday-Friday Flexi", () => {
      const result = computeDayAdjustments({
        day: 2,
        dayName: "Tue",
        amIn: "08:00", // on time
        amOut: "12:00", // on time
        pmIn: "01:15", // late in afternoon, but ignored
        pmOut: "04:30", // undertime in afternoon, but ignored
        status: "leave-cto-pm",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("calculates morning late and undertime for leave-cto-pm on Tuesday-Friday Flexi", () => {
      const result = computeDayAdjustments({
        day: 3,
        dayName: "Wed",
        amIn: "09:05", // 5 mins late relative to 09:00 AM limit
        amOut: "11:50", // 10 mins undertime relative to 12:00 PM target
        pmIn: "",
        pmOut: "",
        status: "leave-cto-pm",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 5, undertimeMinutes: 10 })
    })
  })

  describe("Holiday and Special Holiday Calculations", () => {
    it("returns 0 late and undertime for Holiday status", () => {
      const result = computeDayAdjustments({
        day: 5,
        dayName: "Fri",
        amIn: "",
        amOut: "",
        pmIn: "",
        pmOut: "",
        status: "holiday",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })

    it("returns 0 late and undertime for Special Holiday status", () => {
      const result = computeDayAdjustments({
        day: 21,
        dayName: "Fri",
        amIn: "",
        amOut: "",
        pmIn: "",
        pmOut: "",
        status: "special-holiday",
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
      expect(result).toEqual({ lateMinutes: 0, undertimeMinutes: 0 })
    })
  })
})
