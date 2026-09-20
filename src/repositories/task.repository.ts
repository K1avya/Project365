import type { PrismaClient, Task as PrismaTask, TaskDependency } from "@prisma/client";
import type { Priority, EnergyLevel } from "../domain/types.js";

export interface CreateTaskInput {
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
  recurrenceDays?: number[];
}

export interface UpdateTaskInput {
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

export interface ITaskRepository {
  findById(id: string): Promise<PrismaTask | null>;
  findByUserId(userId: string, includeArchived?: boolean): Promise<PrismaTask[]>;
  create(data: CreateTaskInput): Promise<PrismaTask>;
  update(id: string, data: UpdateTaskInput): Promise<PrismaTask>;
  archive(id: string): Promise<PrismaTask>;
  restore(id: string): Promise<PrismaTask>;
  delete(id: string): Promise<boolean>;
  addDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency>;
  removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean>;
  getDependencies(userId: string): Promise<TaskDependency[]>;
}

export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaTask | null> {
    return this.prisma.task.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, includeArchived = false): Promise<PrismaTask[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateTaskInput): Promise<PrismaTask> {
    if (data.durationMinutes <= 0) {
      throw new Error("Task durationMinutes must be greater than 0.");
    }

    return this.prisma.task.create({
      data: {
        userId: data.userId,
        areaId: data.areaId,
        milestoneId: data.milestoneId ?? null,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? "MEDIUM",
        energyRequired: data.energyRequired ?? "MEDIUM",
        durationMinutes: data.durationMinutes,
        preferredMinute: data.preferredMinute ?? null,
        isDeepWork: data.isDeepWork ?? false,
        recurrenceDays: data.recurrenceDays ?? [1, 2, 3, 4, 5],
        isArchived: false,
      },
    });
  }

  async update(id: string, data: UpdateTaskInput): Promise<PrismaTask> {
    if (data.durationMinutes !== undefined && data.durationMinutes <= 0) {
      throw new Error("Task durationMinutes must be greater than 0.");
    }

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async archive(id: string): Promise<PrismaTask> {
    return this.prisma.task.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async restore(id: string): Promise<PrismaTask> {
    return this.prisma.task.update({
      where: { id },
      data: { isArchived: false },
    });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.prisma.task.delete({
      where: { id },
    });
    return Boolean(deleted);
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency> {
    if (taskId === dependsOnTaskId) {
      throw new Error("A task cannot depend on itself.");
    }

    return this.prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
    });
  }

  async removeDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    const deleted = await this.prisma.taskDependency.delete({
      where: {
        taskId_dependsOnTaskId: {
          taskId,
          dependsOnTaskId,
        },
      },
    });
    return Boolean(deleted);
  }

  async getDependencies(userId: string): Promise<TaskDependency[]> {
    return this.prisma.taskDependency.findMany({
      where: {
        task: { userId },
      },
    });
  }
}