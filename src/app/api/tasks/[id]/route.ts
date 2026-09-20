import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { TaskApplicationService } from "../../../../services/task-app.service";
import { handleApiError } from "../../../../lib/errors";

const service = new TaskApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const task = await service.getTaskById(actorUserId, id);
    return NextResponse.json(task);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateTask(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.archiveTask(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return handleApiError(err);
  }
}
