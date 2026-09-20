import { Prisma, type PrismaClient } from "@prisma/client";
import type { TaskInstanceResponseDTO } from "../dtos/task.dto.js";
import type { TaskStatus } from "../domain/types.js";

import { NotFoundError, ConcurrencyConflictError } from "../lib/errors.js";

export { ConcurrencyConflictError, NotFoundError };

export interface CompleteTaskAtomicallyOptions {
  actorUserId?: string;
  taskInstanceId: string;
  actualMinutes: number;
  metrics?: Record<string, unknown> | null;
  expectedUpdatedAt?: Date | string;
  expectedStatus?: TaskStatus;
}

export interface CompleteTaskResult {
  completedInstance: TaskInstanceResponseDTO;
  unblockedInstances: TaskInstanceResponseDTO[];
}

export class TaskExecutionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Transaction Boundary Service:
   * Atomically executes in a single database transaction:
   * 1. Validate ownership & idempotency / concurrency preconditions
   * 2. Complete instance
   * 3. Record append-only COMPLETED audit event
   * 4. Unlock downstream tasks whose prerequisites are now satisfied on this date
   * 5. Record/update daily capacity snapshot
   * 6. Commit transaction
   */
  async completeTaskAtomically(
    optsOrId: string | CompleteTaskAtomicallyOptions,
    maybeActualMinutes?: number,
    maybeMetrics?: Record<string, unknown> | null
  ): Promise<CompleteTaskResult> {
    const opts: CompleteTaskAtomicallyOptions =
      typeof optsOrId === "string"
        ? {
            taskInstanceId: optsOrId,
            actualMinutes: maybeActualMinutes ?? 0,
            metrics: maybeMetrics ?? null,
          }
        : optsOrId;

    return this.prisma.$transaction(async tx => {
      // 1. Fetch current instance
      const instance = await tx.taskInstance.findUnique({
        where: { id: opts.taskInstanceId },
        include: { task: true },
      });

      if (!instance || (opts.actorUserId && instance.userId !== opts.actorUserId)) {
        throw new NotFoundError(`TaskInstance "${opts.taskInstanceId}" not found.`);
      }

      // Idempotency & Concurrency check
      if (instance.status === "COMPLETED") {
        throw new ConcurrencyConflictError(`TaskInstance "${opts.taskInstanceId}" is already COMPLETED.`);
      }

      if (opts.expectedStatus && instance.status !== opts.expectedStatus) {
        throw new ConcurrencyConflictError(
          `Expected status "${opts.expectedStatus}" but current status is "${instance.status}".`
        );
      }

      if (opts.expectedUpdatedAt) {
        const expectedMs = new Date(opts.expectedUpdatedAt).getTime();
        const currentMs = instance.updatedAt.getTime();
        if (Math.abs(currentMs - expectedMs) > 1000) {
          throw new ConcurrencyConflictError(
            `Expected version mismatch: task was modified by another operation.`
          );
        }
      }

      const now = new Date();

      // 2. Update status to COMPLETED
      const updated = await tx.taskInstance.update({
        where: { id: opts.taskInstanceId },
        data: {
          status: "COMPLETED",
          actualMinutes: opts.actualMinutes,
          metrics: opts.metrics
            ? (opts.metrics as Prisma.InputJsonValue)
            : instance.metrics === null
            ? Prisma.DbNull
            : (instance.metrics as Prisma.InputJsonValue),
          completedAt: now,
        },
      });

      // 3. Append to Event Ledger (Rule 1)
      await tx.taskEvent.create({
        data: {
          taskInstanceId: instance.id,
          eventType: "COMPLETED",
          payload: { actualMinutes: opts.actualMinutes, ...(opts.metrics || {}) } as Prisma.InputJsonValue,
          createdAt: now,
        },
      });

      // 4. Find dependent tasks that may now be unlocked on this date
      // Query dependencies where dependsOnTaskId == instance.taskId
      const downstreamDeps = await tx.taskDependency.findMany({
        where: { dependsOnTaskId: instance.taskId },
      });

      const unblockedInstances: TaskInstanceResponseDTO[] = [];

      for (const dep of downstreamDeps) {
        // Check if there is a BLOCKED instance for this date
        const dependentInstance = await tx.taskInstance.findFirst({
          where: {
            taskId: dep.taskId,
            date: instance.date,
            status: "BLOCKED",
          },
        });

        if (!dependentInstance) continue;

        // Check if ALL prerequisites for dep.taskId are completed on this date
        const allPrereqs = await tx.taskDependency.findMany({
          where: { taskId: dep.taskId },
        });

        const prereqTaskIds = allPrereqs.map(p => p.dependsOnTaskId);

        const completedPrereqsCount = await tx.taskInstance.count({
          where: {
            taskId: { in: prereqTaskIds },
            date: instance.date,
            status: "COMPLETED",
          },
        });

        if (completedPrereqsCount === prereqTaskIds.length) {
          // All prerequisites satisfied! Transition from BLOCKED to PENDING
          const unblocked = await tx.taskInstance.update({
            where: { id: dependentInstance.id },
            data: { status: "PENDING" },
          });

          await tx.taskEvent.create({
            data: {
              taskInstanceId: unblocked.id,
              eventType: "SCHEDULED",
              payload: { reason: `Prerequisite "${instance.taskId}" completed.` } as Prisma.InputJsonValue,
              createdAt: now,
            },
          });

          unblockedInstances.push({
            id: unblocked.id,
            userId: unblocked.userId,
            taskId: unblocked.taskId,
            date: unblocked.date.toISOString().slice(0, 10),
            title: unblocked.title,
            priority: unblocked.priority,
            energyRequired: unblocked.energyRequired,
            durationMinutes: unblocked.durationMinutes,
            isDeepWork: unblocked.isDeepWork,
            startMinute: unblocked.startMinute,
            endMinute: unblocked.endMinute,
            status: unblocked.status,
            actualMinutes: unblocked.actualMinutes,
            pausedMs: unblocked.pausedMs,
            metrics: (unblocked.metrics as Record<string, unknown>) ?? null,
            completedAt: unblocked.completedAt ? unblocked.completedAt.toISOString() : null,
            createdAt: unblocked.createdAt.toISOString(),
            updatedAt: unblocked.updatedAt.toISOString(),
          });
        }
      }

      // 5. Update/check Capacity Snapshot for this date if it exists
      const existingSnapshot = await tx.capacitySnapshot.findUnique({
        where: {
          userId_date: {
            userId: instance.userId,
            date: instance.date,
          },
        },
      });

      if (existingSnapshot) {
        await tx.capacitySnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            plannedMinutes: existingSnapshot.plannedMinutes,
          },
        });
      }

      return {
        completedInstance: {
          id: updated.id,
          userId: updated.userId,
          taskId: updated.taskId,
          date: updated.date.toISOString().slice(0, 10),
          title: updated.title,
          priority: updated.priority,
          energyRequired: updated.energyRequired,
          durationMinutes: updated.durationMinutes,
          isDeepWork: updated.isDeepWork,
          startMinute: updated.startMinute,
          endMinute: updated.endMinute,
          status: updated.status,
          actualMinutes: updated.actualMinutes,
          pausedMs: updated.pausedMs,
          metrics: (updated.metrics as Record<string, unknown>) ?? null,
          completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        unblockedInstances,
      };
    });
  }
}