import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GoalApplicationService } from "../src/services/goal-app.service.js";
import { MilestoneApplicationService } from "../src/services/milestone-app.service.js";
import { TaskApplicationService } from "../src/services/task-app.service.js";
import { TaskInstanceApplicationService } from "../src/services/task-instance-app.service.js";
import { CapacityApplicationService } from "../src/services/capacity-app.service.js";

const prisma = new PrismaClient();
const goalService = new GoalApplicationService(prisma);
const milestoneService = new MilestoneApplicationService(prisma);
const taskService = new TaskApplicationService(prisma);
const instanceService = new TaskInstanceApplicationService(prisma);
const capacityService = new CapacityApplicationService(prisma);

describe("MVP End-to-End Execution Flow via Application Service Layer", () => {
  let actorUserId: string;
  let lifeAreaId: string;

  beforeAll(async () => {
    // 1. Setup isolated test user
    const user = await prisma.user.create({
      data: {
        email: `mvp-e2e-${Date.now()}@project365.local`,
        name: "MVP User",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0, // 17h awake = 1020m
      },
    });
    actorUserId = user.id;

    // 2. Setup fixed commitments (College 09:00-15:00 = 360m, Commute 07:00-09:00 = 120m, Return 15:00-16:30 = 90m, Dinner = 30m)
    // Total commitments = 600m (10 hours). Available discretionary = 1020 - 600 = 420m (7 hours).
    const todayDayOfWeek = new Date().getDay();
    await prisma.commitment.createMany({
      data: [
        {
          userId: actorUserId,
          title: "College Lectures",
          type: "COLLEGE",
          startMinute: 540,
          endMinute: 900,
          durationMinutes: 360,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          userId: actorUserId,
          title: "Bus Commute",
          type: "COMMUTE",
          startMinute: 420,
          endMinute: 540,
          durationMinutes: 120,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          userId: actorUserId,
          title: "Evening Bus Return",
          type: "COMMUTE",
          startMinute: 900,
          endMinute: 990,
          durationMinutes: 90,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          userId: actorUserId,
          title: "Dinner & Family",
          type: "ROUTINE_MEALS",
          startMinute: 1200,
          endMinute: 1230,
          durationMinutes: 30,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
    });

    const area = await prisma.lifeArea.create({
      data: {
        userId: actorUserId,
        type: "STARTUP",
        name: "Project365 MVP",
        color: "#8b5cf6",
      },
    });
    lifeAreaId = area.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: actorUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("Executes the complete lifecycle: Goal -> Milestone -> Task -> Instances -> Capacity -> Start -> Complete -> Unblock", async () => {
    // 1. Create Goal
    const goal = await goalService.createGoal(actorUserId, {
      areaId: lifeAreaId,
      title: "Launch Project365 Production MVP",
      description: "Deliver high-reliability execution OS.",
      targetDate: "2026-12-31",
    });
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe("Launch Project365 Production MVP");

    // 2. Create Milestone
    const milestone = await milestoneService.createMilestone(actorUserId, {
      goalId: goal.id,
      title: "Core Execution Layer",
      orderIndex: 1,
    });
    expect(milestone.id).toBeDefined();

    // 3. Create 2 Tasks with Dependency: Task 1 (Prerequisite) -> Task 2 (Dependent)
    const todayDayOfWeek = new Date().getDay();
    const task1 = await taskService.createTask(actorUserId, {
      areaId: lifeAreaId,
      milestoneId: milestone.id,
      title: "Task 1: System Architecture Specification",
      durationMinutes: 90,
      priority: "HIGH",
      energyRequired: "HIGH",
      recurrenceDays: [todayDayOfWeek],
    });

    const task2 = await taskService.createTask(actorUserId, {
      areaId: lifeAreaId,
      milestoneId: milestone.id,
      title: "Task 2: Core Service Implementation",
      durationMinutes: 90,
      priority: "CRITICAL",
      energyRequired: "HIGH",
      recurrenceDays: [todayDayOfWeek],
      dependsOnTaskIds: [task1.id],
    });

    expect(task1.id).toBeDefined();
    expect(task2.id).toBeDefined();

    // 4. Generate Daily Instances
    const instances = await instanceService.getTodayInstances(actorUserId);
    expect(instances.length).toBe(2);

    const inst1 = instances.find(i => i.taskId === task1.id)!;
    const inst2 = instances.find(i => i.taskId === task2.id)!;

    expect(inst1).toBeDefined();
    expect(inst2).toBeDefined();

    // Task 1 has no prerequisites -> PENDING
    expect(inst1.status).toBe("PENDING");
    // Task 2 depends on Task 1 -> BLOCKED
    expect(inst2.status).toBe("BLOCKED");
    expect(inst2.prerequisites?.length).toBe(1);
    expect(inst2.prerequisites![0].isCompleted).toBe(false);

    // 5. Verify Remaining Capacity Endpoint
    // Gross awake: 1020m (17h). Commitments: 600m (10h). Available: 420m (7h).
    // Planned tasks: 90 + 90 = 180m (3h).
    // Remaining: 420 - 180 = 240m (4h).
    const capacity = await capacityService.getRemainingCapacity(actorUserId);
    expect(capacity.commitmentMinutes).toBe(600);
    expect(capacity.availableMinutes).toBe(420);
    expect(capacity.plannedMinutes).toBe(180);
    expect(capacity.remainingMinutes).toBe(240);
    expect(capacity.remainingHours).toBe(4);

    // 6. Start Task 1
    const started = await instanceService.updateStatus(actorUserId, inst1.id, {
      status: "ACTIVE",
    });
    expect(started.status).toBe("ACTIVE");

    const eventsAfterStart = await instanceService.getEventsForInstance(actorUserId, inst1.id);
    expect(eventsAfterStart.some(e => e.eventType === "STARTED")).toBe(true);

    // 7. Complete Task 1 (Actual 90 minutes)
    const completed = await instanceService.updateStatus(actorUserId, inst1.id, {
      status: "COMPLETED",
      actualMinutes: 90,
    });
    expect(completed.status).toBe("COMPLETED");

    const eventsAfterComplete = await instanceService.getEventsForInstance(actorUserId, inst1.id);
    expect(eventsAfterComplete.some(e => e.eventType === "COMPLETED")).toBe(true);

    // 8. Verify Downstream Dependency Automatically Unlocked!
    const refreshedInstances = await instanceService.getTodayInstances(actorUserId);
    const refreshedInst2 = refreshedInstances.find(i => i.taskId === task2.id)!;
    expect(refreshedInst2.status).toBe("PENDING"); // Unblocked!
    expect(refreshedInst2.prerequisites![0].isCompleted).toBe(true);
  });
});