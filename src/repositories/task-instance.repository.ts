import { Prisma, type PrismaClient, type TaskInstance as PrismaTaskInstance } from "@prisma/client";
import type { TaskStatus, Priority, EnergyLevel } from "../domain/types";

export interface CreateInstanceInput {
  userId: string;
  taskId: string;
  date: Date;
  title: string;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  isDeepWork?: boolean;
  startMinute?: number | null;
  endMinute?: number | null;
  status?: TaskStatus;
}

export interface ITaskInstanceRepository {
  findById(id: string): Promise<PrismaTaskInstance | null>;
  findByUserAndDate(userId: string, date: Date): Promise<PrismaTaskInstance[]>;
  findByUserAndStatus(userId: string, status: TaskStatus): Promise<PrismaTaskInstance[]>;
  create(data: CreateInstanceInput): Promise<PrismaTaskInstance>;
  createMany(instances: CreateInstanceInput[]): Promise<number>;
  updateStatus(
    id: string,
    status: TaskStatus,
    actualMinutes?: number,
    pausedMs?: number,
    metrics?: Record<string, unknown> | null
  ): Promise<PrismaTaskInstance>;
}

export class PrismaTaskInstanceRepository implements ITaskInstanceRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaTaskInstance | null> {
    return this.prisma.taskInstance.findUnique({
      where: { id },
      include: { events: true },
    });
  }

  async findByUserAndDate(userId: string, date: Date): Promise<PrismaTaskInstance[]> {
    return this.prisma.taskInstance.findMany({
      where: {
        userId,
        date,
      },
      orderBy: [{ startMinute: "asc" }, { createdAt: "asc" }],
      include: { events: true },
    });
  }

  async findByUserAndStatus(userId: string, status: TaskStatus): Promise<PrismaTaskInstance[]> {
    return this.prisma.taskInstance.findMany({
      where: {
        userId,
        status,
      },
      orderBy: { date: "desc" },
    });
  }

  async create(data: CreateInstanceInput): Promise<PrismaTaskInstance> {
    return this.prisma.taskInstance.create({
      data: {
        userId: data.userId,
        taskId: data.taskId,
        date: data.date,
        title: data.title,
        priority: data.priority,
        energyRequired: data.energyRequired,
        durationMinutes: data.durationMinutes,
        isDeepWork: data.isDeepWork ?? false,
        startMinute: data.startMinute ?? null,
        endMinute: data.endMinute ?? null,
        status: data.status ?? "PENDING",
      },
    });
  }

  async createMany(instances: CreateInstanceInput[]): Promise<number> {
    const result = await this.prisma.taskInstance.createMany({
      data: instances.map(i => ({
        userId: i.userId,
        taskId: i.taskId,
        date: i.date,
        title: i.title,
        priority: i.priority,
        energyRequired: i.energyRequired,
        durationMinutes: i.durationMinutes,
        isDeepWork: i.isDeepWork ?? false,
        startMinute: i.startMinute ?? null,
        endMinute: i.endMinute ?? null,
        status: i.status ?? "PENDING",
      })),
    });
    return result.count;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    actualMinutes?: number,
    pausedMs?: number,
    metrics?: Record<string, unknown> | null
  ): Promise<PrismaTaskInstance> {
    const updateData: Prisma.TaskInstanceUpdateInput = {
      status,
      ...(actualMinutes !== undefined ? { actualMinutes } : {}),
      ...(pausedMs !== undefined ? { pausedMs } : {}),
      ...(metrics !== undefined ? { metrics: metrics as Prisma.InputJsonValue } : {}),
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    };

    return this.prisma.taskInstance.update({
      where: { id },
      data: updateData,
    });
  }
}