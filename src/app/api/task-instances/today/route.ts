import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { TaskInstanceApplicationService } from "../../../../services/task-instance-app.service";
import { handleApiError } from "../../../../lib/errors";

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
