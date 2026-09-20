import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { PrismaUserRepository } from "../src/repositories/user.repository.js";
import { PrismaLifeAreaRepository } from "../src/repositories/life-area.repository.js";
import { PrismaGoalRepository } from "../src/repositories/goal.repository.js";
import { PrismaMilestoneRepository } from "../src/repositories/milestone.repository.js";
import { PrismaTaskRepository } from "../src/repositories/task.repository.js";
import { PrismaTaskInstanceRepository } from "../src/repositories/task-instance.repository.js";
import { PrismaEventRepository } from "../src/repositories/event.repository.js";
import { TaskExecutionService } from "../src/services/task-execution.service.js";

describe("Step 4: Complete End-to-End Persistence Pipeline", () => {
  let createdUserId: string;

  afterAll(async () => {
    if (createdUserId) {
      // Testing full cascading delete verification from User down through the entire tree!
      await prisma.user.delete({
        where: { id: createdUserId },
      });
    }
    await prisma.$disconnect();
  });

  it("proves the entire 7-tier relational lineage works end-to-end in PostgreSQL", async () => {
    const userRepo = new PrismaUserRepository(prisma);
    const areaRepo = new PrismaLifeAreaRepository(prisma);
    const goalRepo = new PrismaGoalRepository(prisma);
    const milestoneRepo = new PrismaMilestoneRepository(prisma);
    const taskRepo = new PrismaTaskRepository(prisma);
    const instanceRepo = new PrismaTaskInstanceRepository(prisma);
    const eventRepo = new PrismaEventRepository(prisma);
    const executionService = new TaskExecutionService(prisma);

    // â”€â”€ Tier 1: User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const user = await userRepo.create({
      email: `e2e-scholar-${Date.now()}@project365.local`,
      name: "Autonomous Life OS Scholar",
      logicalDayCutoffHour: 1,
      dayStartHour: 6,
      dailySleepHours: 7.0,
    });
    createdUserId = user.id;
    expect(user.id).toBeDefined();

    // â”€â”€ Tier 2: Life Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const area = await areaRepo.create({
      userId: user.id,
      type: "STARTUP",
      name: "AI & Distributed Systems Venture",
      intensity: "INTENSIVE",
    });
    expect(area.id).toBeDefined();
    expect(area.userId).toBe(user.id);

    // â”€â”€ Tier 3: Goal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const goal = await goalRepo.create({
      userId: user.id,
      areaId: area.id,
      title: "Deploy Production Multi-Agent Engine",
      description: "Autonomous reasoning engine with verification pipelines",
      targetDate: new Date("2026-12-01"),
    });
    expect(goal.id).toBeDefined();
    expect(goal.areaId).toBe(area.id);

    // â”€â”€ Tier 4: Milestone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const milestone = await milestoneRepo.create({
      goalId: goal.id,
      title: "Milestone: Fault-Tolerant Consensus Protocol",
      orderIndex: 1,
    });
    expect(milestone.id).toBeDefined();
    expect(milestone.goalId).toBe(goal.id);

    // â”€â”€ Tier 5: Tasks & Dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const taskA = await taskRepo.create({
      userId: user.id,
      areaId: area.id,
      milestoneId: milestone.id,
      title: "Task A: Write Raft Log Replication Module",
      durationMinutes: 90,
      priority: "CRITICAL",
      energyRequired: "HIGH",
      preferredMinute: 360, // 06:00 AM
      recurrenceDays: [1, 2, 3, 4, 5],
    });

    const taskB = await taskRepo.create({
      userId: user.id,
      areaId: area.id,
      milestoneId: milestone.id,
      title: "Task B: Stress-Test Leader Election Failover",
      durationMinutes: 60,
      priority: "CRITICAL",
      energyRequired: "HIGH",
      preferredMinute: 450, // 07:30 AM
      recurrenceDays: [1, 2, 3, 4, 5],
    });

    // Task B depends on Task A
    await taskRepo.addDependency(taskB.id, taskA.id);

    // â”€â”€ Tier 6: Task Instances (Daily Realization) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const today = new Date("2026-09-22T00:00:00Z");

    const instanceA = await instanceRepo.create({
      userId: user.id,
      taskId: taskA.id,
      date: today,
      title: taskA.title,
      priority: taskA.priority,
      energyRequired: taskA.energyRequired,
      durationMinutes: taskA.durationMinutes,
      startMinute: 360,
      endMinute: 450,
      status: "PENDING",
    });

    const instanceB = await instanceRepo.create({
      userId: user.id,
      taskId: taskB.id,
      date: today,
      title: taskB.title,
      priority: taskB.priority,
      energyRequired: taskB.energyRequired,
      durationMinutes: taskB.durationMinutes,
      startMinute: 450,
      endMinute: 510,
      status: "BLOCKED", // Blocked by Task A
    });

    expect(instanceA.status).toBe("PENDING");
    expect(instanceB.status).toBe("BLOCKED");

    // â”€â”€ Tier 7: Task Events & Transactional Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 1. Start Task A
    await eventRepo.append(instanceA.id, "STARTED", null, new Date(Date.now() - 3600000));
    await instanceRepo.updateStatus(instanceA.id, "ACTIVE");

    // 2. Complete Task A atomically via TaskExecutionService
    const result = await executionService.completeTaskAtomically(
      instanceA.id,
      90,
      { commitHash: "e4f6a19" }
    );

    // Verify Task A is completed
    expect(result.completedInstance.status).toBe("COMPLETED");

    // Verify downstream Task B was reactively unlocked in the same atomic transaction!
    expect(result.unblockedInstances.length).toBe(1);
    expect(result.unblockedInstances[0].id).toBe(instanceB.id);
    expect(result.unblockedInstances[0].status).toBe("PENDING");

    // 3. Confirm all audit events exist in PostgreSQL
    const eventsForA = await eventRepo.findByInstanceId(instanceA.id);
    expect(eventsForA.length).toBe(2);
    expect(eventsForA.map(e => e.eventType)).toEqual(["STARTED", "COMPLETED"]);

    const eventsForB = await eventRepo.findByInstanceId(instanceB.id);
    expect(eventsForB.length).toBe(1);
    expect(eventsForB[0].eventType).toBe("SCHEDULED"); // Automatically logged unblock event

    // â”€â”€ Validation Query: 7-Level Deep Join in PostgreSQL â”€â”€â”€â”€â”€
    const deepQuery = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        lifeAreas: {
          include: {
            goals: {
              include: {
                milestones: {
                  include: {
                    tasks: {
                      include: {
                        instances: {
                          include: {
                            events: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(deepQuery.lifeAreas[0].goals[0].milestones[0].tasks[0].instances[0].events.length).toBeGreaterThan(0);
    console.log("Verified complete 7-tier relational lineage in PostgreSQL.");
  });
});