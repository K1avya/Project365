import type { PrismaClient } from "@prisma/client";
import { CapacityEngine, type TaskDurationItem } from "../domain/capacity/capacity-engine.js";
import { PrismaCapacitySnapshotRepository } from "../repositories/capacity-snapshot.repository.js";
import { PrismaWeeklyPlanRepository } from "../repositories/weekly-plan.repository.js";

export interface SundayRealityCheckInput {
  userId: string;
  weekStartDate: Date; // Monday
  plannedTasks: TaskDurationItem[];
  changeReason?: string;
  forceOverride?: boolean;
}

export interface SundayRealityCheckResult {
  weeklyPlanId: string;
  version: number;
  grossAvailableHours: number;
  committedHours: number;
  netAvailableHours: number;
  plannedHours: number;
  maximumSafeWorkloadHours: number;
  isOverloaded: boolean;
  overloadHours: number;
  warningMessage?: string;
}

export class WeeklyPlanningService {
  private capacityEngine = new CapacityEngine();
  private snapshotRepo: PrismaCapacitySnapshotRepository;
  private weeklyPlanRepo: PrismaWeeklyPlanRepository;

  constructor(private prisma: PrismaClient) {
    this.snapshotRepo = new PrismaCapacitySnapshotRepository(prisma);
    this.weeklyPlanRepo = new PrismaWeeklyPlanRepository(prisma);
  }

