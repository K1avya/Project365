import { describe, it, expect, beforeEach } from "vitest";
import {
  CapacityEngine,
  CapacityOverloadError,
} from "../src/domain/capacity/capacity-engine.js";
import type { Commitment } from "../src/domain/types.js";

describe("Sprint 2 Core: Capacity Engine & Capacity Lock", () => {
  let engine: CapacityEngine;

  beforeEach(() => {
    engine = new CapacityEngine();
  });

  const makeCommitment = (
    title: string,
    durationMinutes: number,
    type: Commitment["type"] = "COLLEGE"
  ): Commitment => ({
    id: `comm-${title.toLowerCase().replace(/\s+/g, "-")}`,
    userId: "user-1",
    title,
    type,
    startMinute: 540,
    endMinute: 540 + durationMinutes,
    durationMinutes,
    recurrenceDays: [1, 2, 3, 4, 5],
    isMandatory: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("calculates net capacity by deducting commitments and sleep from waking window", () => {
    // 06:00 to 01:00 = 19h = 1140 min waking window.
    // 01:00 to 06:00 is 5h night time. Sleep goal = 7h -> 2h extra sleep deducted from day.
    // Commitments: College 6h (360 min) + Gym 1.5h (90 min) = 450 min.
    // Net Discretionary = 1140 - 120 (extra sleep) - 450 = 570 min (9.5 hours).
    const commitments = [
      makeCommitment("College Lectures", 360, "COLLEGE"),
      makeCommitment("Gym Workout", 90, "GYM_HEALTH"),
    ];

    const plannedTasks = [
      { title: "AI/ML Model Training", durationMinutes: 120 },
      { title: "LeetCode Graphs", durationMinutes: 90 },
    ]; // Total = 210 min (3.5 hours)

    const result = engine.calculateDailyCapacity({
      dayStartMinute: 360,
      dayCutoffMinute: 60,
      dailySleepHours: 7.0,
      commitments,
      plannedTasks,
    });

    expect(result.committedMinutes).toBe(450);
    expect(result.netAvailableHours).toBe(9.5);
    expect(result.plannedHours).toBe(3.5);
    expect(result.bufferHours).toBe(6.0);
    expect(result.isOverloaded).toBe(false);
    expect(result.capacityUtilization).toBe(37); // (210 / 570) * 100
  });

  it("enforces Capacity Lock by throwing CapacityOverloadError on overloaded schedules", () => {
    const commitments = [
      makeCommitment("College Lectures", 360), // 6h
      makeCommitment("Bus Commute", 120, "COMMUTE"), // 2h
      makeCommitment("Gym Workout", 90, "GYM_HEALTH"), // 1.5h
    ]; // Total commitments = 9.5 hours

    // Planned tasks = 12 hours!
    const plannedTasks = [
      { title: "AI/ML Project", durationMinutes: 240 }, // 4h
      { title: "Startup MVP", durationMinutes: 240 },   // 4h
      { title: "LeetCode 5 Problems", durationMinutes: 240 }, // 4h
    ];

    expect(() =>
      engine.calculateDailyCapacity({
        dayStartMinute: 360,
        dayCutoffMinute: 60,
        dailySleepHours: 7.0,
        commitments,
        plannedTasks,
        allowOverride: false, // Capacity Lock active!
      })
    ).toThrow(CapacityOverloadError);
  });

  it("permits overloaded calculations when explicit user override is granted", () => {
    const commitments = [makeCommitment("College Lectures", 360)]; // 6h
    const plannedTasks = [
      { title: "Hackathon Sprint", durationMinutes: 720 }, // 12h
    ];

    const result = engine.calculateDailyCapacity({
      dayStartMinute: 360,
      dayCutoffMinute: 60,
      dailySleepHours: 7.0,
      commitments,
      plannedTasks,
      allowOverride: true, // User intentionally overrides
    });

    expect(result.isOverloaded).toBe(true);
    expect(result.overloadHours).toBeGreaterThan(0);
    expect(result.capacityUtilization).toBeGreaterThan(100);
  });

  it("aggregates daily capacity across 7 days into weekly capacity summary", () => {
    const dailyResults = [];
    for (let i = 0; i < 7; i++) {
      dailyResults.push(
        engine.calculateDailyCapacity({
          commitments: [makeCommitment("College", 300)], // 5h daily
          plannedTasks: [{ title: "Study", durationMinutes: 240 }], // 4h daily
        })
      );
    }

    const summary = engine.calculateWeeklySummary(dailyResults);
    expect(summary.plannedHours).toBe(28.0); // 4h * 7
    expect(summary.isOverloaded).toBe(false);
    expect(summary.weeklyUtilization).toBeLessThan(100);
  });
});
