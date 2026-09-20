import { describe, it, expect } from "vitest";
import {
  timeToMinute,
  minuteToTime,
  calculateDuration,
  isOverlapping,
} from "../src/domain/time/time-utils.js";

describe("Module 1: Time Utilities", () => {
  describe("timeToMinute", () => {
    it("correctly converts standard 24h times to minutes from midnight", () => {
      expect(timeToMinute("00:00")).toBe(0);
      expect(timeToMinute("06:00")).toBe(360);
      expect(timeToMinute("09:30")).toBe(570);
      expect(timeToMinute("15:00")).toBe(900);
      expect(timeToMinute("23:59")).toBe(1439);
    });

    it("throws error for invalid format or out-of-range times", () => {
      expect(() => timeToMinute("")).toThrow("Invalid time string");
      expect(() => timeToMinute("24:00")).toThrow("Hours must be between 0 and 23");
      expect(() => timeToMinute("12:60")).toThrow("Minutes must be between 0 and 59");
      expect(() => timeToMinute("-01:20")).toThrow();
      expect(() => timeToMinute("not:time")).toThrow();
    });
  });

  describe("minuteToTime", () => {
    it("converts integer minutes to zero-padded HH:mm", () => {
      expect(minuteToTime(0)).toBe("00:00");
      expect(minuteToTime(360)).toBe("06:00");
      expect(minuteToTime(570)).toBe("09:30");
      expect(minuteToTime(1439)).toBe("23:59");
    });

    it("handles modulo rollover for values >= 1440 or negative", () => {
      expect(minuteToTime(1440)).toBe("00:00");
      expect(minuteToTime(1500)).toBe("01:00");
      expect(minuteToTime(-60)).toBe("23:00");
    });
  });

  describe("calculateDuration", () => {
    it("calculates same-day duration correctly", () => {
      expect(calculateDuration(360, 420)).toBe(60); // 06:00 to 07:00
      expect(calculateDuration(540, 900)).toBe(360); // 09:00 to 15:00
    });

    it("calculates cross-midnight duration correctly", () => {
      expect(calculateDuration(1410, 60)).toBe(90); // 23:30 to 01:00 = 90 min
      expect(calculateDuration(1380, 120)).toBe(180); // 23:00 to 02:00 = 180 min
    });
  });

  describe("isOverlapping", () => {
    it("detects same-day overlapping intervals", () => {
      // [09:00, 11:00) and [10:00, 12:00) -> Overlap
      expect(isOverlapping(540, 660, 600, 720)).toBe(true);

      // [09:00, 10:00) and [10:00, 11:00) -> Non-overlapping (adjacent boundary)
      expect(isOverlapping(540, 600, 600, 660)).toBe(false);

      // [08:00, 09:00) and [10:00, 11:00) -> Disjoint
      expect(isOverlapping(480, 540, 600, 660)).toBe(false);
    });

    it("detects cross-midnight overlapping intervals", () => {
      // A: [23:00, 01:00) [1380, 60), B: [00:30, 02:00) [30, 120) -> Overlap at 00:30-01:00
      expect(isOverlapping(1380, 60, 30, 120)).toBe(true);

      // A: [23:00, 01:00) [1380, 60), B: [22:00, 23:30) [1320, 1410) -> Overlap at 23:00-23:30
      expect(isOverlapping(1380, 60, 1320, 1410)).toBe(true);

      // A: [23:00, 01:00) [1380, 60), B: [01:00, 02:00) [60, 120) -> Boundary adjacent, no overlap
      expect(isOverlapping(1380, 60, 60, 120)).toBe(false);
    });
  });
});
