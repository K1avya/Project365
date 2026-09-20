import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { CapacityApplicationService } from "../../../services/capacity-app.service.js";
import { handleApiError } from "../../../lib/errors.js";

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
