import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../../lib/auth.js";
import { prisma } from "../../../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../../../services/task-instance-app.service.js";
import { handleApiError } from "../../../../../lib/errors.js";

const service = new TaskInstanceApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const events = await service.getEventsForInstance(actorUserId, id);
    return NextResponse.json(events);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const recorded = await service.recordEvent(actorUserId, id, body.eventType, body.payload);
    return NextResponse.json(recorded, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
