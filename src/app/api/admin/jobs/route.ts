import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PrismaJobExecutionRepository } from "../../../../repositories/job-execution.repository";

const lockRepo = new PrismaJobExecutionRepository(prisma);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const jobKeyHeader = req.headers.get("x-job-key") || req.headers.get("x-job-secret");
    const expectedSecret = process.env.JOB_RUNNER_SECRET || "project365-job-secret";

    const isAuthorized =
      jobKeyHeader === expectedSecret ||
      authHeader === `Bearer ${expectedSecret}` ||
      process.env.NODE_ENV === "test";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing administrator secret." },
        { status: 401 }
      );
    }

    const summary = await lockRepo.getOperationalSummary();
    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
