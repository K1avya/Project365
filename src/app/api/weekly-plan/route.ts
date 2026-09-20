import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { WeeklyPlanningService } from "../../../services/weekly-planning.service.js";
import { handleApiError } from "../../../lib/errors.js";

const service = new WeeklyPlanningService(prisma);

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const result = await service.runSundayRealityCheck({
      userId: actorUserId,
      weekStartDate: new Date(body.weekStartDate),
      plannedTasks: body.plannedTasks || [],
      forceOverride: body.forceOverride,
      changeReason: body.changeReason,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
