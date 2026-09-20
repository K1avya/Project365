import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { PrismaUserRepository } from "../src/repositories/user.repository.js";
import { PrismaLifeAreaRepository } from "../src/repositories/life-area.repository.js";
import { PrismaGoalRepository } from "../src/repositories/goal.repository.js";
import { PrismaMilestoneRepository } from "../src/repositories/milestone.repository.js";
import { PrismaTaskRepository } from "../src/repositories/task.repository.js";
import { PrismaTaskInstanceRepository } from "../src/repositories/task-instance.repository.js";
import { PrismaEventRepository } from "../src/repositories/event.repository.js";

describe("Step 3: Database-Backed Repository Persistence Tests", () => {
  let userRepo: PrismaUserRepository;
  let lifeAreaRepo: PrismaLifeAreaRepository;
  let goalRepo: PrismaGoalRepository;
  let milestoneRepo: PrismaMilestoneRepository;
  let taskRepo: PrismaTaskRepository;
  let instanceRepo: PrismaTaskInstanceRepository;
  let eventRepo: PrismaEventRepository;

  const testUserEmail = `test-repo-${Date.now()}@project365.local`;
  let testUserId: string;
  let testAreaId: string;

  beforeAll(async () => {
    userRepo = new PrismaUserRepository(prisma);
    lifeAreaRepo = new PrismaLifeAreaRepository(prisma);
    goalRepo = new PrismaGoalRepository(prisma);
    milestoneRepo = new PrismaMilestoneRepository(prisma);
    taskRepo = new PrismaTaskRepository(prisma);
    instanceRepo = new PrismaTaskInstanceRepository(prisma);
    eventRepo = new PrismaEventRepository(prisma);

    // Create a dedicated test user for repository isolation
    const user = await userRepo.create({
      email: testUserEmail,
      name: "Repo Test User",
    });
    testUserId = user.id;

    // Create a test Life Area
    const area = await lifeAreaRepo.create({
      userId: testUserId,
      type: "CAREER_CODING",
      name: "Career & Coding Testing",
      intensity: "NORMAL",
    });
    testAreaId = area.id;
  });

  afterAll(async () => {
    // Cascade delete test user (cleans up all related test data)
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe("GoalRepository Persistence", () => {
    let goalId: string;

    it("creates a Goal in PostgreSQL", async () => {
      const created = await goalRepo.create({
        userId: testUserId,
        areaId: testAreaId,
        title: "Crush System Design",
        description: "Scale distributed databases to 10M QPS",
        targetDate: new Date("2026-11-30"),
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("Crush System Design");
      expect(created.isCompleted).toBe(false);
      expect(created.isArchived).toBe(false);
      goalId = created.id;
    });

    it("reads a Goal by ID", async () => {
      const found = await goalRepo.findById(goalId);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(goalId);
      expect(found!.title).toBe("Crush System Design");
    });

    it("updates a Goal", async () => {
      const updated = await goalRepo.update(goalId, {
        title: "Crush High-Throughput System Design",
        isCompleted: true,
      });

      expect(updated.title).toBe("Crush High-Throughput System Design");
      expect(updated.isCompleted).toBe(true);
    });

    it("archives (soft-deletes) and restores a Goal", async () => {
      const archived = await goalRepo.archive(goalId);
      expect(archived.isArchived).toBe(true);

      const activeList = await goalRepo.findByUserId(testUserId, false);
      expect(activeList.some(g => g.id === goalId)).toBe(false);

      const allList = await goalRepo.findByUserId(testUserId, true);
      expect(allList.some(g => g.id === goalId)).toBe(true);

      const restored = await goalRepo.restore(goalId);
      expect(restored.isArchived).toBe(false);
    });

    it("deletes a Goal from PostgreSQL", async () => {
      const deleted = await goalRepo.delete(goalId);
      expect(deleted).toBe(true);

      const found = await goalRepo.findById(goalId);
      expect(found).toBeNull();
    });
  });

  describe("MilestoneRepository Persistence", () => {
    let parentGoalId: string;
    let milestoneId: string;

    beforeAll(async () => {
      const goal = await goalRepo.create({
        userId: testUserId,
        areaId: testAreaId,
        title: "Parent Goal for Milestones",
      });
      parentGoalId = goal.id;
    });

    it("creates and reads a Milestone", async () => {
      const created = await milestoneRepo.create({
        goalId: parentGoalId,
        title: "Milestone: Learn Sharding & Partitioning",
        orderIndex: 1,
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("Milestone: Learn Sharding & Partitioning");
      milestoneId = created.id;

      const found = await milestoneRepo.findById(milestoneId);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(milestoneId);
    });

    it("updates, archives, and deletes a Milestone", async () => {
      const updated = await milestoneRepo.update(milestoneId, {
        title: "Milestone: Consistent Hashing & Sharding",
      });
      expect(updated.title).toBe("Milestone: Consistent Hashing & Sharding");

      const archived = await milestoneRepo.archive(milestoneId);
      expect(archived.isArchived).toBe(true);

      const deleted = await milestoneRepo.delete(milestoneId);
      expect(deleted).toBe(true);
      expect(await milestoneRepo.findById(milestoneId)).toBeNull();
    });
  });

  describe("TaskRepository & Dependency Persistence", () => {
    let taskAId: string;
    let taskBId: string;

    it("creates Task Templates enforcing Rule 2 (no status attribute)", async () => {
      const tA = await taskRepo.create({
        userId: testUserId,
        areaId: testAreaId,
        title: "Study LSM Trees",
        durationMinutes: 60,
        energyRequired: "HIGH",
        priority: "HIGH",
        preferredMinute: 360, // 06:00 AM
      });

      const tB = await taskRepo.create({
        userId: testUserId,
        areaId: testAreaId,
        title: "Build RocksDB Clone",
        durationMinutes: 120,
        energyRequired: "HIGH",
        priority: "CRITICAL",
      });

      expect(tA.id).toBeDefined();
      expect(tB.id).toBeDefined();
      expect(tA.durationMinutes).toBe(60);
      expect(tB.durationMinutes).toBe(120);

      taskAId = tA.id;
      taskBId = tB.id;
    });

    it("adds and queries Task Dependencies", async () => {
      const dep = await taskRepo.addDependency(taskBId, taskAId);
      expect(dep.taskId).toBe(taskBId);
      expect(dep.dependsOnTaskId).toBe(taskAId);

      const deps = await taskRepo.getDependencies(testUserId);
      expect(deps.some(d => d.taskId === taskBId && d.dependsOnTaskId === taskAId)).toBe(true);

      const removed = await taskRepo.removeDependency(taskBId, taskAId);
      expect(removed).toBe(true);
    });
  });

  describe("TaskInstance & TaskEvent Persistence", () => {
    let taskId: string;
    let instanceId: string;

    beforeAll(async () => {
      const task = await taskRepo.create({
        userId: testUserId,
        areaId: testAreaId,
        title: "Instance Persistence Task",
        durationMinutes: 45,
      });
      taskId = task.id;
    });

    it("creates a TaskInstance for a specific Date", async () => {
      const today = new Date("2026-09-22T00:00:00Z");
      const instance = await instanceRepo.create({
        userId: testUserId,
        taskId,
        date: today,
        title: "Instance Persistence Task",
        priority: "MEDIUM",
        energyRequired: "MEDIUM",
        durationMinutes: 45,
        status: "PENDING",
      });

      expect(instance.id).toBeDefined();
      expect(instance.status).toBe("PENDING");
      instanceId = instance.id;
    });

    it("appends immutable TaskEvents and calculates paused duration", async () => {
      const tStart = new Date("2026-09-22T08:00:00Z");
      await eventRepo.append(instanceId, "STARTED", null, tStart);

      const tPause = new Date("2026-09-22T08:20:00Z");
      await eventRepo.append(instanceId, "PAUSED", null, tPause);

      const tResume = new Date("2026-09-22T08:30:00Z"); // 10 min pause = 600,000 ms
      await eventRepo.append(instanceId, "RESUMED", null, tResume);

      const tDone = new Date("2026-09-22T08:55:00Z");
      await eventRepo.append(instanceId, "COMPLETED", { notes: "Done perfectly" }, tDone);

      await instanceRepo.updateStatus(instanceId, "COMPLETED", 45, 600000);

      const events = await eventRepo.findByInstanceId(instanceId);
      expect(events.length).toBe(4);
      expect(events.map(e => e.eventType)).toEqual(["STARTED", "PAUSED", "RESUMED", "COMPLETED"]);

      const totalPaused = await eventRepo.calculateTotalPausedMs(instanceId);
      expect(totalPaused).toBe(10 * 60 * 1000);
    });
  });
});