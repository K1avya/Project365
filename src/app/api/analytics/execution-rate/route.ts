import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { AnalyticsApplicationService } from "../../../../services/analytics-app.service.js";
import { handleApiError } from "../../../../lib/errors.js";

const service = new AnalyticsApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7", 10);
    const result = await service.getExecutionRate(actorUserId, days);
    return NextResponse.json(result);
  } catch (err: any) {
    return handleApiError(err);
  }
}
