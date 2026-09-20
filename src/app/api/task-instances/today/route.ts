import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../../services/task-instance-app.service.js";
import { handleApiError } from "../../../../lib/errors.js";

const service = new TaskInstanceApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const instances = await service.getTodayInstances(actorUserId);
    return NextResponse.json(instances);
  } catch (err: any) {
    return handleApiError(err);
  }
}
