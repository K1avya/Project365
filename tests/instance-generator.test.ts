import { describe, it, expect } from "vitest";
import { InstanceGenerator } from "../src/domain/tasks/instance-generator.js";
import type { Task } from "../src/domain/types.js";
import type { DependencyEdge } from "../src/domain/tasks/dag-service.js";

describe("Module 4: Instance Generator", () => {
  const generator = new InstanceGenerator();

  const makeTask = (id: string, overrides: Partial<Task> = {}): Task => ({
    id,
    userId: "user-1",
    areaId: "area-academic",
    milestoneId: null,
    title: `Task ${id}`,
    description: null,
    priority: "MEDIUM",
    energyRequired: "HIGH",
    durationMinutes: 60,
    preferredMinute: 540, // 09:00
    isDeepWork: true,
    recurrenceDays: [1, 2, 3, 4, 5], // Mon-Fri
    isArchived: false,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  });

  it("materializes tasks matching the target day of week", () => {
    // 2026-09-23 is a Wednesday (day 3)
    const wednesday = new Date("2026-09-23T10:00:00Z");

    const tMonWed = makeTask("t-mon-wed", { recurrenceDays: [1, 3] });
    const tTueThu = makeTask("t-tue-thu", { recurrenceDays: [2, 4] });

    const instances = generator.generateForDate({
      targetDate: wednesday,
      templates: [tMonWed, tTueThu],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
    });

    expect(instances.length).toBe(1);
    expect(instances[0].taskId).toBe("t-mon-wed");
    expect(instances[0].date).toEqual(wednesday);
    expect(instances[0].startMinute).toBe(540);
    expect(instances[0].endMinute).toBe(600);
    expect(instances[0].status).toBe("PENDING");
  });

  it("skips archived templates and paused life areas", () => {
    const monday = new Date("2026-09-21T10:00:00Z"); // Day 1

    const activeTask = makeTask("t-active", { areaId: "area-active", recurrenceDays: [1] });
    const archivedTask = makeTask("t-archived", { isArchived: true, recurrenceDays: [1] });
    const pausedAreaTask = makeTask("t-paused-area", { areaId: "area-paused", recurrenceDays: [1] });

    const instances = generator.generateForDate({
      targetDate: monday,
      templates: [activeTask, archivedTask, pausedAreaTask],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
      pausedAreaIds: new Set(["area-paused"]),
    });

    expect(instances.length).toBe(1);
    expect(instances[0].taskId).toBe("t-active");
  });

  it("assigns BLOCKED status to tasks whose prerequisites are incomplete", () => {
    const monday = new Date("2026-09-21T10:00:00Z");

    const tPrereq = makeTask("task-js", { recurrenceDays: [1] });
    const tDependent = makeTask("task-react", { recurrenceDays: [1] });

    const dependencies: DependencyEdge[] = [
      { taskId: "task-react", dependsOnTaskId: "task-js" },
    ];

    // Case 1: Prerequisite incomplete
    const instancesUnfinished = generator.generateForDate({
      targetDate: monday,
      templates: [tPrereq, tDependent],
      dependencies,
      completedHistoricalTaskIds: new Set(),
    });

    const reactUnfinished = instancesUnfinished.find(i => i.taskId === "task-react")!;
    const jsUnfinished = instancesUnfinished.find(i => i.taskId === "task-js")!;
    expect(jsUnfinished.status).toBe("PENDING");
    expect(reactUnfinished.status).toBe("BLOCKED");

    // Case 2: Prerequisite completed
    const instancesFinished = generator.generateForDate({
      targetDate: monday,
      templates: [tPrereq, tDependent],
      dependencies,
      completedHistoricalTaskIds: new Set(["task-js"]),
    });

    const reactFinished = instancesFinished.find(i => i.taskId === "task-react")!;
    expect(reactFinished.status).toBe("PENDING");
  });
});
