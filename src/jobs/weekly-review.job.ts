import type { PrismaClient } from "@prisma/client";
import { JobRunner, type JobExecutionResult } from "./job-runner";
import { WeeklyReviewApplicationService } from "../services/weekly-review-app.service";
import { AnalyticsApplicationService } from "../services/analytics-app.service";
import { TimezoneService } from "../domain/time/timezone-service";

export async function runWeeklyReviewJob(
  prisma: PrismaClient,
  weekStartDateInput?: Date | string
): Promise<JobExecutionResult> {
  const runner = new JobRunner(prisma);
  const reviewService = new WeeklyReviewApplicationService(prisma);
  const analyticsService = new AnalyticsApplicationService(prisma);

  // If no date provided, default to current week's Monday
  const targetDate = weekStartDateInput
    ? typeof weekStartDateInput === "string"
      ? TimezoneService.parseCalendarDate(weekStartDateInput)
      : TimezoneService.toLogicalCalendarDate(weekStartDateInput, 0, "UTC")
    : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(now.setDate(diff));
        return TimezoneService.toLogicalCalendarDate(mon, 0, "UTC");
      })();

  const weekStartDateStr = targetDate.toISOString().slice(0, 10);

  return runner.executeJob("weekly-review-and-analytics-freeze", targetDate, async () => {
    const users = await prisma.user.findMany({ select: { id: true } });
    let reviewsGenerated = 0;
    let analyticsSnapshotsMaterialized = 0;

    for (const user of users) {
      // 1. Generate / refresh weekly review
      await reviewService.evaluateWeeklyReview(user.id, {
        weekStartDate: weekStartDateStr,
        safetyFactor: 1.10,
      });
      reviewsGenerated++;

      // 2. Materialize 7-day Analytics Snapshot
      await analyticsService.materializeSnapshot(user.id, targetDate, 7, 1);
      analyticsSnapshotsMaterialized++;
    }

    return {
      usersProcessed: users.length,
      reviewsGenerated,
      analyticsSnapshotsMaterialized,
      weekStartDate: weekStartDateStr,
    };
  });
}
