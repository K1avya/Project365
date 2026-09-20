import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { MilestoneApplicationService } from "../../../../services/milestone-app.service.js";
import { handleApiError } from "../../../../lib/errors.js";

const service = new MilestoneApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const milestone = await service.getMilestoneById(actorUserId, id);
    return NextResponse.json(milestone);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateMilestone(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.deleteMilestone(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return handleApiError(err);
  }
}
