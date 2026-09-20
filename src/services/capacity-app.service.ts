import type { PrismaClient } from "@prisma/client";
import { CapacityEngine } from "../domain/capacity/capacity-engine";
import { TimezoneService } from "../domain/time/timezone-service";
import { PrismaCapacitySnapshotRepository } from "../repositories/capacity-snapshot.repository";
import type {
  CapacityRemainingResponseDto,
  DailyCapacityReportDto,
  WeeklyCapacityReportDto,
} from "../dtos/capacity.dto";

export class CapacityApplicationService {
  private capacityEngine = new CapacityEngine();
  private snapshotRepo: PrismaCapacitySnapshotRepository;

  constructor(private prisma: PrismaClient) {
    this.snapshotRepo = new PrismaCapacitySnapshotRepository(prisma);
  }

  /**
   * GET /api/capacity/remaining
   * Primary Capacity Gatekeeper: Computes remaining discretionary capacity for today.
   */
  async getRemainingCapacity(
    actorUserId: string,
    date: Date = new Date()
  ): Promise<CapacityRemainingResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: {
        commitments: { where: { isActive: true } },
      },
    });

    const targetDate = TimezoneService.toLogicalCalendarDate(date, user.logicalDayCutoffHour, "UTC");
    const dayOfWeek = targetDate.getUTCDay();
    const todayCommitments = user.commitments.filter(c =>
      c.recurrenceDays.includes(dayOfWeek)
    );

    const commitmentMinutes = todayCommitments.reduce((sum, c) => sum + c.durationMinutes, 0);
    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: targetDate,
      },
      select: { id: true, title: true, durationMinutes: true },
    });

    const report = this.capacityEngine.evaluateCapacity({
      dayStartMinute: user.dayStartHour * 60,
      dayCutoffMinute: user.logicalDayCutoffHour * 60,
      dailySleepHours: user.dailySleepHours,
      commitments: todayCommitments.map(c => ({
        ...c,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      plannedTasks: instances,
      forcePlanAnyway: true,
      activeProfile: user.activeProfile,
    });

    return {
      remainingMinutes: Math.max(0, report.discretionaryMinutes - report.plannedMinutes),
      remainingHours: Number((Math.max(0, report.discretionaryMinutes - report.plannedMinutes) / 60).toFixed(1)),
      plannedMinutes: report.plannedMinutes,
      commitmentMinutes: report.commitmentMinutes,
      availableMinutes: report.discretionaryMinutes,
    };
  }

  /**
   * Returns active commitments for the specified date
   */
  async getTodayCommitments(actorUserId: string, date: Date = new Date()) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: {
        commitments: {
          where: { isActive: true },
          orderBy: { startMinute: "asc" },
        },
      },
    });

    const dayOfWeek = date.getDay();
    return user.commitments.filter(c => c.recurrenceDays.includes(dayOfWeek));
  }

  /**
   * GET /api/capacity/today
   * Enforces Snapshot Immutability:
   * Historical dates (date < today) strictly read stored snapshots.
   * Never recalculates past days using today's mutable commitments.
   */
  async getTodayCapacity(
    actorUserId: string,
    requestedDate: Date | string = new Date()
  ): Promise<DailyCapacityReportDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: {
        commitments: { where: { isActive: true } },
      },
    });

    const todayDate = TimezoneService.toLogicalCalendarDate(new Date(), user.logicalDayCutoffHour, "UTC");
    const targetDate = typeof requestedDate === "string"
      ? TimezoneService.parseCalendarDate(requestedDate)
      : TimezoneService.toLogicalCalendarDate(requestedDate, 0, "UTC");

    const targetDateStr = targetDate.toISOString().slice(0, 10);
    const isHistorical = TimezoneService.isHistoricalDate(targetDate, todayDate);

    // 1. Historical Date Requested
    if (isHistorical) {
      const snapshot = await this.snapshotRepo.findByUserAndDate(actorUserId, targetDate);
      if (!snapshot) {
        return {
          date: targetDateStr,
          status: "HISTORICAL_DATA_UNAVAILABLE",
          grossHours: 0,
          committedHours: 0,
          discretionaryHours: 0,
          plannedHours: 0,
          overloadHours: 0,
          utilizationPercent: 0,
          isOverloaded: false,
          commitmentsCount: 0,
          tasksCount: 0,
          message: `Historical capacity snapshot was not recorded for date ${targetDateStr}. Historical capacity is immutable and never reconstructed retroactively.`,
        };
      }

      const grossHours = Number((snapshot.grossMinutes / 60).toFixed(1));
      const committedHours = Number((snapshot.commitmentMinutes / 60).toFixed(1));
      const discretionaryHours = Number((snapshot.discretionaryMinutes / 60).toFixed(1));
      const plannedHours = Number((snapshot.plannedMinutes / 60).toFixed(1));
      const overloadHours = Number((snapshot.overloadMinutes / 60).toFixed(1));
      const utilizationPercent = snapshot.discretionaryMinutes > 0
        ? Math.min(100, Math.round((snapshot.plannedMinutes / snapshot.discretionaryMinutes) * 100))
        : 0;

      return {
        date: targetDateStr,
        status: "AVAILABLE",
        grossHours,
        committedHours,
        discretionaryHours,
        plannedHours,
        overloadHours,
        utilizationPercent,
        isOverloaded: snapshot.overloadMinutes > 0,
        commitmentsCount: 0,
        tasksCount: 0,
      };
    }

    // 2. Active (Today / Future) Date Requested
    const dayOfWeek = targetDate.getUTCDay();
    const activeCommitments = user.commitments.filter(c =>
      c.recurrenceDays.includes(dayOfWeek)
    );

    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: targetDate,
      },
    });

    const report = this.capacityEngine.evaluateCapacity({
      dayStartMinute: user.dayStartHour * 60,
      dayCutoffMinute: user.logicalDayCutoffHour * 60,
      dailySleepHours: user.dailySleepHours,
      commitments: activeCommitments.map(c => ({
        ...c,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      plannedTasks: instances.map(i => ({
        id: i.id,
        title: i.title,
        durationMinutes: i.durationMinutes,
      })),
      forcePlanAnyway: true,
      activeProfile: user.activeProfile,
    });

    // Auto-update today's snapshot so it is captured for future history
    if (targetDate.getTime() === todayDate.getTime()) {
      await this.snapshotRepo.upsert({
        userId: actorUserId,
        date: targetDate,
        grossMinutes: report.grossMinutes,
        commitmentMinutes: report.commitmentMinutes,
        discretionaryMinutes: report.discretionaryMinutes,
        plannedMinutes: report.plannedMinutes,
        overloadMinutes: report.overloadMinutes,
      });
    }

    return {
      date: targetDateStr,
      status: "AVAILABLE",
      grossHours: Number((report.grossMinutes / 60).toFixed(1)),
      committedHours: Number((report.commitmentMinutes / 60).toFixed(1)),
      discretionaryHours: Number((report.discretionaryMinutes / 60).toFixed(1)),
      plannedHours: Number((report.plannedMinutes / 60).toFixed(1)),
      overloadHours: Number((report.overloadMinutes / 60).toFixed(1)),
      utilizationPercent: report.utilizationPercent,
      isOverloaded: report.isOverloaded,
      commitmentsCount: activeCommitments.length,
      tasksCount: instances.length,
      warning: report.warningMessage,
    };
  }

  /**
   * GET /api/capacity/week
   */
  async getWeekCapacity(
    actorUserId: string,
    weekStartDateStr?: string
  ): Promise<WeeklyCapacityReportDto> {
    const startDate = weekStartDateStr ? new Date(weekStartDateStr) : new Date();
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const snapshots = await this.snapshotRepo.findRange(actorUserId, startDate, endDate);

    return {
      weekStartDate: startDate.toISOString().slice(0, 10),
      weekEndDate: endDate.toISOString().slice(0, 10),
      daysCount: snapshots.length,
      snapshots: snapshots.map(s => ({
        date: s.date.toISOString().slice(0, 10),
        grossMinutes: s.grossMinutes,
        commitmentMinutes: s.commitmentMinutes,
        discretionaryMinutes: s.discretionaryMinutes,
        plannedMinutes: s.plannedMinutes,
        overloadMinutes: s.overloadMinutes,
      })),
    };
  }
}