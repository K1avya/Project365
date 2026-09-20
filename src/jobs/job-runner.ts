import type { PrismaClient } from "@prisma/client";
import { PrismaJobExecutionRepository } from "../repositories/job-execution.repository";
import { logger } from "../lib/logger";

export interface JobExecutionResult {
  ran: boolean;
  jobName: string;
  logicalDate: string;
  success?: boolean;
  skipReason?: string;
  error?: string;
  attemptCount?: number;
  metadata?: Record<string, unknown>;
  elapsedMs?: number;
}

export interface JobOptions {
  maxAttempts?: number;
  staleTimeoutMs?: number;
  retryDelaySeconds?: number;
}

export class JobRunner {
  private lockRepo: PrismaJobExecutionRepository;

  constructor(private prisma: PrismaClient) {
    this.lockRepo = new PrismaJobExecutionRepository(prisma);
  }

  /**
   * Executes a job with cluster-safe distributed locking and failure recovery.
   */
  async executeJob(
    jobName: string,
    logicalDate: Date,
    handler: () => Promise<Record<string, unknown> | void>,
    options?: JobOptions
  ): Promise<JobExecutionResult> {
    const dateStr = logicalDate.toISOString().slice(0, 10);
    const maxAttempts = options?.maxAttempts ?? 3;
    const timeoutMs = options?.staleTimeoutMs ?? 10 * 60 * 1000;
    const retryDelaySeconds = options?.retryDelaySeconds ?? 60;

    const lockResult = await this.lockRepo.claimLock(jobName, logicalDate, timeoutMs, maxAttempts);

    if (!lockResult.acquired) {
      logger.info(`[JobRunner] ${jobName} skipped for ${dateStr}: ${lockResult.reason}`, {
        jobName,
        logicalDate: dateStr,
        reason: lockResult.reason,
      });
      return {
        ran: false,
        jobName,
        logicalDate: dateStr,
        skipReason: lockResult.reason,
      };
    }

    const execution = lockResult.execution;
    const start = performance.now();
    logger.info(`[JobRunner] ${jobName} started (Attempt #${execution.attemptCount})`, {
      jobName,
      logicalDate: dateStr,
      attempt: execution.attemptCount,
    });

    try {
      const output = await handler();
      const elapsedMs = Number((performance.now() - start).toFixed(2));
      const metadata = (output as Record<string, unknown>) ?? {};

      await this.lockRepo.markCompleted(execution.id, { ...metadata, elapsedMs });

      logger.info(`[JobRunner] ${jobName} completed successfully in ${elapsedMs}ms`, {
        jobName,
        logicalDate: dateStr,
        elapsedMs,
      });

      return {
        ran: true,
        jobName,
        logicalDate: dateStr,
        success: true,
        attemptCount: execution.attemptCount,
        metadata,
        elapsedMs,
      };
    } catch (err: any) {
      const elapsedMs = Number((performance.now() - start).toFixed(2));
      logger.error(`[JobRunner] ${jobName} execution failed: ${err.message}`, err, {
        jobName,
        logicalDate: dateStr,
        attempt: execution.attemptCount,
        elapsedMs,
      });

      await this.lockRepo.markFailed(execution.id, err.message, retryDelaySeconds, maxAttempts);

      return {
        ran: true,
        jobName,
        logicalDate: dateStr,
        success: false,
        attemptCount: execution.attemptCount,
        error: err.message,
        elapsedMs,
      };
    }
  }
}
