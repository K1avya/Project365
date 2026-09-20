import { Prisma, type PrismaClient, type TaskEvent as PrismaTaskEvent } from "@prisma/client";
import type { TaskEventType } from "../domain/types.js";

export interface IEventRepository {
  append(
    taskInstanceId: string,
    eventType: TaskEventType,
    payload?: Record<string, unknown> | null,
    timestamp?: Date
  ): Promise<PrismaTaskEvent>;
  findByInstanceId(taskInstanceId: string): Promise<PrismaTaskEvent[]>;
  calculateTotalPausedMs(taskInstanceId: string): Promise<number>;
}

export class PrismaEventRepository implements IEventRepository {
  constructor(private prisma: PrismaClient) {}

  async append(
    taskInstanceId: string,
    eventType: TaskEventType,
    payload?: Record<string, unknown> | null,
    timestamp?: Date
  ): Promise<PrismaTaskEvent> {
    return this.prisma.taskEvent.create({
      data: {
        taskInstanceId,
        eventType,
        payload: payload ? (payload as Prisma.InputJsonValue) : Prisma.DbNull,
        createdAt: timestamp ?? new Date(),
      },
    });
  }

  async findByInstanceId(taskInstanceId: string): Promise<PrismaTaskEvent[]> {
    return this.prisma.taskEvent.findMany({
      where: { taskInstanceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async calculateTotalPausedMs(taskInstanceId: string): Promise<number> {
    const events = await this.findByInstanceId(taskInstanceId);
    let totalPausedMs = 0;
    let pauseStartTime: number | null = null;

    for (const e of events) {
      if (e.eventType === "PAUSED") {
        pauseStartTime = e.createdAt.getTime();
      } else if (
        (e.eventType === "RESUMED" || e.eventType === "COMPLETED" || e.eventType === "MISSED") &&
        pauseStartTime !== null
      ) {
        totalPausedMs += Math.max(0, e.createdAt.getTime() - pauseStartTime);
        pauseStartTime = null;
      }
    }

    return totalPausedMs;
  }
}