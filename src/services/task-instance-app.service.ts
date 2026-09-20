import type { PrismaClient } from "@prisma/client";
import { PrismaTaskInstanceRepository } from "../repositories/task-instance.repository";
import { PrismaTaskRepository } from "../repositories/task.repository";
import { PrismaEventRepository } from "../repositories/event.repository";
import { TaskExecutionService, ConcurrencyConflictError } from "./task-execution.service";
import { NotFoundError } from "../lib/errors";
import { TimezoneService } from "../domain/time/timezone-service";
import { InstanceGenerator } from "../domain/tasks/instance-generator";
import type { TaskStatus, TaskEventType } from "../domain/types";
import type {
  TaskInstanceResponseDTO,
  UpdateTaskStatusRequestDTO,
} from "../dtos/task.dto";
import type { TaskEventResponseDTO } from "../dtos/event.dto";

export { ConcurrencyConflictError, NotFoundError };

export class TaskInstanceApplicationService {
  private instanceRepo: PrismaTaskInstanceRepository;
  private taskRepo: PrismaTaskRepository;
  private eventRepo: PrismaEventRepository;
  private executionService: TaskExecutionService;
  private generator: InstanceGenerator;

  constructor(private prisma: PrismaClient) {
    this.instanceRepo = new PrismaTaskInstanceRepository(prisma);
    this.taskRepo = new PrismaTaskRepository(prisma);
    this.eventRepo = new PrismaEventRepository(prisma);
    this.executionService = new TaskExecutionService(prisma);
    this.generator = new InstanceGenerator();
  }

