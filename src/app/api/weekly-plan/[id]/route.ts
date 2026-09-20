import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const plan = await prisma.weeklyPlan.findUniqueOrThrow({
      where: { id },
      include: {
        revisions: {
          orderBy: { version: "asc" },
        },
      },
    });

    if (plan.userId !== actorUserId) {
      return NextResponse.json({ error: "Weekly plan not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: plan.id,
      userId: plan.userId,
      weekStartDate: plan.weekStartDate.toISOString().slice(0, 10),
      weekEndDate: plan.weekEndDate.toISOString().slice(0, 10),
      currentVersion: plan.currentVersion,
      status: plan.status,
      revisions: plan.revisions.map(r => ({
        version: r.version,
        grossAvailableHours: r.grossAvailableHours,
        committedHours: r.committedHours,
        netAvailableHours: r.netAvailableHours,
        plannedHours: r.plannedHours,
        actualHours: r.actualHours,
        isOverloaded: r.isOverloaded,
        overloadHours: r.overloadHours,
        changeReason: r.changeReason,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
