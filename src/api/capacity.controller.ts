import type { PrismaClient } from "@prisma/client";
import { CapacityEngine } from "../domain/capacity/capacity-engine";
import { WeeklyPlanningService } from "../services/weekly-planning.service";
import { PrismaCapacitySnapshotRepository } from "../repositories/capacity-snapshot.repository";

export class CapacityController {
  private capacityEngine = new CapacityEngine();
  private planningService: WeeklyPlanningService;
  private snapshotRepo: PrismaCapacitySnapshotRepository;

  constructor(private prisma: PrismaClient) {
    this.planningService = new WeeklyPlanningService(prisma);
    this.snapshotRepo = new PrismaCapacitySnapshotRepository(prisma);
  }

  /**
   * GET /api/capacity/today
   * Evaluates today's real capacity based on user's commitments and planned task instances.
   */
  async getTodayCapacity(userId: string, date: Date = new Date()) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        commitments: { where: { isActive: true } },
      },
    });

    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const todayCommitments = user.commitments.filter(c =>
      c.recurrenceDays.includes(dayOfWeek)
    );

    // Fetch actual task instances planned for today
    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
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
      plannedTasks: instances.map(i => ({
        id: i.id,
        title: i.title,
        durationMinutes: i.durationMinutes,
      })),
      forcePlanAnyway: true, // Read-only evaluation does not throw
    });

    return {
      date: date.toISOString().slice(0, 10),
      grossHours: Number((report.grossMinutes / 60).toFixed(1)),
      committedHours: Number((report.commitmentMinutes / 60).toFixed(1)),
      discretionaryHours: Number((report.discretionaryMinutes / 60).toFixed(1)),
      plannedHours: Number((report.plannedMinutes / 60).toFixed(1)),
      overloadHours: Number((report.overloadMinutes / 60).toFixed(1)),
      utilizationPercent: report.utilizationPercent,
      isOverloaded: report.isOverloaded,
      commitmentsCount: todayCommitments.length,
      tasksCount: instances.length,
      warning: report.warningMessage,
    };
  }

  /**
   * GET /api/capacity/week?startDate=YYYY-MM-DD
   * Computes 7-day capacity breakdown for the requested week.
   */
  async getWeekCapacity(userId: string, weekStartDateStr?: string) {
    const startDate = weekStartDateStr ? new Date(weekStartDateStr) : new Date();
    // Align to Monday
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const snapshots = await this.snapshotRepo.findRange(userId, startDate, endDate);

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

  /**
   * POST /api/weekly-plan
   * Sunday Reality Check: Creates WeeklyPlan with Version 1 (Baseline).
   */
  async createWeeklyPlan(
    userId: string,
    body: {
      weekStartDate: string;
      plannedTasks: Array<{ title: string; durationMinutes: number }>;
      forceOverride?: boolean;
      changeReason?: string;
    }
  ) {
    return this.planningService.runSundayRealityCheck({
      userId,
      weekStartDate: new Date(body.weekStartDate),
      plannedTasks: body.plannedTasks,
      forceOverride: body.forceOverride,
      changeReason: body.changeReason,
    });
  }

  /**
   * GET /api/weekly-plan/:id
   * Retrieves WeeklyPlan with complete immutable revision history.
   */
  async getWeeklyPlan(userId: string, planId: string) {
    const plan = await this.prisma.weeklyPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        revisions: {
          orderBy: { version: "asc" },
        },
      },
    });

    if (plan.userId !== userId) {
      throw new Error("Unauthorized access to weekly plan.");
    }

    return {
      id: plan.id,
      userId: plan.userId,
      weekStartDate: plan.weekStartDate.toISOString().slice(0, 10),
      weekEndDate: plan.weekEndDate.toISOString().slice(0, 10),
      currentVersion: plan.currentVersion,
      status: plan.status,
      revisions: plan.revisions.map(r => ({
        version: r.version,
        grossAvailableHours: r.grossAvailableHours,
        committedHours: r.committedHours,
        netAvailableHours: r.netAvailableHours,
        plannedHours: r.plannedHours,
        actualHours: r.actualHours,
        isOverloaded: r.isOverloaded,
        overloadHours: r.overloadHours,
        changeReason: r.changeReason,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}