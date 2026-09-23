import { describe, it, expect, beforeEach } from "vitest";
import { TaskService } from "../src/domain/tasks/task-service.js";

describe("Module 2: Task Service", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService();
  });

  it("creates a task template and strictly adheres to Rule 2 (no status attribute)", () => {
    const task = service.createTask({
      userId: "user-1",
      areaId: "area-career",
      title: "Deep Learning with PyTorch",
      durationMinutes: 120,
      energyRequired: "HIGH",
      priority: "CRITICAL",
      preferredMinute: 1290, // 21:30
      isDeepWork: true,
      recurrenceDays: [1, 2, 3, 4, 5],
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("Deep Learning with PyTorch");
    expect(task.durationMinutes).toBe(120);
    expect(task.energyRequired).toBe("HIGH");
    expect(task.priority).toBe("CRITICAL");
    expect(task.isArchived).toBe(false);

    // CRITICAL RULE 2 CHECK: Template must NOT have a status property
    expect((task as unknown as Record<string, unknown>).status).toBeUndefined();
    expect("status" in task).toBe(false);
  });

  it("validates mandatory fields and bounds", () => {
    expect(() =>
      service.createTask({
        userId: "user-1",
        areaId: "area-1",
        title: "",
        durationMinutes: 60,
      })
    ).toThrow("Task title cannot be empty");

    expect(() =>
      service.createTask({
        userId: "user-1",
        areaId: "area-1",
        title: "Valid Title",
        durationMinutes: 0,
      })
    ).toThrow("Task duration must be a positive integer");

    expect(() =>
      service.createTask({
        userId: "user-1",
        areaId: "area-1",
        title: "Valid Title",
        durationMinutes: 60,
        preferredMinute: 1500, // Invalid: > 1439
      })
    ).toThrow("Preferred minute must be between 0 and 1439");
  });

  it("updates, archives, restores, and duplicates templates", () => {
    const task = service.createTask({
      userId: "user-1",
      areaId: "area-academic",
      title: "Operating Systems Revision",
      durationMinutes: 90,
    });

    // Update
    const updated = service.updateTask(task.id, {
      title: "OS Virtual Memory Deep Dive",
      durationMinutes: 105,
    });
    expect(updated.title).toBe("OS Virtual Memory Deep Dive");
    expect(updated.durationMinutes).toBe(105);

    // Archive
    const archived = service.archiveTask(task.id);
    expect(archived.isArchived).toBe(true);
    expect(service.listTasksByUser("user-1", false).length).toBe(0);
    expect(service.listTasksByUser("user-1", true).length).toBe(1);

    // Restore
    const restored = service.restoreTask(task.id);
    expect(restored.isArchived).toBe(false);
    expect(service.listTasksByUser("user-1", false).length).toBe(1);

    // Duplicate
    const copy = service.duplicateTask(task.id, " [Sprint 2]");
    expect(copy.id).not.toBe(task.id);
    expect(copy.title).toBe("OS Virtual Memory Deep Dive [Sprint 2]");
    expect(copy.durationMinutes).toBe(105);
    expect(copy.isArchived).toBe(false);
  });
});
