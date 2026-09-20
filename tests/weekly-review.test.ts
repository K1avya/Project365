import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { WeeklyReviewApplicationService } from "../src/services/weekly-review-app.service.js";

describe("Sunday Reality Check & Weekly Review Gate (Phase 4)", () => {
  let userId: string;
  let service: WeeklyReviewApplicationService;
  const weekStartDateStr = "2026-09-14"; // Monday
  const weekStartDate = new Date("2026-09-14T00:00:00.000Z");
  const weekEndDate = new Date("2026-09-20T00:00:00.000Z");

  beforeAll(async () => {
    service = new WeeklyReviewApplicationService(prisma);

    // Setup isolated user
    const user = await prisma.user.create({
      data: {
        email: `weekly-review-${Date.now()}@project365.local`,
        name: "Review Test User",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0, // 17h/day * 7 = 119h gross
      },
    });
    userId = user.id;

    // Fixed Commitment: College 6h/day, 5 days = 30h
    await prisma.commitment.create({
      data: {
        userId,
        title: "College",
        type: "COLLEGE",
        startMinute: 540,
        endMinute: 900,
        durationMinutes: 360,
        recurrenceDays: [1, 2, 3, 4, 5],
      },
    });

    // Create Life Area
    const area = await prisma.lifeArea.create({
      data: {
        userId,
        type: "ACADEMIC",
        name: "Engineering",
      },
    });

    // Create Weekly Plan
    const plan = await prisma.weeklyPlan.create({
      data: {
        userId,
        weekStartDate,
        weekEndDate,
        currentVersion: 1,
      },
    });

    await prisma.weeklyPlanRevision.create({
      data: {
        weeklyPlanId: plan.id,
        version: 1,
        grossAvailableHours: 119.0,
        committedHours: 30.0,
        netAvailableHours: 89.0,
        plannedHours: 40.0, // Baseline Planned: 40 hours
        actualHours: 0.0,
        isOverloaded: false,
      },
    });

    // Create Tasks and Task Instances
    // Task 1: Completed with 24 hours actual work (1440 min)
    const t1 = await prisma.task.create({
      data: {
        userId,
        areaId: area.id,
        title: "Capstone Implementation",
        durationMinutes: 1440,
      },
    });

    // Task 2: Missed task (120 min)
    const t2 = await prisma.task.create({
      data: {
        userId,
        areaId: area.id,
        title: "Elective Reading",
        durationMinutes: 120,
      },
    });

    // Task 3: Highly paused task (30 min paused)
    const t3 = await prisma.task.create({
      data: {
        userId,
        areaId: area.id,
        title: "Bug Debugging",
        durationMinutes: 90,
      },
    });

    const midWeek = new Date("2026-09-16T00:00:00.000Z");

    await prisma.taskInstance.create({
      data: {
        userId,
        taskId: t1.id,
        date: midWeek,
        title: t1.title,
        priority: "CRITICAL",
        durationMinutes: 1440,
        actualMinutes: 1440, // 24.0 hours actual
        status: "COMPLETED",
      },
    });

    await prisma.taskInstance.create({
      data: {
        userId,
        taskId: t2.id,
        date: midWeek,
        title: t2.title,
        priority: "LOW",
        durationMinutes: 120,
        actualMinutes: 0,
        status: "MISSED",
      },
    });

    await prisma.taskInstance.create({
      data: {
        userId,
        taskId: t3.id,
        date: midWeek,
        title: t3.title,
        priority: "MEDIUM",
        durationMinutes: 90,
        actualMinutes: 60,
        pausedMs: 35 * 60 * 1000, // 35 min paused
        status: "COMPLETED",
      },
    });
  });

  afterAll(async () => {
    await prisma.taskInstance.deleteMany({ where: { userId } });
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.weeklyPlanRevision.deleteMany({ where: { weeklyPlan: { userId } } });
    await prisma.weeklyPlan.deleteMany({ where: { userId } });
    await prisma.commitment.deleteMany({ where: { userId } });
    await prisma.lifeArea.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("evaluates weekly review with data-based reality recommendation (actual * 1.10)", async () => {
    const report = await service.evaluateWeeklyReview(userId, {
      weekStartDate: weekStartDateStr,
      reflectionNotes: "Midterms week caused busyness; stayed focused on Capstone.",
      safetyFactor: 1.10,
    });

    expect(report.userId).toBe(userId);
    expect(report.weekStartDate).toBe(weekStartDateStr);
    expect(report.actualHours).toBe(25.0); // 1440m + 60m = 1500m = 25.0h
    expect(report.plannedHours).toBe(27.5); // 1440 + 120 + 90 = 1650m = 27.5h

    // Recommended next week = actual (25.0h) * 1.10 = 27.5h
    expect(report.recommendedHoursNextWeek).toBe(27.5);
    expect(report.safetyFactor).toBe(1.10);
    expect(report.reflectionNotes).toContain("Midterms week");
  });

  it("identifies top bottlenecks correctly (paused duration and missed tasks)", async () => {
    const report = await service.evaluateWeeklyReview(userId, {
      weekStartDate: weekStartDateStr,
    });

    expect(report.topBottlenecks.length).toBeGreaterThanOrEqual(2);

    const pauseBottleneck = report.topBottlenecks.find(b => b.reason === "HIGH_PAUSE_DURATION");
    expect(pauseBottleneck).toBeDefined();
    expect(pauseBottleneck!.title).toBe("Bug Debugging");
    expect(pauseBottleneck!.details).toContain("35 minutes");

    const missedBottleneck = report.topBottlenecks.find(b => b.reason === "MISSED_TASK");
    expect(missedBottleneck).toBeDefined();
    expect(missedBottleneck!.title).toBe("Elective Reading");
  });

  it("persists weekly review snapshot into WeeklyPlanRevision", async () => {
    const updatedPlan = await prisma.weeklyPlan.findFirst({
      where: { userId, weekStartDate },
      include: { revisions: true },
    });

    expect(updatedPlan).not.toBeNull();
    const rev = updatedPlan!.revisions[0];
    expect(rev.actualHours).toBe(25.0);
    expect(rev.snapshotPayload).not.toBeNull();
    const payload = rev.snapshotPayload as any;
    expect(payload.recommendedHoursNextWeek).toBe(27.5);
    expect(payload.safetyFactor).toBe(1.10);
    expect(payload.topBottlenecks).toBeDefined();
  });
});
