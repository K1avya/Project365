import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import { TimezoneService } from "../../../domain/time/timezone-service.js";

export async function GET() {
  const startTime = performance.now();
  let dbConnected = false;
  let dbLatencyMs = 0;
  let pendingWeeklyPlans = 0;
  let staleSnapshots = 0;

  try {
    // 1. Measure DB ping latency
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Math.round(performance.now() - dbStart);
    dbConnected = true;

    // 2. Query pending weekly plans
    pendingWeeklyPlans = await prisma.weeklyPlan.count({
      where: { status: "ACTIVE" },
    });

    // 3. Detect stale snapshots (yesterday without snapshot for active users)
    const yesterdayDate = TimezoneService.toLogicalCalendarDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      0,
      "UTC"
    );

    const userCount = await prisma.user.count();
    const recordedSnapshotsYesterday = await prisma.capacitySnapshot.count({
      where: { date: yesterdayDate },
    });
    staleSnapshots = Math.max(0, userCount - recordedSnapshotsYesterday);

    // 4. Query background job health telemetry
    const runningJobsCount = await prisma.jobExecution.count({ where: { status: "RUNNING" } });
    const failedJobsCount = await prisma.jobExecution.count({
      where: { status: { in: ["FAILED", "RETRY_FAILED"] } },
    });
    const totalJobsCount = await prisma.jobExecution.count();
    const jobSuccessRate =
      totalJobsCount > 0
        ? Math.round(
            ((await prisma.jobExecution.count({ where: { status: "COMPLETED" } })) / totalJobsCount) *
              100
          )
        : 100;

    const isHealthy = dbConnected && dbLatencyMs < 500 && failedJobsCount === 0;

    const payload = {
      status: isHealthy ? "healthy" : "degraded",
      database: {
        connected: dbConnected,
        latencyMs: dbLatencyMs,
      },
      jobs: {
        running: runningJobsCount,
        failed: failedJobsCount,
        successRatePercent: jobSuccessRate,
      },
      schemaVersion: "20260919000001",
      uptimeSeconds: Math.floor(process.uptime()),
      pendingWeeklyPlans,
      staleSnapshots,
    };

    logger.debug("Health check executed", { latencyMs: dbLatencyMs });

    return NextResponse.json(payload, {
      status: isHealthy ? 200 : 503,
    });
  } catch (err: any) {
    logger.error("Health check failed", err);

    return NextResponse.json(
      {
        status: "unhealthy",
        database: {
          connected: false,
          latencyMs: Math.round(performance.now() - startTime),
        },
        schemaVersion: "20260919000001",
        uptimeSeconds: Math.floor(process.uptime()),
        pendingWeeklyPlans: 0,
        staleSnapshots: 0,
        error: err.message,
      },
      { status: 503 }
    );
  }
}
