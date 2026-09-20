import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { WeeklyPlanningService } from "../src/services/weekly-planning.service.js";
import { CapacityController } from "../src/api/capacity.controller.js";
import { CapacityEngine } from "../src/domain/capacity/capacity-engine.js";

describe("Priority 1 & 2: Capacity Engine, Sunday Reality Check & Plan Versioning", () => {
  let planningService: WeeklyPlanningService;
  let capacityController: CapacityController;
  let testUserId: string;

  beforeAll(async () => {
    planningService = new WeeklyPlanningService(prisma);
    capacityController = new CapacityController(prisma);

    // Create a realistic college student user
    const user = await prisma.user.create({
      data: {
        email: `student-commute-${Date.now()}@project365.local`,
        name: "Commuter Engineering Student",
        dayStartHour: 6,           // 06:00 AM wake up
        logicalDayCutoffHour: 1,   // 01:00 AM night cutoff
        dailySleepHours: 7.0,      // 7 hours sleep
      },
    });
    testUserId = user.id;

    // Seed Realistic Student Daily Commitments
    // 1. Morning Bus: 07:00 - 09:00 (120 min)
    await prisma.commitment.create({
      data: {
        userId: testUserId,
        title: "Morning Bus Commute",
        type: "COMMUTE",
        startMinute: 420, // 07:00 AM
        endMinute: 540,   // 09:00 AM
        durationMinutes: 120,
        recurrenceDays: [1, 2, 3, 4, 5],
      },
    });

    // 2. College Lectures & Labs: 09:00 - 15:00 (360 min)
    await prisma.commitment.create({
      data: {
        userId: testUserId,
        title: "College Classes & Labs",
        type: "COLLEGE",
        startMinute: 540, // 09:00 AM
        endMinute: 900,   // 03:00 PM
        durationMinutes: 360,
        recurrenceDays: [1, 2, 3, 4, 5],
      },
    });

    // 3. Evening Travel Home: 15:00 - 16:30 (90 min)
    await prisma.commitment.create({
      data: {
        userId: testUserId,
        title: "Evening Bus Commute Home",
        type: "COMMUTE",
        startMinute: 900, // 03:00 PM
        endMinute: 990,   // 04:30 PM
        durationMinutes: 90,
        recurrenceDays: [1, 2, 3, 4, 5],
      },
    });

    // 4. Dinner & Routine: 20:00 - 20:30 (30 min)
    await prisma.commitment.create({
      data: {
        userId: testUserId,
        title: "Dinner & Family Time",
        type: "ROUTINE_MEALS",
        startMinute: 1200, // 08:00 PM
        endMinute: 1230,   // 08:30 PM
        durationMinutes: 30,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  });

  afterAll(async () => {
    // Cascade cleanup
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  it("proves realistic student discretionary time is constrained and blocks impossible daily plans", async () => {
    const todayReport = await capacityController.getTodayCapacity(
      testUserId,
      new Date("2026-09-21T10:00:00Z") // Monday
    );

    // Total waking window = 19h. Sleep deficit = 2h.
    // Commitments on Monday = 120 (Bus) + 360 (College) + 90 (Bus) + 30 (Dinner) = 600 min (10.0 hours!)
    // True Net Discretionary Capacity = 19h - 2h - 10h = 7.0 hours!
    expect(todayReport.committedHours).toBe(10.0);
    expect(todayReport.discretionaryHours).toBe(7.0);

    // Attempting to plan 9 hours of deep work on this weekday should be rejected by the Reality Gate!
    const engine = new CapacityEngine();
    const commitments = await prisma.commitment.findMany({
      where: { userId: testUserId, isActive: true },
    });

    const mondayCommitments = commitments.filter(c => c.recurrenceDays.includes(1));

    expect(() =>
      engine.evaluateCapacity({
        dayStartMinute: 360,
        dayCutoffMinute: 60,
        dailySleepHours: 7.0,
        commitments: mondayCommitments.map(c => ({ ...c, createdAt: c.createdAt, updatedAt: c.updatedAt })),
        plannedTasks: [
          { title: "AI/ML Deep Learning", durationMinutes: 180 }, // 3h
          { title: "LeetCode Graphs", durationMinutes: 180 },      // 3h
          { title: "Startup Engineering", durationMinutes: 180 },  // 3h
        ], // Total planned = 9h > 7h discretionary!
      })
    ).toThrow(/CAPACITY GATE BLOCKED/);
  });

  it("executes the Sunday Reality Check, enforces Maximum Safe Workload, and persists Version 1", async () => {
    const monday = "2026-09-21";

    // Safe planned tasks within weekly capacity
    const plannedTasks = [
      { title: "AI/ML Curriculum", durationMinutes: 600 },  // 10h
      { title: "LeetCode Blind 75", durationMinutes: 480 },  // 8h
      { title: "Startup Prototype", durationMinutes: 420 },  // 7h
    ]; // Total = 25.0 hours (comfortably within ~40h+ weekly discretionary time)

    const result = await capacityController.createWeeklyPlan(testUserId, {
      weekStartDate: monday,
      plannedTasks,
      changeReason: "Sunday Baseline - Focus on ML & DSA",
    });

    expect(result.version).toBe(1);
    expect(result.plannedHours).toBe(25.0);
    expect(result.isOverloaded).toBe(false);
    expect(result.maximumSafeWorkloadHours).toBeGreaterThan(25.0);

    // Verify daily snapshots were recorded in PostgreSQL
    const snapshots = await capacityController.getWeekCapacity(testUserId, monday);
    expect(snapshots.snapshots.length).toBe(7);
  });

  it("creates Version 2 mid-week without mutating Version 1 baseline (Rule 3)", async () => {
    const monday = "2026-09-21";
    const existingPlan = await prisma.weeklyPlan.findFirstOrThrow({
      where: { userId: testUserId },
      include: { revisions: true },
    });

    expect(existingPlan.currentVersion).toBe(1);
    expect(existingPlan.revisions.length).toBe(1);

    // Tuesday Mid-Week Adjustment: Adding 6 hours for Exam preparation
    const updatedTasks = [
      { title: "AI/ML Curriculum", durationMinutes: 480 },
      { title: "LeetCode Blind 75", durationMinutes: 300 },
      { title: "Startup Prototype", durationMinutes: 300 },
      { title: "Operating Systems Exam Prep", durationMinutes: 360 }, // 6h added
    ]; // Total = 24 hours

    const v2 = await planningService.revisePlanMidWeek(
      existingPlan.id,
      "Exam Week Adjustment: Scaling back startup, adding OS revision",
      updatedTasks
    );

    expect(v2.version).toBe(2);
    expect(v2.changeReason).toBe(
      "Exam Week Adjustment: Scaling back startup, adding OS revision"
    );

    // Verify via GET /api/weekly-plan/:id that both revisions coexist immutably!
    const planReport = await capacityController.getWeeklyPlan(testUserId, existingPlan.id);
    expect(planReport.currentVersion).toBe(2);
    expect(planReport.revisions.length).toBe(2);
    expect(planReport.revisions[0].version).toBe(1);
    expect(planReport.revisions[0].changeReason).toBe("Sunday Baseline - Focus on ML & DSA");
    expect(planReport.revisions[1].version).toBe(2);
    expect(planReport.revisions[1].changeReason).toBe(
      "Exam Week Adjustment: Scaling back startup, adding OS revision"
    );
  });
});