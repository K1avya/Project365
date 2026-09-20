import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { CapacityApplicationService } from "../../../services/capacity-app.service";
import { handleApiError } from "../../../lib/errors";

const service = new CapacityApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const commitments = await service.getTodayCommitments(actorUserId);
    return NextResponse.json(commitments);
  } catch (err: any) {
    return handleApiError(err);
  }
}