  async getTodayInstances(actorUserId: string): Promise<TaskInstanceResponseDTO[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { logicalDayCutoffHour: true },
    });
    const cutoff = user?.logicalDayCutoffHour ?? 1;
    const today = TimezoneService.toLogicalCalendarDate(new Date(), cutoff, "UTC");

    // Ensure all active templates matching today have instances materialized
    await this.generateDailyInstances(actorUserId, today);

    return this.getInstancesByDate(actorUserId, today);
  }

  async getInstancesByDate(actorUserId: string, date: Date | string): Promise<TaskInstanceResponseDTO[]> {
    const normalizedDate = typeof date === "string"
      ? TimezoneService.parseCalendarDate(date)
      : TimezoneService.toLogicalCalendarDate(date, 0, "UTC");

    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: normalizedDate,
      },
      include: {
        task: {
          include: {
            area: true,
            dependencies: {
              include: { prerequisite: true },
            },
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ startMinute: "asc" }, { createdAt: "asc" }],
    });

    return this.mapToResponseDTOs(instances, actorUserId, normalizedDate);
  }

  async generateDailyInstances(actorUserId: string, targetDate: Date | string): Promise<TaskInstanceResponseDTO[]> {
    const normalizedDate = typeof targetDate === "string"
      ? TimezoneService.parseCalendarDate(targetDate)
      : TimezoneService.toLogicalCalendarDate(targetDate, 0, "UTC");

    // Fetch user's active templates
    const templates = await this.taskRepo.findByUserId(actorUserId, false);

    // Fetch user's dependencies
    const allDependencies = await this.taskRepo.getDependencies(actorUserId);

    // Fetch paused life areas
    const pausedAreas = await this.prisma.lifeArea.findMany({
      where: {
        userId: actorUserId,
        intensity: "PAUSED",
      },
      select: { id: true },
    });
    const pausedAreaIds = new Set(pausedAreas.map(a => a.id));

    // Fetch historical completed task IDs on this date
    const completedInstances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: normalizedDate,
        status: "COMPLETED",
      },
      select: { taskId: true },
    });
    const completedTaskIds = new Set(completedInstances.map(i => i.taskId));

    // Generate instances using Domain InstanceGenerator
    const generated = this.generator.generateForDate({
      targetDate: normalizedDate,
      templates,
      dependencies: allDependencies.map(d => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId })),
      completedHistoricalTaskIds: completedTaskIds,
      pausedAreaIds,
    });

    // Check existing instances for this date to avoid duplicates
    const existing = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: normalizedDate,
      },
      select: { taskId: true },
    });
    const existingTaskIds = new Set(existing.map(e => e.taskId));

    const toCreate = generated.filter(g => !existingTaskIds.has(g.taskId));

    for (const inst of toCreate) {
      const created = await this.prisma.taskInstance.create({
        data: {
          userId: inst.userId,
          taskId: inst.taskId,
          date: inst.date,
          title: inst.title,
          priority: inst.priority,
          energyRequired: inst.energyRequired,
          durationMinutes: inst.durationMinutes,
          isDeepWork: inst.isDeepWork,
          startMinute: inst.startMinute,
          endMinute: inst.endMinute,
          status: inst.status,
          actualMinutes: 0,
          pausedMs: 0,
        },
      });

      await this.prisma.taskEvent.create({
        data: {
          taskInstanceId: created.id,
          eventType: inst.status === "BLOCKED" ? "CREATED" : "SCHEDULED",
          payload: { reason: "Daily schedule generated" },
        },
      });
    }

    return this.getInstancesByDate(actorUserId, normalizedDate);
  }

  async updateStatus(
    actorUserId: string,
    instanceId: string,
    input: UpdateTaskStatusRequestDTO
  ): Promise<TaskInstanceResponseDTO> {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.userId !== actorUserId) {
      throw new NotFoundError(`TaskInstance "${instanceId}" not found.`);
    }

    // If completing, use atomic transaction boundary service
    if (input.status === "COMPLETED") {
      const result = await this.executionService.completeTaskAtomically({
        actorUserId,
        taskInstanceId: instanceId,
        actualMinutes: input.actualMinutes ?? instance.durationMinutes,
        metrics: input.metrics,
        expectedUpdatedAt: input.expectedUpdatedAt,
        expectedStatus: input.expectedStatus,
      });
      return result.completedInstance;
    }

    // Idempotency check for other transitions
    if (input.expectedStatus && instance.status !== input.expectedStatus) {
      throw new ConcurrencyConflictError(
        `Expected status "${input.expectedStatus}" but current status is "${instance.status}".`
      );
    }

    const now = new Date();
    let targetStatus: TaskStatus = input.status;
    let eventType: TaskEventType = "SCHEDULED";
    let calculatedPausedMs = instance.pausedMs;

    switch (input.status) {
      case "ACTIVE":
        eventType = "STARTED";
        break;
      case "PAUSED":
        eventType = "PAUSED";
        break;
      case "MISSED":
        eventType = "MISSED";
        break;
      case "CANCELLED":
        eventType = "CANCELLED";
        break;
      case "PENDING":
        eventType = "RESUMED";
        calculatedPausedMs = await this.eventRepo.calculateTotalPausedMs(instance.id);
        break;
      default:
        targetStatus = input.status;
        eventType = "SCHEDULED";
    }

    const updated = await this.prisma.taskInstance.update({
      where: { id: instanceId },
      data: {
        status: targetStatus,
        pausedMs: calculatedPausedMs,
        ...(input.actualMinutes !== undefined ? { actualMinutes: input.actualMinutes } : {}),
      },
    });

    await this.eventRepo.append(instanceId, eventType, input.metrics ?? null, now);

    return {
      id: updated.id,
      userId: updated.userId,
      taskId: updated.taskId,
      date: updated.date.toISOString().slice(0, 10),
      title: updated.title,
      priority: updated.priority,
      energyRequired: updated.energyRequired,
      durationMinutes: updated.durationMinutes,
      isDeepWork: updated.isDeepWork,
      startMinute: updated.startMinute,
      endMinute: updated.endMinute,
      status: updated.status,
      actualMinutes: updated.actualMinutes,
      pausedMs: updated.pausedMs,
      metrics: (updated.metrics as Record<string, unknown>) ?? null,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getEventsForInstance(actorUserId: string, instanceId: string): Promise<TaskEventResponseDTO[]> {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.userId !== actorUserId) {
      throw new NotFoundError(`TaskInstance "${instanceId}" not found.`);
    }

    const events = await this.eventRepo.findByInstanceId(instanceId);
    return events.map(e => ({
      id: e.id,
      taskInstanceId: e.taskInstanceId,
      eventType: e.eventType,
      payload: (e.payload as Record<string, unknown>) ?? null,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async recordEvent(
    actorUserId: string,
    instanceId: string,
    eventType: TaskEventType,
    payload?: Record<string, unknown> | null
  ): Promise<TaskEventResponseDTO> {
    const instance = await this.prisma.taskInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.userId !== actorUserId) {
      throw new NotFoundError(`TaskInstance "${instanceId}" not found.`);
    }

    const event = await this.eventRepo.append(instanceId, eventType, payload ?? null);
    return {
      id: event.id,
      taskInstanceId: event.taskInstanceId,
      eventType: event.eventType,
      payload: (event.payload as Record<string, unknown>) ?? null,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private async mapToResponseDTOs(
    instances: Array<any>,
    actorUserId: string,
    date: Date
  ): Promise<TaskInstanceResponseDTO[]> {
    const completedTaskIds = new Set(
      instances.filter(i => i.status === "COMPLETED").map(i => i.taskId)
    );

    return instances.map(inst => {
      const task = inst.task;
      const prerequisites = task?.dependencies?.map((dep: any) => ({
        id: dep.prerequisite.id,
        title: dep.prerequisite.title,
        isCompleted: completedTaskIds.has(dep.dependsOnTaskId),
      })) ?? [];

      return {
        id: inst.id,
        userId: inst.userId,
        taskId: inst.taskId,
        date: inst.date.toISOString().slice(0, 10),
        title: inst.title,
        priority: inst.priority,
        energyRequired: inst.energyRequired,
        durationMinutes: inst.durationMinutes,
        isDeepWork: inst.isDeepWork,
        startMinute: inst.startMinute,
        endMinute: inst.endMinute,
        status: inst.status,
        actualMinutes: inst.actualMinutes,
        pausedMs: inst.pausedMs,
        metrics: inst.metrics ?? null,
        completedAt: inst.completedAt ? inst.completedAt.toISOString() : null,
        createdAt: inst.createdAt.toISOString(),
        updatedAt: inst.updatedAt.toISOString(),
        areaId: task?.areaId,
        areaName: task?.area?.name,
        areaColor: task?.area?.color,
        events: inst.events?.map((e: any) => ({
          id: e.id,
          taskInstanceId: e.taskInstanceId,
          eventType: e.eventType,
          payload: e.payload ?? null,
          createdAt: e.createdAt.toISOString(),
        })),
        prerequisites,
      };
    });
  }
}