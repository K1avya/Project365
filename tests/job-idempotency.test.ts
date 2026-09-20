import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { JobRunner } from "../src/jobs/job-runner.js";
import { PrismaJobExecutionRepository } from "../src/repositories/job-execution.repository.js";
import { runGenerateDailyInstancesJob } from "../src/jobs/generate-daily-instances.job.js";
import { runCreateCapacitySnapshotsJob } from "../src/jobs/create-capacity-snapshots.job.js";
import { runStaleTaskDetectorJob } from "../src/jobs/stale-task-detector.job.js";
import { TimezoneService } from "../src/domain/time/timezone-service.js";

describe("Distributed Job Idempotency & Distributed Locking Gate", () => {
  let testUserId: string;
  let testAreaId: string;
  const testDate = TimezoneService.parseCalendarDate("2026-10-15");
  const lockRepo = new PrismaJobExecutionRepository(prisma);

  beforeAll(async () => {
    // 1. Create isolated test user
    const user = await prisma.user.create({
      data: {
        email: `job-lock-test-${Date.now()}@project365.local`,
        name: "Job Lock Tester",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    testUserId = user.id;

    // 2. Create life area and templates
    const area = await prisma.lifeArea.create({
      data: {
        userId: testUserId,
        type: "ACADEMIC",
        name: "Systems Engineering",
        color: "#10b981",
      },
    });
    testAreaId = area.id;

    await prisma.task.create({
      data: {
        userId: testUserId,
        areaId: testAreaId,
        title: "Distributed Systems Architecture",
        durationMinutes: 90,
        recurrenceDays: [1, 2, 3, 4, 5, 6, 7],
      },
    });

    await prisma.task.create({
      data: {
        userId: testUserId,
        areaId: testAreaId,
        title: "Database Concurrency Benchmarks",
        durationMinutes: 60,
        recurrenceDays: [1, 2, 3, 4, 5, 6, 7],
      },
    });
  });

  afterAll(async () => {
    // Clean up all test job executions, events, instances, tasks, areas, users
    await prisma.jobExecution.deleteMany({
      where: {
        jobName: {
          in: [
            "generate-daily-instances",
            "create-capacity-snapshots",
            "stale-task-detector",
            "weekly-review",
            "simulated-concurrent-job",
            "stale-recovery-job",
            "retry-backoff-job",
          ],
        },
      },
    });

    await prisma.taskEvent.deleteMany({
      where: { instance: { userId: testUserId } },
    });
    await prisma.taskInstance.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.capacitySnapshot.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.task.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.lifeArea.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it("1. Consecutive executions of generate-daily-instances are completely idempotent", async () => {
    // Run 1: First execution creates the instances and claims lock
    const run1 = await runGenerateDailyInstancesJob(prisma, testDate);
    expect(run1.ran).toBe(true);
    expect(run1.success).toBe(true);

    const instancesCountRun1 = await prisma.taskInstance.count({
      where: { userId: testUserId, date: testDate },
    });
    expect(instancesCountRun1).toBe(2);

    // Run 2: Immediately run again for the same date
    const run2 = await runGenerateDailyInstancesJob(prisma, testDate);
    expect(run2.ran).toBe(false);
    expect(run2.skipReason).toBe("ALREADY_COMPLETED");

    // Run 3: Third run also skipped
    const run3 = await runGenerateDailyInstancesJob(prisma, testDate);
    expect(run3.ran).toBe(false);
    expect(run3.skipReason).toBe("ALREADY_COMPLETED");

    // Verify ZERO duplicate instances were materialized
    const instancesCountRun3 = await prisma.taskInstance.count({
      where: { userId: testUserId, date: testDate },
    });
    expect(instancesCountRun3).toBe(2);
  });

  it("2. Concurrent worker simulation: exactly one worker acquires lock, other skips safely", async () => {
    const jobName = "simulated-concurrent-job";
    const runnerA = new JobRunner(prisma);
    const runnerB = new JobRunner(prisma);

    let executedCount = 0;
    const workerTask = async () => {
      // Simulate slight execution delay
      await new Promise(res => setTimeout(res, 50));
      executedCount++;
      return { status: "done" };
    };

    // Trigger both simultaneously
    const [resultA, resultB] = await Promise.all([
      runnerA.executeJob(jobName, testDate, workerTask),
      runnerB.executeJob(jobName, testDate, workerTask),
    ]);

    // Exactly one must have run, the other must have skipped
    const ranCount = (resultA.ran ? 1 : 0) + (resultB.ran ? 1 : 0);
    expect(ranCount).toBe(1);
    expect(executedCount).toBe(1);

    const skippedResult = resultA.ran ? resultB : resultA;
    expect(skippedResult.ran).toBe(false);
    expect(["CURRENTLY_RUNNING", "ALREADY_COMPLETED"]).toContain(skippedResult.skipReason);

    // Verify DB record status is COMPLETED
    const dbExecution = await lockRepo.findByJobAndDate(jobName, testDate);
    expect(dbExecution?.status).toBe("COMPLETED");
    expect(dbExecution?.completedAt).not.toBeNull();
  });

  it("3. Lease timeout recovery: detects stale RUNNING lock and recovers safely", async () => {
    const jobName = "stale-recovery-job";

    // Simulate a dead worker that crashed 15 minutes ago while RUNNING
    const staleStartTime = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.jobExecution.create({
      data: {
        jobName,
        logicalDate: testDate,
        status: "RUNNING",
        startedAt: staleStartTime,
        attemptCount: 1,
      },
    });

    const runner = new JobRunner(prisma);
    let recoveredExecution = false;

    // Timeout is 10 minutes (600,000 ms), so 15 min old lock should be overridden
    const result = await runner.executeJob(
      jobName,
      testDate,
      async () => {
        recoveredExecution = true;
        return { recovered: true };
      },
      { staleTimeoutMs: 10 * 60 * 1000 }
    );

    expect(result.ran).toBe(true);
    expect(result.success).toBe(true);
    expect(recoveredExecution).toBe(true);

    const updatedRecord = await lockRepo.findByJobAndDate(jobName, testDate);
    expect(updatedRecord?.status).toBe("COMPLETED");
    expect(updatedRecord?.attemptCount).toBe(2);
  });

  it("4. Failure backoff and retry scheduling", async () => {
    const jobName = "retry-backoff-job";
    const runner = new JobRunner(prisma);

    // Attempt 1: Job fails
    const failResult = await runner.executeJob(
      jobName,
      testDate,
      async () => {
        throw new Error("Simulated connection timeout");
      },
      { maxAttempts: 3, retryDelaySeconds: 60 }
    );

    expect(failResult.ran).toBe(true);
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain("Simulated connection timeout");

    const failedExecution = await lockRepo.findByJobAndDate(jobName, testDate);
    expect(failedExecution?.status).toBe("RETRY_PENDING");
    expect(failedExecution?.attemptCount).toBe(1);
    expect(failedExecution?.nextRetryAt).not.toBeNull();

    // Immediate Attempt 2: Must be rejected due to active retry backoff window
    const immediateRetry = await runner.executeJob(
      jobName,
      testDate,
      async () => {
        return { ok: true };
      },
      { maxAttempts: 3, retryDelaySeconds: 60 }
    );

    expect(immediateRetry.ran).toBe(false);
    expect(immediateRetry.skipReason).toBe("RETRY_NOT_DUE");
  });

  it("5. Capacity snapshot and stale task detector jobs execute safely under locking", async () => {
    const snapResult1 = await runCreateCapacitySnapshotsJob(prisma, testDate);
    expect(snapResult1.ran).toBe(true);
    expect(snapResult1.success).toBe(true);

    // Second run should be skipped
    const snapResult2 = await runCreateCapacitySnapshotsJob(prisma, testDate);
    expect(snapResult2.ran).toBe(false);
    expect(snapResult2.skipReason).toBe("ALREADY_COMPLETED");

    // Stale task detector job
    const staleResult1 = await runStaleTaskDetectorJob(prisma, testDate);
    expect(staleResult1.ran).toBe(true);
    expect(staleResult1.success).toBe(true);

    const staleResult2 = await runStaleTaskDetectorJob(prisma, testDate);
    expect(staleResult2.ran).toBe(false);
    expect(staleResult2.skipReason).toBe("ALREADY_COMPLETED");
  });
});
