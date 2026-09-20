import type { PrismaClient, JobExecution } from "@prisma/client";

export type LockAcquisitionResult =
  | { acquired: true; execution: JobExecution }
  | { acquired: false; reason: "ALREADY_COMPLETED" | "CURRENTLY_RUNNING" | "RETRY_NOT_DUE" | "MAX_ATTEMPTS_EXCEEDED" };

export class PrismaJobExecutionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Distributed Lock Acquisition:
   * Uses PostgreSQL unique constraint [jobName, logicalDate] for atomic multi-replica claiming.
   */
  async claimLock(
    jobName: string,
    logicalDate: Date,
    staleLockTimeoutMs: number = 10 * 60 * 1000, // 10 min lease timeout
    maxAttempts: number = 3
  ): Promise<LockAcquisitionResult> {
    const now = new Date();

    try {
      // 1. First attempt: Insert new execution lock
      const created = await this.prisma.jobExecution.create({
        data: {
          jobName,
          logicalDate,
          status: "RUNNING",
          attemptCount: 1,
          startedAt: now,
        },
      });

      return { acquired: true, execution: created };
    } catch (err: any) {
      // Unique constraint violation P2002 means lock record already exists
      if (err.code !== "P2002") {
        throw err;
      }

      // 2. Inspect existing record
      const existing = await this.prisma.jobExecution.findUnique({
        where: {
          jobName_logicalDate: {
            jobName,
            logicalDate,
          },
        },
      });

      if (!existing) {
        return { acquired: false, reason: "CURRENTLY_RUNNING" };
      }

      // Already finished cleanly
      if (existing.status === "COMPLETED") {
        return { acquired: false, reason: "ALREADY_COMPLETED" };
      }

      // Max attempts exceeded
      if (existing.attemptCount >= maxAttempts && existing.status !== "RUNNING") {
        return { acquired: false, reason: "MAX_ATTEMPTS_EXCEEDED" };
      }

      // If running, check for stale crash timeout
      if (existing.status === "RUNNING") {
        const isStale = now.getTime() - existing.startedAt.getTime() > staleLockTimeoutMs;
        if (!isStale) {
          return { acquired: false, reason: "CURRENTLY_RUNNING" };
        }

        // Steal stale lock (crashed worker recovery)
        const updated = await this.prisma.jobExecution.update({
          where: { id: existing.id },
          data: {
            startedAt: now,
            attemptCount: existing.attemptCount + 1,
            lastError: `Previous run timed out after ${Math.round(staleLockTimeoutMs / 60000)}m. Lease recovered.`,
            status: "RUNNING",
          },
        });
        return { acquired: true, execution: updated };
      }

      // Check if scheduled retry is due
      if (existing.status === "RETRY_PENDING" || existing.status === "FAILED") {
        if (existing.nextRetryAt && existing.nextRetryAt.getTime() > now.getTime()) {
          return { acquired: false, reason: "RETRY_NOT_DUE" };
        }

        // Claim retry
        const updated = await this.prisma.jobExecution.update({
          where: { id: existing.id },
          data: {
            startedAt: now,
            attemptCount: existing.attemptCount + 1,
            status: "RUNNING",
          },
        });
        return { acquired: true, execution: updated };
      }

      return { acquired: false, reason: "CURRENTLY_RUNNING" };
    }
  }

  async markCompleted(
    id: string,
    metadata?: Record<string, unknown>
  ): Promise<JobExecution> {
    return this.prisma.jobExecution.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        metadata: (metadata as any) ?? undefined,
      },
    });
  }

  async markFailed(
    id: string,
    error: string,
    retryDelaySeconds: number = 60,
    maxAttempts: number = 3
  ): Promise<JobExecution> {
    const existing = await this.prisma.jobExecution.findUniqueOrThrow({
      where: { id },
    });

    const isExhausted = existing.attemptCount >= maxAttempts;
    const status = isExhausted ? "RETRY_FAILED" : "RETRY_PENDING";
    const nextRetryAt = isExhausted
      ? null
      : new Date(Date.now() + retryDelaySeconds * 1000 * Math.pow(2, existing.attemptCount - 1));

    return this.prisma.jobExecution.update({
      where: { id },
      data: {
        status,
        lastError: error,
        nextRetryAt,
      },
    });
  }

  async findByJobAndDate(
    jobName: string,
    logicalDate: Date
  ): Promise<JobExecution | null> {
    return this.prisma.jobExecution.findUnique({
      where: {
        jobName_logicalDate: {
          jobName,
          logicalDate,
        },
      },
    });
  }

  async listExecutions(limit = 50): Promise<JobExecution[]> {
    return this.prisma.jobExecution.findMany({
      take: limit,
      orderBy: { startedAt: "desc" },
    });
  }

  async getOperationalSummary() {
    const totalCount = await this.prisma.jobExecution.count();
    const runningCount = await this.prisma.jobExecution.count({ where: { status: "RUNNING" } });
    const failedCount = await this.prisma.jobExecution.count({
      where: { status: { in: ["FAILED", "RETRY_FAILED"] } },
    });
    const retryPendingCount = await this.prisma.jobExecution.count({
      where: { status: "RETRY_PENDING" },
    });
    const completedCount = await this.prisma.jobExecution.count({
      where: { status: "COMPLETED" },
    });

    const recentExecutions = await this.listExecutions(20);

    return {
      totalCount,
      runningCount,
      failedCount,
      retryPendingCount,
      completedCount,
      successRatePercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100,
      recentExecutions,
    };
  }
}
