import { describe, it, expect, beforeEach } from "vitest";
import { TaskService } from "../src/domain/tasks/task-service.js";
import { DAGService, type DependencyEdge } from "../src/domain/tasks/dag-service.js";
import { InstanceGenerator } from "../src/domain/tasks/instance-generator.js";
import { EventLogger } from "../src/domain/events/event-logger.js";
import type { Goal, Milestone } from "../src/domain/types.js";

describe("Integration Test Layer: Multi-Module Domain Scenarios", () => {
  let taskService: TaskService;
  let dagService: DAGService;
  let instanceGenerator: InstanceGenerator;
  let eventLogger: EventLogger;

  beforeEach(() => {
    taskService = new TaskService();
    dagService = new DAGService();
    instanceGenerator = new InstanceGenerator(dagService);
    eventLogger = new EventLogger();
  });

  describe("Scenario 1: Goal -> Milestone -> Task -> Dependency -> Instance -> Event", () => {
    it("flows from high-level goal down to event-logged task execution and unblocking", () => {
      const userId = "user-sih";
      const areaId = "area-career";

      // 1. High-level Goal
      const goal: Goal = {
        id: "goal-ai-internship",
        userId,
        areaId,
        title: "Get AI Engineer Internship",
        isCompleted: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 2. Milestone under Goal
      const milestone: Milestone = {
        id: "milestone-pytorch",
        goalId: goal.id,
        title: "Master PyTorch Architecture",
        orderIndex: 1,
        isCompleted: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Create Task Template attached to Milestone
      const taskTensors = taskService.createTask({
        userId,
        areaId,
        milestoneId: milestone.id,
        title: "PyTorch Tensors & Autograd",
        durationMinutes: 90,
        recurrenceDays: [1], // Monday
      });

      const taskModels = taskService.createTask({
        userId,
        areaId,
        milestoneId: milestone.id,
        title: "Build Custom Attention Layer",
        durationMinutes: 120,
        recurrenceDays: [1], // Monday
      });

      // 4. Create Dependency: Attention Layer depends on Tensors
      dagService.validateDependency(taskModels.id, taskTensors.id, []);
      const dependencies: DependencyEdge[] = [
        { taskId: taskModels.id, dependsOnTaskId: taskTensors.id },
      ];

      // 5. Generate daily instances for Monday (2026-09-21)
      const monday = new Date("2026-09-21T10:00:00Z");
      const instances = instanceGenerator.generateForDate({
        targetDate: monday,
        templates: [taskTensors, taskModels],
        dependencies,
        completedHistoricalTaskIds: new Set(),
      });

      const instTensors = instances.find(i => i.taskId === taskTensors.id)!;
      const instModels = instances.find(i => i.taskId === taskModels.id)!;

      // Assert initial states
      expect(instTensors.status).toBe("PENDING");
      expect(instModels.status).toBe("BLOCKED");

      // 6. Log Events for instTensors: Start -> Complete
      const evStart = eventLogger.log({
        taskInstanceId: instTensors.id,
        eventType: "STARTED",
        timestamp: new Date("2026-09-21T06:00:00Z"),
      });
      instTensors.status = eventLogger.validateTransition(instTensors.status, evStart.eventType);
      expect(instTensors.status).toBe("ACTIVE");

      const evDone = eventLogger.log({
        taskInstanceId: instTensors.id,
        eventType: "COMPLETED",
        payload: { actualMinutes: 90 },
        timestamp: new Date("2026-09-21T07:30:00Z"),
      });
      instTensors.status = eventLogger.validateTransition(instTensors.status, evDone.eventType);
      expect(instTensors.status).toBe("COMPLETED");

      // 7. Re-evaluate dependency: with taskTensors completed, taskModels unblocks!
      const completedSet = new Set([taskTensors.id]);
      const unblockedStatus = dagService.resolveTaskStatus(
        taskModels.id,
        [taskTensors.id],
        completedSet
      );
      expect(unblockedStatus).toBe("PENDING");
    });
  });

  describe("Scenario 2: Chain of 3 Tasks (A -> B -> C)", () => {
    it("progressively unlocks dependent tasks as upstream tasks complete", () => {
      const taskA = taskService.createTask({
        userId: "u1",
        areaId: "a1",
        title: "Task A: Foundations",
        durationMinutes: 60,
        recurrenceDays: [1],
      });
      const taskB = taskService.createTask({
        userId: "u1",
        areaId: "a1",
        title: "Task B: Intermediate",
        durationMinutes: 60,
        recurrenceDays: [1],
      });
      const taskC = taskService.createTask({
        userId: "u1",
        areaId: "a1",
        title: "Task C: Advanced",
        durationMinutes: 60,
        recurrenceDays: [1],
      });

      // Dependencies: B depends on A; C depends on B
      const edges: DependencyEdge[] = [
        { taskId: taskB.id, dependsOnTaskId: taskA.id },
        { taskId: taskC.id, dependsOnTaskId: taskB.id },
      ];

      // Initial state: nothing completed
      const completedTasks = new Set<string>();
      expect(dagService.resolveTaskStatus(taskA.id, [], completedTasks)).toBe("PENDING");
      expect(dagService.resolveTaskStatus(taskB.id, [taskA.id], completedTasks)).toBe("BLOCKED");
      expect(dagService.resolveTaskStatus(taskC.id, [taskB.id], completedTasks)).toBe("BLOCKED");

      // Complete Task A
      completedTasks.add(taskA.id);

      // Verify: Task B becomes PENDING, but Task C remains BLOCKED
      const statusBAfterA = dagService.resolveTaskStatus(taskB.id, [taskA.id], completedTasks);
      const statusCAfterA = dagService.resolveTaskStatus(taskC.id, [taskB.id], completedTasks);
      expect(statusBAfterA).toBe("PENDING");
      expect(statusCAfterA).toBe("BLOCKED");

      // Complete Task B
      completedTasks.add(taskB.id);

      // Verify: Task C becomes PENDING
      const statusCAfterB = dagService.resolveTaskStatus(taskC.id, [taskB.id], completedTasks);
      expect(statusCAfterB).toBe("PENDING");
    });
  });

  describe("Scenario 3: Pause -> Resume -> Pause -> Resume -> Complete", () => {
    it("accurately tracks multiple pause cycles and verifies total pause duration", () => {
      const task = taskService.createTask({
        userId: "u1",
        areaId: "a1",
        title: "Deep Focus Session",
        durationMinutes: 120,
        recurrenceDays: [1],
      });

      const monday = new Date("2026-09-21T10:00:00Z");
      const instances = instanceGenerator.generateForDate({
        targetDate: monday,
        templates: [task],
        dependencies: [],
        completedHistoricalTaskIds: new Set(),
      });
      const inst = instances[0];

      // Step 1: Start @ 10:00 AM
      const t0 = new Date("2026-09-21T10:00:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "STARTED", timestamp: t0 });
      inst.status = eventLogger.validateTransition(inst.status, "STARTED");
      expect(inst.status).toBe("ACTIVE");

      // Step 2: Pause 1 @ 10:15 AM
      const t1 = new Date("2026-09-21T10:15:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "PAUSED", timestamp: t1 });
      inst.status = eventLogger.validateTransition(inst.status, "PAUSED");
      expect(inst.status).toBe("PAUSED");

      // Step 3: Resume 1 @ 10:22 AM (7 minutes paused = 420,000 ms)
      const t2 = new Date("2026-09-21T10:22:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "RESUMED", timestamp: t2 });
      inst.status = eventLogger.validateTransition(inst.status, "RESUMED");
      expect(inst.status).toBe("ACTIVE");

      // Step 4: Pause 2 @ 10:50 AM
      const t3 = new Date("2026-09-21T10:50:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "PAUSED", timestamp: t3 });
      inst.status = eventLogger.validateTransition(inst.status, "PAUSED");
      expect(inst.status).toBe("PAUSED");

      // Step 5: Resume 2 @ 11:03 AM (13 minutes paused = 780,000 ms)
      const t4 = new Date("2026-09-21T11:03:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "RESUMED", timestamp: t4 });
      inst.status = eventLogger.validateTransition(inst.status, "RESUMED");
      expect(inst.status).toBe("ACTIVE");

      // Step 6: Complete @ 12:20 PM
      const t5 = new Date("2026-09-21T12:20:00Z");
      eventLogger.log({ taskInstanceId: inst.id, eventType: "COMPLETED", timestamp: t5 });
      inst.status = eventLogger.validateTransition(inst.status, "COMPLETED");
      expect(inst.status).toBe("COMPLETED");

      // Expected total pause = 7 min + 13 min = 20 min = 1,200,000 ms
      const totalPausedMs = eventLogger.calculateTotalPausedMs(inst.id);
      expect(totalPausedMs).toBe(20 * 60 * 1000);
      expect(eventLogger.getEventsForInstance(inst.id).length).toBe(6);
    });
  });
});
