import type { PrismaClient } from "@prisma/client";
import { TimezoneService } from "../domain/time/timezone-service.js";
import { PrismaAnalyticsSnapshotRepository } from "../repositories/analytics-snapshot.repository.js";
import type {
  ExecutionRateDto,
  CapacityUtilizationDto,
  PlanningAccuracyDto,
  AnalyticsSummaryDto,
  UtilizationHealth,
} from "../dtos/analytics.dto.js";

export class AnalyticsApplicationService {
  private snapshotRepo: PrismaAnalyticsSnapshotRepository;

  constructor(private prisma: PrismaClient) {
    this.snapshotRepo = new PrismaAnalyticsSnapshotRepository(prisma);
  }

  /**
   * Computes task execution rate by count and duration over the specified window.
   */
  async getExecutionRate(actorUserId: string, days: number = 7): Promise<ExecutionRateDto> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: { gte: startDate },
      },
      select: {
        status: true,
        durationMinutes: true,
        actualMinutes: true,
      },
    });

    const totalTasksScheduled = instances.length;
    const completedTasks = instances.filter(i => i.status === "COMPLETED").length;
    const missedTasks = instances.filter(i => i.status === "MISSED").length;
    const activeTasks = instances.filter(i => i.status === "ACTIVE").length;
    const blockedTasks = instances.filter(i => i.status === "BLOCKED").length;

    const taskCompletionPercent = totalTasksScheduled > 0
      ? Math.round((completedTasks / totalTasksScheduled) * 100)
      : 0;

    const plannedMinutesTotal = instances.reduce((sum, i) => sum + i.durationMinutes, 0);
    const actualMinutesTotal = instances.reduce((sum, i) => sum + i.actualMinutes, 0);

    const timeExecutionPercent = plannedMinutesTotal > 0
      ? Math.min(100, Math.round((actualMinutesTotal / plannedMinutesTotal) * 100))
      : 0;

    return {
      periodDays: days,
      totalTasksScheduled,
      completedTasks,
      missedTasks,
      activeTasks,
      blockedTasks,
      taskCompletionPercent,
      plannedMinutesTotal,
      actualMinutesTotal,
      timeExecutionPercent,
    };
  }

  /**
   * Evaluates discretionary capacity utilization and burnout pressure.
   */
  async getCapacityUtilization(actorUserId: string, days: number = 7): Promise<CapacityUtilizationDto> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const snapshots = await this.prisma.capacitySnapshot.findMany({
      where: {
        userId: actorUserId,
        date: { gte: startDate },
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: { commitments: { where: { isActive: true } } },
    });

    // If snapshots are recorded, use their immutable values; otherwise estimate using user baseline
    let totalDiscretionaryMinutes = 0;
    let totalPlannedMinutes = 0;
    let overloadedDaysCount = 0;
    let safeBufferDaysCount = 0;

    if (snapshots.length > 0) {
      for (const snap of snapshots) {
        totalDiscretionaryMinutes += snap.discretionaryMinutes;
        totalPlannedMinutes += snap.plannedMinutes;
        if (snap.overloadMinutes > 0) {
          overloadedDaysCount++;
        } else {
          safeBufferDaysCount++;
        }
      }
    } else {
      // Fallback estimate for un-snapshotted recent days
      const grossDayMin = Math.round(1440 - user.dailySleepHours * 60);
      const commitMin = user.commitments.reduce((s, c) => s + c.durationMinutes, 0);
      const discretionaryPerDay = Math.max(0, grossDayMin - commitMin);

      totalDiscretionaryMinutes = discretionaryPerDay * days;

      const instances = await this.prisma.taskInstance.findMany({
        where: {
          userId: actorUserId,
          date: { gte: startDate },
        },
        select: { durationMinutes: true },
      });
      totalPlannedMinutes = instances.reduce((s, i) => s + i.durationMinutes, 0);
      safeBufferDaysCount = days;
    }

    const utilizationPercent = totalDiscretionaryMinutes > 0
      ? Math.round((totalPlannedMinutes / totalDiscretionaryMinutes) * 100)
      : 0;

    let healthClassification: UtilizationHealth = "HEALTHY_FLOW";
    if (utilizationPercent < 50) {
      healthClassification = "UNDER_COMMITTED";
    } else if (utilizationPercent <= 85) {
      healthClassification = "HEALTHY_FLOW";
    } else if (utilizationPercent <= 100) {
      healthClassification = "OVERLOAD_WARNING";
    } else {
      healthClassification = "CRITICAL_BURNOUT";
    }

    return {
      periodDays: days,
      totalDiscretionaryMinutes,
      totalPlannedMinutes,
      utilizationPercent,
      healthClassification,
      overloadedDaysCount,
      safeBufferDaysCount,
    };
  }

  /**
   * Compares initial planning baseline against actual reality.
   * Planning Accuracy % = 100 - min(100, (|Planned - Actual| / Planned) * 100)
   */
  async getPlanningAccuracy(actorUserId: string, days: number = 7): Promise<PlanningAccuracyDto> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const plans = await this.prisma.weeklyPlan.findMany({
      where: {
        userId: actorUserId,
        weekStartDate: { gte: startDate },
      },
      include: {
        revisions: {
          orderBy: { version: "asc" },
        },
      },
    });

    let baselinePlannedHours = 0;
    let actualExecutedHours = 0;
    let revisionCountTotal = 0;

    if (plans.length > 0) {
      for (const plan of plans) {
        revisionCountTotal += plan.revisions.length;
        const v1 = plan.revisions.find(r => r.version === 1);
        if (v1) {
          baselinePlannedHours += v1.plannedHours;
        }
        const latestRev = plan.revisions[plan.revisions.length - 1];
        if (latestRev) {
          actualExecutedHours += latestRev.actualHours;
        }
      }
    } else {
      // Fallback to task instance actuals vs planned
      const instances = await this.prisma.taskInstance.findMany({
        where: {
          userId: actorUserId,
          date: { gte: startDate },
        },
        select: { durationMinutes: true, actualMinutes: true },
      });
      baselinePlannedHours = Number((instances.reduce((s, i) => s + i.durationMinutes, 0) / 60).toFixed(1));
      actualExecutedHours = Number((instances.reduce((s, i) => s + i.actualMinutes, 0) / 60).toFixed(1));
    }

    const varianceHours = Number(Math.abs(baselinePlannedHours - actualExecutedHours).toFixed(1));
    let accuracyScore = 100;
    if (baselinePlannedHours > 0) {
      const errorRatio = varianceHours / baselinePlannedHours;
      accuracyScore = Math.max(0, Math.round((1 - Math.min(1, errorRatio)) * 100));
    }

    return {
      periodDays: days,
      baselinePlannedHours,
      actualExecutedHours,
      varianceHours,
      accuracyScore,
      revisionCountTotal,
    };
  }

  /**
   * Freezes and materializes an immutable AnalyticsSnapshot in PostgreSQL.
   */
  async materializeSnapshot(
    actorUserId: string,
    snapshotDateInput: Date | string,
    periodDays: number = 7,
    analyticsVersion: number = 1
  ) {
    const snapshotDate = typeof snapshotDateInput === "string"
      ? TimezoneService.parseCalendarDate(snapshotDateInput)
      : TimezoneService.toLogicalCalendarDate(snapshotDateInput, 0, "UTC");

    const [executionRate, capacityUtilization, planningAccuracy, createdCount, completedCount] =
      await Promise.all([
        this.getExecutionRate(actorUserId, periodDays),
        this.getCapacityUtilization(actorUserId, periodDays),
        this.getPlanningAccuracy(actorUserId, periodDays),
        this.prisma.task.count({
          where: {
            userId: actorUserId,
            createdAt: { gte: new Date(snapshotDate.getTime() - periodDays * 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.taskInstance.count({
          where: {
            userId: actorUserId,
            date: { gte: new Date(snapshotDate.getTime() - periodDays * 24 * 60 * 60 * 1000) },
            status: "COMPLETED",
          },
        }),
      ]);

    return this.snapshotRepo.upsert({
      userId: actorUserId,
      snapshotDate,
      periodDays,
      analyticsVersion,
      executionRate: executionRate.taskCompletionPercent,
      timeExecutionRate: executionRate.timeExecutionPercent,
      planningAccuracy: planningAccuracy.accuracyScore,
      capacityUtilization: capacityUtilization.utilizationPercent,
      healthClassification: capacityUtilization.healthClassification,
      backlogDelta: createdCount - completedCount,
    });
  }

  /**
   * Consolidates execution rate, utilization, planning accuracy, and backlog velocity.
   * Checks stored AnalyticsSnapshot first for instant O(1) response.
   */
  async getAnalyticsSummary(
    actorUserId: string,
    range: "7d" | "30d" | "90d" = "7d",
    targetDateInput?: Date | string
  ): Promise<AnalyticsSummaryDto> {
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const targetDate = targetDateInput
      ? typeof targetDateInput === "string"
        ? TimezoneService.parseCalendarDate(targetDateInput)
        : TimezoneService.toLogicalCalendarDate(targetDateInput, 0, "UTC")
      : TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

    // 1. Check stored AnalyticsSnapshot first
    const stored = await this.snapshotRepo.findByUserAndDate(actorUserId, targetDate, days, 1);
    if (stored) {
      return {
        actorUserId,
        range,
        executionRate: {
          periodDays: days,
          totalTasksScheduled: 0,
          completedTasks: 0,
          missedTasks: 0,
          activeTasks: 0,
          blockedTasks: 0,
          taskCompletionPercent: Math.round(stored.executionRate),
          plannedMinutesTotal: 0,
          actualMinutesTotal: 0,
          timeExecutionPercent: Math.round(stored.timeExecutionRate),
        },
        capacityUtilization: {
          periodDays: days,
          totalDiscretionaryMinutes: 0,
          totalPlannedMinutes: 0,
          utilizationPercent: Math.round(stored.capacityUtilization),
          healthClassification: stored.healthClassification as any,
          overloadedDaysCount: 0,
          safeBufferDaysCount: days,
        },
        planningAccuracy: {
          periodDays: days,
          baselinePlannedHours: 0,
          actualExecutedHours: 0,
          varianceHours: 0,
          accuracyScore: Math.round(stored.planningAccuracy),
          revisionCountTotal: 0,
        },
        backlogDelta: {
          createdCount: 0,
          completedCount: 0,
          netChange: stored.backlogDelta,
        },
        generatedAt: stored.createdAt.toISOString(),
      };
    }

    // 2. Otherwise compute dynamically
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [executionRate, capacityUtilization, planningAccuracy, createdCount, completedCount] =
      await Promise.all([
        this.getExecutionRate(actorUserId, days),
        this.getCapacityUtilization(actorUserId, days),
        this.getPlanningAccuracy(actorUserId, days),
        this.prisma.task.count({
          where: {
            userId: actorUserId,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.taskInstance.count({
          where: {
            userId: actorUserId,
            date: { gte: startDate },
            status: "COMPLETED",
          },
        }),
      ]);

    return {
      actorUserId,
      range,
      executionRate,
      capacityUtilization,
      planningAccuracy,
      backlogDelta: {
        createdCount,
        completedCount,
        netChange: createdCount - completedCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
