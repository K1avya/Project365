import type { PrismaClient } from "@prisma/client";
import { JobRunner, type JobExecutionResult } from "./job-runner";
import { TimezoneService } from "../domain/time/timezone-service";

export async function runStaleTaskDetectorJob(
  prisma: PrismaClient,
  referenceDateInput?: Date | string
): Promise<JobExecutionResult> {
  const runner = new JobRunner(prisma);

  const todayDate = referenceDateInput
    ? typeof referenceDateInput === "string"
      ? TimezoneService.parseCalendarDate(referenceDateInput)
      : TimezoneService.toLogicalCalendarDate(referenceDateInput, 0, "UTC")
    : TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

  return runner.executeJob("stale-task-detector", todayDate, async () => {
    // 1. Safe Active Transition (Rule 5):
    // Active tasks from prior logical days transition ACTIVE -> PAUSED with SYSTEM_PAUSED event
    const activeTasksPriorDay = await prisma.taskInstance.findMany({
      where: {
        date: { lt: todayDate },
        status: "ACTIVE",
      },
      select: { id: true, userId: true, title: true },
    });

    let activeToPausedCount = 0;
    for (const inst of activeTasksPriorDay) {
      await prisma.$transaction(async tx => {
        await tx.taskInstance.update({
          where: { id: inst.id },
          data: { status: "PAUSED" },
        });

        await tx.taskEvent.create({
          data: {
            taskInstanceId: inst.id,
            eventType: "PAUSED",
            payload: {
              reason: "SYSTEM_PAUSED_AT_DAY_BOUNDARY",
              note: "Logical day boundary reached while task was in progress.",
            },
          },
        });
      });
      activeToPausedCount++;
    }

    // 2. Transition uncompleted PENDING or older unresumed PAUSED tasks to MISSED
    // Tasks strictly older than today (e.g. date < today) that are still PENDING or PAUSED
    const unresumedTasks = await prisma.taskInstance.findMany({
      where: {
        date: { lt: todayDate },
        status: { in: ["PENDING", "PAUSED"] },
      },
      select: { id: true },
    });

    let markedMissedCount = 0;
    for (const inst of unresumedTasks) {
      await prisma.$transaction(async tx => {
        await tx.taskInstance.update({
          where: { id: inst.id },
          data: { status: "MISSED" },
        });

        await tx.taskEvent.create({
          data: {
            taskInstanceId: inst.id,
            eventType: "MISSED",
            payload: {
              reason: "EXPIRED_AT_LOGICAL_DAY_CLOSE",
            },
          },
        });
      });
      markedMissedCount++;
    }

    return {
      activeToPausedCount,
      markedMissedCount,
      evaluatedDate: todayDate.toISOString().slice(0, 10),
    };
  });
}
