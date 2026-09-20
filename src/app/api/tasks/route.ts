import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { TaskApplicationService } from "../../../services/task-app.service.js";
import { handleApiError } from "../../../lib/errors.js";

const service = new TaskApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const tasks = await service.listTasks(actorUserId, includeArchived);
    return NextResponse.json(tasks);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createTask(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
