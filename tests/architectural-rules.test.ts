import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { TaskExecutionService, ConcurrencyConflictError } from "../src/services/task-execution.service.js";
import { CapacityEngine } from "../src/domain/capacity/capacity-engine.js";
import { DAGService, MaxDependencyDepthExceededError } from "../src/domain/tasks/dag-service.js";
import { calculateDuration } from "../src/domain/time/time-utils.js";

const prisma = new PrismaClient();
const executionService = new TaskExecutionService(prisma);
const capacityEngine = new CapacityEngine();
const dagService = new DAGService();

describe("Architectural Rules & Edge Cases", () => {
  let testUser: any;
  let testArea: any;
  let testTask: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `concurrency-test-${Date.now()}@project365.local`,
        name: "Concurrency Tester",
      },
    });

    testArea = await prisma.lifeArea.create({
      data: {
        userId: testUser.id,
        type: "STARTUP",
        name: "Testing Area",
      },
    });

    testTask = await prisma.task.create({
      data: {
        userId: testUser.id,
        areaId: testArea.id,
        title: "Concurrent Task Base",
        durationMinutes: 60,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  // 1. Concurrency: Two requests complete same task simultaneously
  it("Rule 4 (Concurrency): Two simultaneous completion requests -> one succeeds, one fails with ConcurrencyConflictError", async () => {
    const instance = await prisma.taskInstance.create({
      data: {
        userId: testUser.id,
        taskId: testTask.id,
        date: new Date("2026-09-20"),
        title: "Double-Click Task",
        priority: "HIGH",
        energyRequired: "HIGH",
        durationMinutes: 60,
        status: "PENDING",
      },
    });

    // Fire both simultaneously
    const results = await Promise.allSettled([
      executionService.completeTaskAtomically({
        actorUserId: testUser.id,
        taskInstanceId: instance.id,
        actualMinutes: 60,
        expectedStatus: "PENDING",
      }),
      executionService.completeTaskAtomically({
        actorUserId: testUser.id,
        taskInstanceId: instance.id,
        actualMinutes: 60,
        expectedStatus: "PENDING",
      }),
    ]);

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(ConcurrencyConflictError);
  });

  // 2. Capacity Override Audit: forcePlanAnyway = true
  it("Rule 4 (Capacity Override Audit): forcePlanAnyway = true logs warning and flags forcedOverride", () => {
    const report = capacityEngine.evaluateCapacity({
      dayStartMinute: 360, // 06:00
      dayCutoffMinute: 60,  // 01:00 next day (19h awake)
      dailySleepHours: 7.0, // 17h = 1020m
      commitments: [
        {
          id: "c1",
          userId: "u1",
          title: "Full Day Commitment",
          type: "COLLEGE",
          startMinute: 540,
          endMinute: 1140,
          durationMinutes: 600, // 10h
          recurrenceDays: [1, 2, 3, 4, 5],
          isMandatory: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      // Remaining discretionary = 420m (7h). We attempt 540m (9h).
      plannedTasks: [
        { id: "t1", title: "Heavy Workload 1", durationMinutes: 300 },
        { id: "t2", title: "Heavy Workload 2", durationMinutes: 240 },
      ],
      forcePlanAnyway: true,
    });

    expect(report.isOverloaded).toBe(true);
    expect(report.forcedOverride).toBe(true);
    expect(report.overloadMinutes).toBe(120); // 540 - 420 = 120m
    expect(report.warningMessage).toBeDefined();
    expect(report.warningMessage).toContain("Overloaded by 120 min");
  });

  // 3. Cross-Midnight Commitment: 23:00 -> 01:00
  it("Time & Capacity Engine: Cross-midnight commitment 23:00 -> 01:00 correctly computes 120 minutes", () => {
    const startMinute = 23 * 60; // 1380 (11:00 PM)
    const endMinute = 1 * 60;    // 60 (01:00 AM)

    const duration = calculateDuration(startMinute, endMinute);
    expect(duration).toBe(120);

    const report = capacityEngine.evaluateCapacity({
      dayStartMinute: 360,
      dayCutoffMinute: 60,
      dailySleepHours: 7.0,
      commitments: [
        {
          id: "cross-midnight",
          userId: "u1",
          title: "Night Shift Work",
          type: "CUSTOM",
          startMinute,
          endMinute,
          durationMinutes: duration,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
          isMandatory: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      plannedTasks: [],
    });

    expect(report.commitmentMinutes).toBe(120);
    expect(report.discretionaryMinutes).toBe(1020 - 120); // 900 minutes
  });

  // 4. Dependency Depth 20: Depth 20 = PASS, Depth 21 = FAIL
  it("DAG Engine: Dependency Depth 20 passes, Depth 21 throws MaxDependencyDepthExceededError", () => {
    // Build a linear chain of 19 tasks: T1 -> T2 -> T3 -> ... -> T19
    const deps19: Array<{ taskId: string; dependsOnTaskId: string }> = [];
    for (let i = 2; i <= 19; i++) {
      deps19.push({ taskId: `T${i}`, dependsOnTaskId: `T${i - 1}` });
    }

    // Adding T20 depends on T19 gives depth 20: PASS
    expect(() => dagService.validateDependency("T20", "T19", deps19)).not.toThrow();

    const deps20 = [...deps19, { taskId: "T20", dependsOnTaskId: "T19" }];
    const depth20 = dagService.calculateDependencyDepth("T20", deps20);
    expect(depth20).toBe(20);

    // Adding T21 depends on T20 gives depth 21: FAIL (throws MaxDependencyDepthExceededError)
    expect(() => dagService.validateDependency("T21", "T20", deps20)).toThrow(
      MaxDependencyDepthExceededError
    );
  });
});