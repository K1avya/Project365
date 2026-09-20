import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { GoalApplicationService } from "../../../../services/goal-app.service.js";
import { handleApiError } from "../../../../lib/errors.js";

const service = new GoalApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const goal = await service.getGoalById(actorUserId, id);
    return NextResponse.json(goal);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateGoal(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.deleteGoal(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return handleApiError(err);
  }
}
