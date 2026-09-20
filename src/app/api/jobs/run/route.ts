import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma.js";
import { runGenerateDailyInstancesJob } from "../../../../jobs/generate-daily-instances.job.js";
import { runCreateCapacitySnapshotsJob } from "../../../../jobs/create-capacity-snapshots.job.js";
import { runStaleTaskDetectorJob } from "../../../../jobs/stale-task-detector.job.js";
import { runWeeklyReviewJob } from "../../../../jobs/weekly-review.job.js";
import { enforceRateLimit } from "../../../../lib/rate-limiter.js";

const VALID_JOBS = [
  "generate-daily-instances",
  "create-capacity-snapshots",
  "stale-task-detector",
  "weekly-review",
] as const;

type ValidJobName = (typeof VALID_JOBS)[number];

export async function POST(req: Request) {
  try {
    // 0. Rate limiting check (20 requests per minute)
    const rateLimitResponse = enforceRateLimit(req, "/api/jobs/run", {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 1. Authorization check
    const authHeader = req.headers.get("authorization");
    const jobKeyHeader = req.headers.get("x-job-key") || req.headers.get("x-job-secret");
    const expectedSecret = process.env.JOB_RUNNER_SECRET || "project365-job-secret";

    const isAuthorized =
      jobKeyHeader === expectedSecret ||
      authHeader === `Bearer ${expectedSecret}` ||
      process.env.NODE_ENV === "test";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing job runner secret." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { jobName, targetDate } = body;

    if (!jobName || typeof jobName !== "string") {
      return NextResponse.json(
        { error: `Missing required field "jobName". Valid jobs: ${VALID_JOBS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_JOBS.includes(jobName as ValidJobName)) {
      return NextResponse.json(
        { error: `Unknown jobName "${jobName}". Valid jobs are: ${VALID_JOBS.join(", ")}` },
        { status: 400 }
      );
    }

    // 3. Dispatch job with cluster-safe distributed locking
    let result;
    switch (jobName as ValidJobName) {
      case "generate-daily-instances":
        result = await runGenerateDailyInstancesJob(prisma, targetDate);
        break;
      case "create-capacity-snapshots":
        result = await runCreateCapacitySnapshotsJob(prisma, targetDate);
        break;
      case "stale-task-detector":
        result = await runStaleTaskDetectorJob(prisma, targetDate);
        break;
      case "weekly-review":
        result = await runWeeklyReviewJob(prisma, targetDate);
        break;
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
