import type { PrismaClient, AnalyticsSnapshot } from "@prisma/client";

export interface UpsertAnalyticsSnapshotInput {
  userId: string;
  snapshotDate: Date;
  periodDays?: number;
  analyticsVersion?: number;
  executionRate: number;
  timeExecutionRate: number;
  planningAccuracy: number;
  capacityUtilization: number;
  healthClassification: string;
  backlogDelta?: number;
}

export class PrismaAnalyticsSnapshotRepository {
  constructor(private prisma: PrismaClient) {}

  async upsert(data: UpsertAnalyticsSnapshotInput): Promise<AnalyticsSnapshot> {
    const periodDays = data.periodDays ?? 7;
    const analyticsVersion = data.analyticsVersion ?? 1;

    return this.prisma.analyticsSnapshot.upsert({
      where: {
        userId_snapshotDate_periodDays_analyticsVersion: {
          userId: data.userId,
          snapshotDate: data.snapshotDate,
          periodDays,
          analyticsVersion,
        },
      },
      update: {
        executionRate: data.executionRate,
        timeExecutionRate: data.timeExecutionRate,
        planningAccuracy: data.planningAccuracy,
        capacityUtilization: data.capacityUtilization,
        healthClassification: data.healthClassification,
        backlogDelta: data.backlogDelta ?? 0,
      },
      create: {
        userId: data.userId,
        snapshotDate: data.snapshotDate,
        periodDays,
        analyticsVersion,
        executionRate: data.executionRate,
        timeExecutionRate: data.timeExecutionRate,
        planningAccuracy: data.planningAccuracy,
        capacityUtilization: data.capacityUtilization,
        healthClassification: data.healthClassification,
        backlogDelta: data.backlogDelta ?? 0,
      },
    });
  }

  async findByUserAndDate(
    userId: string,
    snapshotDate: Date,
    periodDays: number = 7,
    analyticsVersion: number = 1
  ): Promise<AnalyticsSnapshot | null> {
    return this.prisma.analyticsSnapshot.findUnique({
      where: {
        userId_snapshotDate_periodDays_analyticsVersion: {
          userId,
          snapshotDate,
          periodDays,
          analyticsVersion,
        },
      },
    });
  }

  async findHistory(
    userId: string,
    periodDays: number = 7,
    limit: number = 12,
    analyticsVersion: number = 1
  ): Promise<AnalyticsSnapshot[]> {
    return this.prisma.analyticsSnapshot.findMany({
      where: {
        userId,
        periodDays,
        analyticsVersion,
      },
      orderBy: { snapshotDate: "desc" },
      take: limit,
    });
  }
}
