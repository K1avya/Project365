import type { PrismaClient } from "@prisma/client";
import { TimezoneService } from "../domain/time/timezone-service";
import type {
  WeeklyReviewReportDto,
  SubmitWeeklyReviewRequestDto,
  TopBottleneckDto,
} from "../dtos/weekly-review.dto";

export class WeeklyReviewApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates the closing week and generates a data-driven reality review report.
   */
  async evaluateWeeklyReview(
    actorUserId: string,
    input: SubmitWeeklyReviewRequestDto
  ): Promise<WeeklyReviewReportDto> {
    const weekStartDate = TimezoneService.parseCalendarDate(input.weekStartDate);
    const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: { commitments: { where: { isActive: true } } },
    });

    // 1. Fetch Weekly Plan & Revisions
    const weeklyPlan = await this.prisma.weeklyPlan.findFirst({
      where: {
        userId: actorUserId,
        weekStartDate,
      },
      include: {
        revisions: { orderBy: { version: "desc" } },
      },
    });

    // 2. Fetch all task instances executed during this week
    const instances = await this.prisma.taskInstance.findMany({
      where: {
        userId: actorUserId,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
      include: {
        task: true,
      },
    });

    const totalScheduled = instances.length;
    const completedInstances = instances.filter(i => i.status === "COMPLETED");
    const missedInstances = instances.filter(i => i.status === "MISSED");
    const blockedInstances = instances.filter(i => i.status === "BLOCKED");

    const plannedMinutes = instances.reduce((s, i) => s + i.durationMinutes, 0);
    const actualMinutes = instances.reduce((s, i) => s + i.actualMinutes, 0);

    const plannedHours = Number((plannedMinutes / 60).toFixed(1));
    const actualHours = Number((actualMinutes / 60).toFixed(1));

    const executionRatePercent = totalScheduled > 0
      ? Math.round((completedInstances.length / totalScheduled) * 100)
      : 0;

    let planningAccuracyPercent = 100;
    if (plannedHours > 0) {
      const errorRatio = Math.abs(plannedHours - actualHours) / plannedHours;
      planningAccuracyPercent = Math.max(0, Math.round((1 - Math.min(1, errorRatio)) * 100));
    }

    // 3. Extract Top Bottlenecks
    const topBottlenecks: TopBottleneckDto[] = [];

    // Check high pause duration (> 15 min paused)
    for (const inst of instances) {
      if (inst.pausedMs >= 15 * 60 * 1000) {
        topBottlenecks.push({
          taskId: inst.taskId,
          title: inst.title,
          reason: "HIGH_PAUSE_DURATION",
          details: `Paused for ${Math.round(inst.pausedMs / 60000)} minutes during execution.`,
        });
      }
    }

    // Check missed tasks
    for (const inst of missedInstances) {
      topBottlenecks.push({
        taskId: inst.taskId,
        title: inst.title,
        reason: "MISSED_TASK",
        details: `Scheduled for ${inst.durationMinutes} min but never executed.`,
      });
    }

    // Check blocked tasks
    for (const inst of blockedInstances) {
      topBottlenecks.push({
        taskId: inst.taskId,
        title: inst.title,
        reason: "BLOCKED_DEPENDENCY",
        details: "Blocked on prerequisite tasks that were unfulfilled.",
      });
    }

    // 4. Backlog Delta (Created vs Cleared during week)
    const backlogCreated = await this.prisma.task.count({
      where: {
        userId: actorUserId,
        createdAt: {
          gte: weekStartDate,
          lte: new Date(weekEndDate.getTime() + 24 * 60 * 60 * 1000 - 1),
        },
      },
    });
    const backlogCleared = completedInstances.length;

    // 5. Data-Based Reality Recommendation (Required Change #4)
    // recommendedHours = min(availableDiscretionaryHours, actualHours * safetyFactor)
    const safetyFactor = input.safetyFactor ?? 1.10;
    const dailyGrossMinutes = Math.round(1440 - user.dailySleepHours * 60);
    const weeklyCommitmentMinutes = user.commitments.reduce((sum, c) => {
      const daysCount = c.recurrenceDays.length;
      return sum + c.durationMinutes * daysCount;
    }, 0);

    const weeklyDiscretionaryMinutes = Math.max(0, dailyGrossMinutes * 7 - weeklyCommitmentMinutes);
    const availableDiscretionaryHours = Number((weeklyDiscretionaryMinutes / 60).toFixed(1));

    // Reality Formula
    const baseRecommended = actualHours > 0 ? actualHours * safetyFactor : plannedHours * 0.9;
    const recommendedHoursNextWeek = Number(
      Math.min(availableDiscretionaryHours, Math.round(baseRecommended * 10) / 10).toFixed(1)
    );

    // 6. Record or update review snapshot in latest WeeklyPlanRevision
    if (weeklyPlan && weeklyPlan.revisions.length > 0) {
      const latestRev = weeklyPlan.revisions[0];
      await this.prisma.weeklyPlanRevision.update({
        where: { id: latestRev.id },
        data: {
          actualHours,
          changeReason: input.reflectionNotes ?? latestRev.changeReason,
          snapshotPayload: {
            executionRatePercent,
            planningAccuracyPercent,
            recommendedHoursNextWeek,
            safetyFactor,
            topBottlenecks,
            backlogCreated,
            backlogCleared,
            reviewedAt: new Date().toISOString(),
          } as any,
        },
      });
    }

    return {
      id: weeklyPlan?.id ?? `review-${input.weekStartDate}`,
      userId: actorUserId,
      weekStartDate: input.weekStartDate,
      weekEndDate: weekEndDate.toISOString().slice(0, 10),
      plannedHours,
      actualHours,
      executionRatePercent,
      planningAccuracyPercent,
      availableDiscretionaryHours,
      recommendedHoursNextWeek,
      safetyFactor,
      topBottlenecks: topBottlenecks.slice(0, 5),
      backlogCreated,
      backlogCleared,
      reflectionNotes: input.reflectionNotes ?? null,
      reviewedAt: new Date().toISOString(),
    };
  }
}
