import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { LifeAreaApplicationService } from "../../../services/life-area-app.service.js";
import { handleApiError } from "../../../lib/errors.js";

const service = new LifeAreaApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const areas = await service.listLifeAreas(actorUserId);
    return NextResponse.json(areas);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createLifeArea(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
