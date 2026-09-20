import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { WeeklyReviewApplicationService } from "../../../services/weekly-review-app.service";
import { handleApiError } from "../../../lib/errors";

const service = new WeeklyReviewApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const weekStartDate = url.searchParams.get("weekStartDate");

    if (!weekStartDate) {
      return NextResponse.json(
        { error: "Query parameter 'weekStartDate' (YYYY-MM-DD) is required." },
        { status: 400 }
      );
    }

    const report = await service.evaluateWeeklyReview(actorUserId, {
      weekStartDate,
    });
    return NextResponse.json(report);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();

    if (!body.weekStartDate) {
      return NextResponse.json(
        { error: "Field 'weekStartDate' (YYYY-MM-DD) is required." },
        { status: 400 }
      );
    }

    const report = await service.evaluateWeeklyReview(actorUserId, body);
    return NextResponse.json(report, { status: 201 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
