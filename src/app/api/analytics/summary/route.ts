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
    const range = (url.searchParams.get("range") || "7d") as "7d" | "30d" | "90d";
    const summary = await service.getAnalyticsSummary(actorUserId, range);
    return NextResponse.json(summary);
  } catch (err: any) {
    return handleApiError(err);
  }
}
