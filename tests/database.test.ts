import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { PrismaTaskRepository } from "../src/repositories/task.repository.js";
import { PrismaLifeAreaRepository } from "../src/repositories/life-area.repository.js";
import { GoalService } from "../src/services/goal.service.js";
import { TaskExecutionService } from "../src/services/task-execution.service.js";
import { CapacityEngine } from "../src/domain/capacity/capacity-engine.js";

describe("Live PostgreSQL Database Integration Gate", () => {
  let userId: string;
  let academicAreaId: string;
  let careerAreaId: string;
  let taskRepo: PrismaTaskRepository;
  let lifeAreaRepo: PrismaLifeAreaRepository;
  let goalService: GoalService;
  let executionService: TaskExecutionService;

  beforeAll(async () => {
    // 1. Create Isolated Test User
    const user = await prisma.user.create({
      data: {
        email: `db-test-${Date.now()}@project365.local`,
        name: "DB Test User",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    userId = user.id;

    // 2. Create Life Areas for isolated test user
    lifeAreaRepo = new PrismaLifeAreaRepository(prisma);
    const academicArea = await lifeAreaRepo.create({
      userId,
      type: "ACADEMIC",
      name: "Academic & College",
      color: "#3b82f6",
    });
    const careerArea = await lifeAreaRepo.create({
      userId,
      type: "STARTUP",
      name: "Startup & Innovation",
      color: "#8b5cf6",
    });
    academicAreaId = academicArea.id;
    careerAreaId = careerArea.id;

    taskRepo = new PrismaTaskRepository(prisma);
    goalService = new GoalService(prisma);
    executionService = new TaskExecutionService(prisma);
  });

  afterAll(async () => {
    // Clean up isolated test user and all linked child records
    await prisma.taskEvent.deleteMany({
      where: { instance: { userId } },
    });
    await prisma.taskInstance.deleteMany({
      where: { userId },
    });
    await prisma.taskDependency.deleteMany({
      where: { task: { userId } },
    });
    await prisma.task.deleteMany({
      where: { userId },
    });
    await prisma.milestone.deleteMany({
      where: { goal: { userId } },
    });
    await prisma.goal.deleteMany({
      where: { userId },
    });
    await prisma.commitment.deleteMany({
      where: { userId },
    });
    await prisma.lifeArea.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
    await prisma.$disconnect();
  });

  it("atomically creates a Goal with Milestones using GoalService (prisma.$transaction)", async () => {
    const result = await goalService.createGoalWithMilestones(userId, {
      areaId: careerAreaId,
      title: "Master Distributed Systems",
      targetDate: "2026-12-31",
      milestones: [
        { title: "Consensus Algorithms (Raft & Paxos)", orderIndex: 1 },
        { title: "Vector Clocks & DynamoDB Architecture", orderIndex: 2 },
      ],
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Master Distributed Systems");
    expect(result.milestones.length).toBe(2);
    expect(result.milestones[0].title).toBe("Consensus Algorithms (Raft & Paxos)");

    // Query directly from DB to verify transaction persistence
    const dbGoal = await prisma.goal.findUnique({
      where: { id: result.id },
      include: { milestones: true },
    });
    expect(dbGoal).not.toBeNull();
    expect(dbGoal!.milestones.length).toBe(2);
  });

  it("creates Task templates and manages dependencies via PrismaTaskRepository", async () => {
    const taskA = await taskRepo.create({
      userId,
      areaId: careerAreaId,
      title: "Raft Paper Reading",
      durationMinutes: 90,
      priority: "HIGH",
      energyRequired: "HIGH",
      recurrenceDays: [1, 3, 5],
    });

    const taskB = await taskRepo.create({
      userId,
      areaId: careerAreaId,
      title: "Implement Raft Leader Election",
      durationMinutes: 120,
      priority: "CRITICAL",
      energyRequired: "HIGH",
      recurrenceDays: [1, 3, 5],
    });

    // Add dependency: Task B depends on Task A
    const dep = await taskRepo.addDependency(taskB.id, taskA.id);
    expect(dep.taskId).toBe(taskB.id);
    expect(dep.dependsOnTaskId).toBe(taskA.id);

    // Self-dependency should be rejected
    await expect(taskRepo.addDependency(taskA.id, taskA.id)).rejects.toThrow(
      "A task cannot depend on itself"
    );
  });

  it("atomically completes a TaskInstance, records TaskEvent, and unlocks downstream tasks", async () => {
    const today = new Date("2026-09-21T00:00:00Z");

    const tPrereq = await taskRepo.create({
      userId,
      areaId: academicAreaId,
      title: "Compiler Design Syntax Tree",
      durationMinutes: 60,
      recurrenceDays: [1],
    });

    const tDependent = await taskRepo.create({
      userId,
      areaId: academicAreaId,
      title: "Parser Generator Execution",
      durationMinutes: 90,
      recurrenceDays: [1],
    });

    await taskRepo.addDependency(tDependent.id, tPrereq.id);

    // Create Daily TaskInstances: Prereq is PENDING, Dependent is BLOCKED
    const instPrereq = await prisma.taskInstance.create({
      data: {
        userId,
        taskId: tPrereq.id,
        date: today,
        title: tPrereq.title,
        priority: "HIGH",
        energyRequired: "HIGH",
        durationMinutes: 60,
        status: "PENDING",
      },
    });

    const instDependent = await prisma.taskInstance.create({
      data: {
        userId,
        taskId: tDependent.id,
        date: today,
        title: tDependent.title,
        priority: "CRITICAL",
        energyRequired: "HIGH",
        durationMinutes: 90,
        status: "BLOCKED",
      },
    });

    // Complete the prerequisite instance atomically via TaskExecutionService
    const executionResult = await executionService.completeTaskAtomically(
      instPrereq.id,
      60,
      { notes: "AST completed with 100% test pass." }
    );

    expect(executionResult.completedInstance.status).toBe("COMPLETED");
    expect(executionResult.completedInstance.actualMinutes).toBe(60);

    // Verify dependent task was automatically unblocked!
    expect(executionResult.unblockedInstances.length).toBe(1);
    expect(executionResult.unblockedInstances[0].id).toBe(instDependent.id);
    expect(executionResult.unblockedInstances[0].status).toBe("PENDING");

    // Verify immutable event audit log exists in DB
    const events = await prisma.taskEvent.findMany({
      where: { taskInstanceId: instPrereq.id },
    });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("COMPLETED");
  });

  it("calculates capacity around the seeded College commitment via CapacityEngine", async () => {
    let commitments = await prisma.commitment.findMany({
      where: { userId, type: "COLLEGE", isActive: true },
    });
    if (commitments.length === 0) {
      const created = await prisma.commitment.create({
        data: {
          userId,
          title: "College Lectures",
          type: "COLLEGE",
          startMinute: 540,
          endMinute: 900,
          durationMinutes: 360,
          recurrenceDays: [1, 2, 3, 4, 5],
        },
      });
      commitments = [created];
    }
    expect(commitments.length).toBeGreaterThan(0);

    const engine = new CapacityEngine();
    const capacity = engine.calculateDailyCapacity({
      dayStartMinute: 360,
      dayCutoffMinute: 60,
      dailySleepHours: 7.0,
      commitments: commitments.map(c => ({
        ...c,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      plannedTasks: [
        { title: "Raft Reading", durationMinutes: 90 },
        { title: "Attention Layer", durationMinutes: 120 },
      ],
    });

    expect(capacity.committedMinutes).toBe(360); // 6 hours seeded college
    expect(capacity.netAvailableHours).toBe(11.0); // 17h waking (minus sleep surplus) - 6h college
    expect(capacity.plannedHours).toBe(3.5);
    expect(capacity.isOverloaded).toBe(false);
  });
});