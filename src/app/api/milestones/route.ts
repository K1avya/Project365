import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { MilestoneApplicationService } from "../../../services/milestone-app.service.js";
import { handleApiError } from "../../../lib/errors.js";

const service = new MilestoneApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const goalId = url.searchParams.get("goalId");
    if (!goalId) {
      return NextResponse.json({ error: "Missing goalId query parameter." }, { status: 400 });
    }
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const milestones = await service.listMilestones(actorUserId, goalId, includeArchived);
    return NextResponse.json(milestones);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createMilestone(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
