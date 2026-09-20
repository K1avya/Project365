import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { AnalyticsApplicationService } from "../src/services/analytics-app.service.js";

describe("Life OS Analytics Engine Gate (Phase 3)", () => {
  let userId: string;
  let service: AnalyticsApplicationService;

  beforeAll(async () => {
    service = new AnalyticsApplicationService(prisma);

    // Setup isolated test user
    const user = await prisma.user.create({
      data: {
        email: `analytics-test-${Date.now()}@project365.local`,
        name: "Analytics Test User",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    userId = user.id;

    // Create a Life Area
    const area = await prisma.lifeArea.create({
      data: {
        userId,
        type: "ACADEMIC",
        name: "Academics",
      },
    });

    // Create 3 Task Templates
    const t1 = await prisma.task.create({
      data: {
        userId,
        areaId: area.id,
        title: "Compiler Optimizations",
        durationMinutes: 120,
      },
    });
    const t2 = await prisma.task.create({
      data: {
        userId,
        areaId: area.id,
        title: "Graph Algorithms",
        durationMinutes: 60,
      },
    });

    // Create task instances for today: 1 completed (120m target, 110m actual), 1 missed (60m)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.taskInstance.create({
      data: {
        userId,
        taskId: t1.id,
        date: today,
        title: t1.title,
        priority: "HIGH",
        energyRequired: "HIGH",
        durationMinutes: 120,
        status: "COMPLETED",
        actualMinutes: 110,
      },
    });

    await prisma.taskInstance.create({
      data: {
        userId,
        taskId: t2.id,
        date: today,
        title: t2.title,
        priority: "MEDIUM",
        energyRequired: "MEDIUM",
        durationMinutes: 60,
        status: "MISSED",
        actualMinutes: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.taskInstance.deleteMany({ where: { userId } });
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.lifeArea.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("calculates execution rate accurately by task count and duration", async () => {
    const rate = await service.getExecutionRate(userId, 7);

    expect(rate.totalTasksScheduled).toBe(2);
    expect(rate.completedTasks).toBe(1);
    expect(rate.missedTasks).toBe(1);
    expect(rate.taskCompletionPercent).toBe(50); // 1 of 2 completed
    expect(rate.plannedMinutesTotal).toBe(180); // 120 + 60
    expect(rate.actualMinutesTotal).toBe(110);
    // 110 / 180 = 61%
    expect(rate.timeExecutionPercent).toBe(61);
  });

  it("evaluates capacity utilization and health categorization", async () => {
    const util = await service.getCapacityUtilization(userId, 7);

    expect(util.totalPlannedMinutes).toBeGreaterThan(0);
    expect(util.totalDiscretionaryMinutes).toBeGreaterThan(0);
    expect(typeof util.utilizationPercent).toBe("number");
    expect(["UNDER_COMMITTED", "HEALTHY_FLOW", "OVERLOAD_WARNING", "CRITICAL_BURNOUT"]).toContain(
      util.healthClassification
    );
  });

  it("computes planning accuracy variance", async () => {
    const accuracy = await service.getPlanningAccuracy(userId, 7);

    expect(accuracy.baselinePlannedHours).toBe(3.0); // 180 min = 3.0h
    expect(accuracy.actualExecutedHours).toBe(1.8); // 110 min = 1.8h
    expect(accuracy.varianceHours).toBe(1.2); // |3.0 - 1.8| = 1.2h
    // Error ratio = 1.2 / 3.0 = 0.4. Accuracy = 1 - 0.4 = 60%
    expect(accuracy.accuracyScore).toBe(60);
  });

  it("consolidates analytics summary with backlog velocity delta", async () => {
    const summary = await service.getAnalyticsSummary(userId, "7d");

    expect(summary.actorUserId).toBe(userId);
    expect(summary.range).toBe("7d");
    expect(summary.executionRate.completedTasks).toBe(1);
    expect(summary.backlogDelta.createdCount).toBe(2);
    expect(summary.backlogDelta.completedCount).toBe(1);
    expect(summary.backlogDelta.netChange).toBe(1);
  });
});
