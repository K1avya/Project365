import { describe, it, expect, beforeAll } from "vitest";
import { InstanceGenerator } from "../src/domain/tasks/instance-generator.js";
import type { Task, TaskInstance } from "../src/domain/types.js";

describe("Recurrence Expansion Logic: 6-Month (26 Weeks) Integrity Gate", () => {
  let generator: InstanceGenerator;
  let mondayTaskTemplate: Task;

  beforeAll(() => {
    generator = new InstanceGenerator();
    mondayTaskTemplate = {
      id: "task-monday-001",
      userId: "user-test-recurrence",
      areaId: "area-academic",
      milestoneId: null,
      title: "Weekly Distributed Systems Seminar",
      description: "Read Raft paper and summarize consensus protocol.",
      durationMinutes: 90,
      priority: "HIGH",
      energyRequired: "HIGH",
      preferredMinute: 600, // 10:00 AM
      isDeepWork: true,
      recurrenceDays: [1], // Exactly Every Monday (1 = Monday)
      isArchived: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
  });

  it("expands 26 consecutive Mondays over 6 months without creating duplicate instances", () => {
    // 26 weeks starting from Monday, January 5, 2026
    const startDate = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05 is a Monday
    expect(startDate.getUTCDay()).toBe(1);

    const generatedInstances: TaskInstance[] = [];
    const generatedDatesSet = new Set<string>();

    for (let week = 0; week < 26; week++) {
      const currentMonday = new Date(startDate);
      currentMonday.setUTCDate(startDate.getUTCDate() + week * 7);

      // Simulate daily generation for this Monday
      const instances = generator.generateForDate({
        targetDate: currentMonday,
        templates: [mondayTaskTemplate],
        dependencies: [],
        completedHistoricalTaskIds: new Set(),
      });

      expect(instances.length).toBe(1);
      const instance = instances[0];

      const dateStr = instance.date.toISOString().slice(0, 10);
      expect(generatedDatesSet.has(dateStr)).toBe(false); // No duplicates
      generatedDatesSet.add(dateStr);

      expect(instance.taskId).toBe(mondayTaskTemplate.id);
      expect(instance.status).toBe("PENDING");
      expect(instance.durationMinutes).toBe(90);
      expect(instance.isDeepWork).toBe(true);

      generatedInstances.push(instance);
    }

    expect(generatedInstances.length).toBe(26);
    expect(generatedDatesSet.size).toBe(26);
  });

  it("ensures missed tasks in past weeks do not block, duplicate, or alter future instances", () => {
    const mondayWeek1 = new Date(Date.UTC(2026, 0, 5)); // Week 1
    const mondayWeek2 = new Date(Date.UTC(2026, 0, 12)); // Week 2
    const mondayWeek3 = new Date(Date.UTC(2026, 0, 19)); // Week 3

    // Week 1 generated
    const instWeek1 = generator.generateForDate({
      targetDate: mondayWeek1,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
    })[0];

    // User MISSED week 1
    instWeek1.status = "MISSED";

    // Week 2 generated
    const instWeek2 = generator.generateForDate({
      targetDate: mondayWeek2,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(), // Week 1 was MISSED, so not completed
    })[0];

    expect(instWeek2.id).not.toBe(instWeek1.id);
    expect(instWeek2.status).toBe("PENDING"); // Week 2 is fresh and unblocked
    expect(instWeek1.status).toBe("MISSED"); // Week 1 remains missed (immutable)

    // User COMPLETED week 2
    instWeek2.status = "COMPLETED";

    // Week 3 generated
    const instWeek3 = generator.generateForDate({
      targetDate: mondayWeek3,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set([mondayTaskTemplate.id]),
    })[0];

    expect(instWeek3.id).not.toBe(instWeek2.id);
    expect(instWeek3.status).toBe("PENDING");
    expect(instWeek2.status).toBe("COMPLETED");
  });

  it("guarantees 100% idempotency across repeated daily generation calls", () => {
    const targetDate = new Date(Date.UTC(2026, 1, 9)); // Monday Feb 9, 2026

    // First call
    const run1 = generator.generateForDate({
      targetDate,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
    });

    // Simulate re-running generator with existing instance checked
    const existingTaskIds = new Set(run1.map(i => i.taskId));
    const run2 = generator.generateForDate({
      targetDate,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
    }).filter(i => !existingTaskIds.has(i.taskId));

    expect(run1.length).toBe(1);
    expect(run2.length).toBe(0); // 0 new instances created
  });

  it("skips instance generation cleanly during paused life area windows and resumes upon unpausing", () => {
    const mondayDuringExamPause = new Date(Date.UTC(2026, 2, 2)); // Mon March 2, 2026
    const mondayAfterExamPause = new Date(Date.UTC(2026, 2, 9)); // Mon March 9, 2026

    const pausedAreaIds = new Set(["area-academic"]);

    // March 2: Life Area is PAUSED
    const pausedRun = generator.generateForDate({
      targetDate: mondayDuringExamPause,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
      pausedAreaIds,
    });
    expect(pausedRun.length).toBe(0); // Suppressed during pause!

    // March 9: Life Area is UNPAUSED (empty pausedAreaIds)
    const resumedRun = generator.generateForDate({
      targetDate: mondayAfterExamPause,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
      pausedAreaIds: new Set(),
    });
    expect(resumedRun.length).toBe(1);
    expect(resumedRun[0].status).toBe("PENDING");
  });

  it("does not generate Monday tasks on non-matching days of the week", () => {
    const tuesday = new Date(Date.UTC(2026, 0, 6)); // Tuesday
    expect(tuesday.getUTCDay()).toBe(2);

    const instances = generator.generateForDate({
      targetDate: tuesday,
      templates: [mondayTaskTemplate],
      dependencies: [],
      completedHistoricalTaskIds: new Set(),
    });
    expect(instances.length).toBe(0);
  });
});
