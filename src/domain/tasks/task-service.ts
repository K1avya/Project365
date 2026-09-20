import type { Task, Priority, EnergyLevel } from "../types.js";

export interface CreateTaskDTO {
  userId: string;
  areaId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  priority?: Priority;
  energyRequired?: EnergyLevel;
  durationMinutes: number;
  preferredMinute?: number | null;
  isDeepWork?: boolean;
  recurrenceDays?: number[]; // [0..6] (0 = Sunday)
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  priority?: Priority;
  energyRequired?: EnergyLevel;
  durationMinutes?: number;
  preferredMinute?: number | null;
  isDeepWork?: boolean;
  recurrenceDays?: number[];
  milestoneId?: string | null;
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  /**
   * Creates a new Task Template.
   * Rule 2 Enforced: Templates NEVER possess a `status` attribute.
   */
  createTask(dto: CreateTaskDTO, idGenerator: () => string = () => crypto.randomUUID()): Task {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error("Task title cannot be empty.");
    }

    if (!dto.userId || dto.userId.trim().length === 0) {
      throw new Error("Task must be associated with a valid userId.");
    }

    if (!dto.areaId || dto.areaId.trim().length === 0) {
      throw new Error("Task must be associated with a valid Life Area.");
    }

    if (!Number.isInteger(dto.durationMinutes) || dto.durationMinutes <= 0) {
      throw new Error(`Task duration must be a positive integer in minutes. Received: ${dto.durationMinutes}.`);
    }

    if (dto.preferredMinute !== undefined && dto.preferredMinute !== null) {
      if (!Number.isInteger(dto.preferredMinute) || dto.preferredMinute < 0 || dto.preferredMinute >= 1440) {
        throw new Error(`Preferred minute must be between 0 and 1439. Received: ${dto.preferredMinute}.`);
      }
    }

    const recurrenceDays = Array.isArray(dto.recurrenceDays)
      ? Array.from(new Set(dto.recurrenceDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b)
      : [1, 2, 3, 4, 5]; // Default Mon-Fri

    const now = new Date();
    const task: Task = {
      id: idGenerator(),
      userId: dto.userId.trim(),
      areaId: dto.areaId.trim(),
      milestoneId: dto.milestoneId ?? null,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      priority: dto.priority ?? "MEDIUM",
      energyRequired: dto.energyRequired ?? "MEDIUM",
      durationMinutes: dto.durationMinutes,
      preferredMinute: dto.preferredMinute ?? null,
      isDeepWork: dto.isDeepWork ?? false,
      recurrenceDays,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    // Ensure status does not exist on template
    if ("status" in (task as unknown as Record<string, unknown>)) {
      delete (task as unknown as Record<string, unknown>).status;
    }

    this.tasks.set(task.id, task);
    return { ...task };
  }

  getTask(id: string): Task | null {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  listTasksByUser(userId: string, includeArchived = false): Task[] {
    const results: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.userId === userId && (includeArchived || !task.isArchived)) {
        results.push({ ...task });
      }
    }
    return results;
  }

  updateTask(id: string, dto: UpdateTaskDTO): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    if (dto.title !== undefined) {
      if (!dto.title || dto.title.trim().length === 0) {
        throw new Error("Task title cannot be empty.");
      }
      task.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      task.description = dto.description?.trim() ?? null;
    }

    if (dto.priority !== undefined) {
      task.priority = dto.priority;
    }

    if (dto.energyRequired !== undefined) {
      task.energyRequired = dto.energyRequired;
    }

    if (dto.durationMinutes !== undefined) {
      if (!Number.isInteger(dto.durationMinutes) || dto.durationMinutes <= 0) {
        throw new Error(`Task duration must be a positive integer in minutes. Received: ${dto.durationMinutes}.`);
      }
      task.durationMinutes = dto.durationMinutes;
    }

    if (dto.preferredMinute !== undefined) {
      if (dto.preferredMinute !== null && (!Number.isInteger(dto.preferredMinute) || dto.preferredMinute < 0 || dto.preferredMinute >= 1440)) {
        throw new Error(`Preferred minute must be between 0 and 1439. Received: ${dto.preferredMinute}.`);
      }
      task.preferredMinute = dto.preferredMinute;
    }

    if (dto.isDeepWork !== undefined) {
      task.isDeepWork = dto.isDeepWork;
    }

    if (dto.recurrenceDays !== undefined) {
      task.recurrenceDays = Array.from(new Set(dto.recurrenceDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
    }

    if (dto.milestoneId !== undefined) {
      task.milestoneId = dto.milestoneId;
    }

    task.updatedAt = new Date();
    return { ...task };
  }

  archiveTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id "${id}" not found.`);
    }
    task.isArchived = true;
    task.updatedAt = new Date();
    return { ...task };
  }

  restoreTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id "${id}" not found.`);
    }
    task.isArchived = false;
    task.updatedAt = new Date();
    return { ...task };
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  duplicateTask(id: string, titleSuffix = " (Copy)", idGenerator: () => string = () => crypto.randomUUID()): Task {
    const original = this.tasks.get(id);
    if (!original) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    return this.createTask({
      userId: original.userId,
      areaId: original.areaId,
      milestoneId: original.milestoneId,
      title: `${original.title}${titleSuffix}`,
      description: original.description,
      priority: original.priority,
      energyRequired: original.energyRequired,
      durationMinutes: original.durationMinutes,
      preferredMinute: original.preferredMinute,
      isDeepWork: original.isDeepWork,
      recurrenceDays: [...original.recurrenceDays],
    }, idGenerator);
  }
}
