import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { GoalApplicationService } from "../../../services/goal-app.service.js";
import { handleApiError } from "../../../lib/errors.js";

const service = new GoalApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const goals = await service.listGoals(actorUserId, includeArchived);
    return NextResponse.json(goals);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createGoal(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
