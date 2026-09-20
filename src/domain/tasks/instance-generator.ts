import type { Task, TaskInstance, TaskStatus } from "../types.js";
import { DAGService, type DependencyEdge } from "./dag-service.js";

export interface GenerationContext {
  targetDate: Date;
  templates: Task[];
  dependencies: DependencyEdge[];
  completedHistoricalTaskIds: Set<string>;
  pausedAreaIds?: Set<string>;
  idGenerator?: () => string;
}

export class InstanceGenerator {
  constructor(private dagService: DAGService = new DAGService()) {}

  /**
   * Generates concrete daily TaskInstances for a specific date from Task templates.
   * Enforces:
   * 1. Recurrence day matching
   * 2. Active area filtering (skips PAUSED life areas)
   * 3. Archive filtering (skips archived templates)
   * 4. Dependency resolution (marks tasks as BLOCKED if prerequisites are unfulfilled)
   */
  generateForDate(ctx: GenerationContext): TaskInstance[] {
    const dayOfWeek = ctx.targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const idGen = ctx.idGenerator ?? (() => crypto.randomUUID());
    const instances: TaskInstance[] = [];

    // Map templateId -> array of prerequisite templateIds
    const prereqMap = new Map<string, string[]>();
    for (const dep of ctx.dependencies) {
      if (!prereqMap.has(dep.taskId)) prereqMap.set(dep.taskId, []);
      prereqMap.get(dep.taskId)!.push(dep.dependsOnTaskId);
    }

    for (const template of ctx.templates) {
      // 1. Skip archived templates
      if (template.isArchived) continue;

      // 2. Skip paused life areas
      if (ctx.pausedAreaIds && ctx.pausedAreaIds.has(template.areaId)) continue;

      // 3. Check recurrence day match
      if (!template.recurrenceDays.includes(dayOfWeek)) continue;

      // 4. Resolve prerequisite status
      const prerequisites = prereqMap.get(template.id) || [];
      const status: TaskStatus = this.dagService.resolveTaskStatus(
        template.id,
        prerequisites,
        ctx.completedHistoricalTaskIds
      );

      // 5. Calculate slot timing if preferredMinute is set
      let startMin: number | null = null;
      let endMin: number | null = null;
      if (template.preferredMinute !== null && template.preferredMinute !== undefined) {
        startMin = template.preferredMinute;
        endMin = (template.preferredMinute + template.durationMinutes) % 1440;
      }

      const now = new Date();
      instances.push({
        id: idGen(),
        userId: template.userId,
        taskId: template.id,
        date: new Date(ctx.targetDate),
        title: template.title,
        priority: template.priority,
        energyRequired: template.energyRequired,
        durationMinutes: template.durationMinutes,
        isDeepWork: template.isDeepWork,
        startMinute: startMin,
        endMinute: endMin,
        status,
        actualMinutes: 0,
        pausedMs: 0,
        metrics: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return instances;
  }
}
