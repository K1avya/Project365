import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../../lib/auth.js";
import { prisma } from "../../../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../../../services/task-instance-app.service.js";
import { handleApiError } from "../../../../../lib/errors.js";

const service = new TaskInstanceApplicationService(prisma);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateStatus(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return handleApiError(err);
  }
}
