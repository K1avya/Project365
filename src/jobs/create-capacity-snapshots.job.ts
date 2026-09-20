import type { PrismaClient } from "@prisma/client";
import { JobRunner, type JobExecutionResult } from "./job-runner";
import { CapacityApplicationService } from "../services/capacity-app.service";
import { TimezoneService } from "../domain/time/timezone-service";

export async function runCreateCapacitySnapshotsJob(
  prisma: PrismaClient,
  targetDateInput?: Date | string
): Promise<JobExecutionResult> {
  const runner = new JobRunner(prisma);
  const capacityService = new CapacityApplicationService(prisma);

  const targetDate = targetDateInput
    ? typeof targetDateInput === "string"
      ? TimezoneService.parseCalendarDate(targetDateInput)
      : TimezoneService.toLogicalCalendarDate(targetDateInput, 0, "UTC")
    : TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

  return runner.executeJob("create-capacity-snapshots", targetDate, async () => {
    const users = await prisma.user.findMany({ select: { id: true } });
    let snapshotsFrozen = 0;

    for (const user of users) {
      const report = await capacityService.getTodayCapacity(user.id, targetDate);
      if (report.status === "AVAILABLE") {
        snapshotsFrozen++;
      }
    }

    return {
      usersEvaluated: users.length,
      snapshotsFrozen,
    };
  });
}