  /**
   * Executes the Sunday Reality Check:
   * 1. Aggregates weekly commitments across 7 days
   * 2. Computes Maximum Safe Workload
   * 3. Enforces Reality Gate: Planned Hours <= Net Discretionary Capacity
   * 4. Creates Version 1 (Sunday Baseline) without mutating history
   * 5. Persists daily CapacitySnapshots for historical analytics
   */
  async runSundayRealityCheck(input: SundayRealityCheckInput): Promise<SundayRealityCheckResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      include: { commitments: true },
    });

    const activeCommitments = user.commitments.filter(c => c.isActive);

    // Calculate daily capacity across 7 days of the target week
    let totalGrossMin = 0;
    let totalCommitmentMin = 0;
    let totalDiscretionaryMin = 0;

    const weekStartDate = new Date(input.weekStartDate);
    weekStartDate.setHours(0, 0, 0, 0);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDay = new Date(weekStartDate);
      currentDay.setDate(currentDay.getDate() + dayOffset);
      const dayOfWeek = currentDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      // Filter commitments active on this day
      const dayCommitments = activeCommitments.filter(c =>
        c.recurrenceDays.includes(dayOfWeek)
      );

      const report = this.capacityEngine.evaluateCapacity({
        dayStartMinute: user.dayStartHour * 60,
        dayCutoffMinute: user.logicalDayCutoffHour * 60,
        dailySleepHours: user.dailySleepHours,
        commitments: dayCommitments,
        plannedTasks: [], // Evaluated globally for the week
        forcePlanAnyway: true, // Generate metrics for daily snapshot
      });

      totalGrossMin += report.grossMinutes;
      totalCommitmentMin += report.commitmentMinutes;
      totalDiscretionaryMin += report.discretionaryMinutes;

      // Persist daily CapacitySnapshot
      await this.snapshotRepo.upsert({
        userId: user.id,
        date: currentDay,
        grossMinutes: report.grossMinutes,
        commitmentMinutes: report.commitmentMinutes,
        discretionaryMinutes: report.discretionaryMinutes,
        plannedMinutes: 0,
        overloadMinutes: 0,
      });
    }

    const netAvailableHours = Number((totalDiscretionaryMin / 60).toFixed(1));
    const grossAvailableHours = Number((totalGrossMin / 60).toFixed(1));
    const committedHours = Number((totalCommitmentMin / 60).toFixed(1));

    const totalPlannedMin = input.plannedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const plannedHours = Number((totalPlannedMin / 60).toFixed(1));

    const isOverloaded = totalPlannedMin > totalDiscretionaryMin;
    const overloadMin = isOverloaded ? totalPlannedMin - totalDiscretionaryMin : 0;
    const overloadHours = Number((overloadMin / 60).toFixed(1));

    // Reality Gate Enforcement: BLOCK SAVE unless forceOverride is active
    if (isOverloaded && !input.forceOverride) {
      throw new Error(
        `[SUNDAY REALITY CHECK BLOCKED] Planned time (${plannedHours}h) exceeds Maximum Safe Workload (${netAvailableHours}h) by ${overloadHours}h. Workload must be reduced or override authorized.`
      );
    }

    // Persist or update WeeklyPlan with Version 1 (Baseline)
    const existingPlan = await this.weeklyPlanRepo.findByUserAndWeek(input.userId, weekStartDate);

    let planId: string;
    let version: number;

    if (!existingPlan) {
      const plan = await this.weeklyPlanRepo.createWithInitialRevision({
        userId: input.userId,
        weekStartDate,
        weekEndDate,
        grossAvailableHours,
        committedHours,
        netAvailableHours,
        plannedHours,
        changeReason: input.changeReason ?? "Sunday Baseline Plan",
        snapshotPayload: {
          taskCount: input.plannedTasks.length,
          tasks: input.plannedTasks,
        },
      });
      planId = plan.id;
      version = 1;
    } else {
      // Create new Revision (Rule 3: Never overwrite history)
      const revision = await this.weeklyPlanRepo.addRevision({
        weeklyPlanId: existingPlan.id,
        grossAvailableHours,
        committedHours,
        netAvailableHours,
        plannedHours,
        isOverloaded,
        overloadHours,
        changeReason: input.changeReason ?? "Sunday Plan Rebalance",
        snapshotPayload: {
          taskCount: input.plannedTasks.length,
          tasks: input.plannedTasks,
        },
      });
      planId = existingPlan.id;
      version = revision.version;
    }

    return {
      weeklyPlanId: planId,
      version,
      grossAvailableHours,
      committedHours,
      netAvailableHours,
      plannedHours,
      maximumSafeWorkloadHours: netAvailableHours,
      isOverloaded,
      overloadHours,
      warningMessage: isOverloaded
        ? `Overloaded by ${overloadHours}h against Sunday baseline.`
        : undefined,
    };
  }

  /**
   * Revises a plan mid-week (e.g. Version 2 for Exam Week, Version 3 for Hackathon),
   * creating an immutable revision without destroying past planning baseline.
   */
  async revisePlanMidWeek(
    weeklyPlanId: string,
    reason: string,
    updatedTasks: TaskDurationItem[],
    forceOverride = false
  ) {
    const plan = await this.prisma.weeklyPlan.findUniqueOrThrow({
      where: { id: weeklyPlanId },
      include: {
        revisions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    const latestRevision = plan.revisions[0];
    const totalPlannedMin = updatedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const plannedHours = Number((totalPlannedMin / 60).toFixed(1));

    const isOverloaded = totalPlannedMin > (latestRevision.netAvailableHours * 60);
    const overloadMin = isOverloaded ? totalPlannedMin - (latestRevision.netAvailableHours * 60) : 0;
    const overloadHours = Number((overloadMin / 60).toFixed(1));

    if (isOverloaded && !forceOverride) {
      throw new Error(
        `[PLAN REVISION BLOCKED] Revised planned time (${plannedHours}h) exceeds Net Capacity (${latestRevision.netAvailableHours}h) by ${overloadHours}h.`
      );
    }

    return this.weeklyPlanRepo.addRevision({
      weeklyPlanId,
      grossAvailableHours: latestRevision.grossAvailableHours,
      committedHours: latestRevision.committedHours,
      netAvailableHours: latestRevision.netAvailableHours,
      plannedHours,
      isOverloaded,
      overloadHours,
      changeReason: reason,
      snapshotPayload: {
        taskCount: updatedTasks.length,
        tasks: updatedTasks,
      },
    });
  }
}