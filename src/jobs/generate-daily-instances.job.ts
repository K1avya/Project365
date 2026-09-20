import type { PrismaClient } from "@prisma/client";
import { JobRunner, type JobExecutionResult } from "./job-runner.js";
import { TaskInstanceApplicationService } from "../services/task-instance-app.service.js";
import { TimezoneService } from "../domain/time/timezone-service.js";

export async function runGenerateDailyInstancesJob(
  prisma: PrismaClient,
  targetDateInput?: Date | string
): Promise<JobExecutionResult> {
  const runner = new JobRunner(prisma);
  const instanceService = new TaskInstanceApplicationService(prisma);

  const targetDate = targetDateInput
    ? typeof targetDateInput === "string"
      ? TimezoneService.parseCalendarDate(targetDateInput)
      : TimezoneService.toLogicalCalendarDate(targetDateInput, 0, "UTC")
    : TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

  return runner.executeJob("generate-daily-instances", targetDate, async () => {
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    let totalGenerated = 0;

    for (const user of users) {
      const generated = await instanceService.generateDailyInstances(user.id, targetDate);
      totalGenerated += generated.length;
    }

    return {
      usersProcessed: users.length,
      totalInstancesMaterialized: totalGenerated,
    };
  });
}
