import type { PrismaClient } from "@prisma/client";
import { PrismaTaskRepository, type CreateTaskInput, type UpdateTaskInput } from "../repositories/task.repository";
import { DAGService } from "../domain/tasks/dag-service";
import type { TaskResponseDTO } from "../dtos/task.dto";
import { NotFoundError } from "../lib/errors";

export interface CreateTaskWithDependenciesInput extends Partial<CreateTaskInput> {
  userId?: string;
  actorUserId?: string;
  areaId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  durationMinutes: number;
  priority?: any;
  energyRequired?: any;
  preferredMinute?: number | null;
  isDeepWork?: boolean;
  recurrenceDays?: number[];
  dependsOnTaskIds?: string[];
}

export class TaskApplicationService {
  private taskRepo: PrismaTaskRepository;
  private dagService: DAGService;

  constructor(private prisma: PrismaClient) {
    this.taskRepo = new PrismaTaskRepository(prisma);
    this.dagService = new DAGService();
  }

  async listTasks(actorUserId: string, includeArchived = false): Promise<TaskResponseDTO[]> {
    const tasks = await this.taskRepo.findByUserId(actorUserId, includeArchived);
    return tasks.map(t => this.mapToDTO(t));
  }

  async getTaskById(actorUserIdOrId: string, maybeId?: string): Promise<TaskResponseDTO> {
    const id = maybeId ?? actorUserIdOrId;
    const actorUserId = maybeId ? actorUserIdOrId : undefined;

    const task = await this.taskRepo.findById(id);
    if (!task || (actorUserId && task.userId !== actorUserId)) {
      throw new NotFoundError(`Task "${id}" not found.`);
    }
    return this.mapToDTO(task);
  }

  async createTask(
    actorUserIdOrInput: string | CreateTaskWithDependenciesInput,
    maybeInput?: CreateTaskWithDependenciesInput
  ): Promise<TaskResponseDTO> {
    const actorUserId = typeof actorUserIdOrInput === "string" ? actorUserIdOrInput : (actorUserIdOrInput.actorUserId || actorUserIdOrInput.userId);
    const input: CreateTaskWithDependenciesInput = typeof actorUserIdOrInput === "string" ? maybeInput! : actorUserIdOrInput;

    if (!actorUserId) {
      throw new Error("Actor user ID is required to create a task.");
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Task title cannot be empty.");
    }
    if (input.durationMinutes <= 0) {
      throw new Error("Task durationMinutes must be greater than 0.");
    }
    if (input.preferredMinute !== undefined && input.preferredMinute !== null) {
      if (input.preferredMinute < 0 || input.preferredMinute >= 1440) {
        throw new Error("preferredMinute must be between 0 and 1439.");
      }
    }

    // Pre-validate any requested dependencies
    if (input.dependsOnTaskIds && input.dependsOnTaskIds.length > 0) {
      const existingDeps = await this.taskRepo.getDependencies(actorUserId);
      for (const depId of input.dependsOnTaskIds) {
        this.dagService.validateDependency(
          "temp-new-task",
          depId,
          existingDeps.map(d => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId }))
        );
      }
    }

    // Create template
    const task = await this.taskRepo.create({
      userId: actorUserId,
      areaId: input.areaId,
      milestoneId: input.milestoneId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      durationMinutes: input.durationMinutes,
      priority: input.priority ?? "MEDIUM",
      energyRequired: input.energyRequired ?? "MEDIUM",
      preferredMinute: input.preferredMinute ?? null,
      isDeepWork: input.isDeepWork ?? false,
      recurrenceDays: input.recurrenceDays ?? [1, 2, 3, 4, 5],
    });

    // Link dependencies
    if (input.dependsOnTaskIds && input.dependsOnTaskIds.length > 0) {
      for (const depId of input.dependsOnTaskIds) {
        await this.taskRepo.addDependency(task.id, depId);
      }
    }

    return this.mapToDTO(task);
  }

  async updateTask(
    actorUserIdOrId: string,
    idOrInput: string | UpdateTaskInput,
    maybeInput?: UpdateTaskInput
  ): Promise<TaskResponseDTO> {
    const id = typeof idOrInput === "string" ? idOrInput : actorUserIdOrId;
    const actorUserId = typeof idOrInput === "string" ? actorUserIdOrId : undefined;
    const input = typeof idOrInput === "string" ? maybeInput! : idOrInput;

    if (actorUserId) {
      await this.getTaskById(actorUserId, id);
    }

    const updated = await this.taskRepo.update(id, input);
    return this.mapToDTO(updated);
  }

  async addDependency(actorUserId: string, taskId: string, dependsOnTaskId: string) {
    if (taskId === dependsOnTaskId) {
      throw new Error("A task cannot depend on itself.");
    }

    const existingDeps = await this.taskRepo.getDependencies(actorUserId);
    this.dagService.validateDependency(
      taskId,
      dependsOnTaskId,
      existingDeps.map(d => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId }))
    );

    return this.taskRepo.addDependency(taskId, dependsOnTaskId);
  }

  async removeDependency(taskId: string, dependsOnTaskId: string) {
    return this.taskRepo.removeDependency(taskId, dependsOnTaskId);
  }

  async archiveTask(actorUserIdOrId: string, maybeId?: string): Promise<TaskResponseDTO> {
    const id = maybeId ?? actorUserIdOrId;
    const actorUserId = maybeId ? actorUserIdOrId : undefined;

    if (actorUserId) {
      await this.getTaskById(actorUserId, id);
    }

    const archived = await this.taskRepo.archive(id);
    return this.mapToDTO(archived);
  }

  async deleteTask(actorUserIdOrId: string, maybeId?: string) {
    const id = maybeId ?? actorUserIdOrId;
    const actorUserId = maybeId ? actorUserIdOrId : undefined;

    if (actorUserId) {
      await this.getTaskById(actorUserId, id);
    }

    return this.taskRepo.delete(id);
  }

  private mapToDTO(task: any): TaskResponseDTO {
    return {
      id: task.id,
      userId: task.userId,
      areaId: task.areaId,
      milestoneId: task.milestoneId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      energyRequired: task.energyRequired,
      durationMinutes: task.durationMinutes,
      preferredMinute: task.preferredMinute,
      isDeepWork: task.isDeepWork,
      recurrenceDays: task.recurrenceDays,
      isArchived: task.isArchived,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}