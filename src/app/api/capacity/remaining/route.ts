import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { CapacityApplicationService } from "../../../../services/capacity-app.service";
import { handleApiError } from "../../../../lib/errors";

const service = new CapacityApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const remaining = await service.getRemainingCapacity(actorUserId, date);
    return NextResponse.json(remaining);
  } catch (err: any) {
    return handleApiError(err);
  }
}
