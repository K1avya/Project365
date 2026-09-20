import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { LifeAreaApplicationService } from "../../../../services/life-area-app.service";
import { handleApiError } from "../../../../lib/errors";

const service = new LifeAreaApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const area = await service.getLifeAreaById(actorUserId, id);
    return NextResponse.json(area);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateLifeArea(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const result = await service.deleteLifeArea(actorUserId, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return handleApiError(err);
  }
}
