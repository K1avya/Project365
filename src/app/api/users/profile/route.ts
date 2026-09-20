import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { handleApiError } from "../../../../lib/errors.js";
import { ActiveProfile } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();

    const { activeProfile } = body;
    
    // Map from frontend IDs to DB Enums
    const profileMap: Record<string, ActiveProfile> = {
      regular: ActiveProfile.REGULAR,
      exam: ActiveProfile.EXAM_PREP,
      hackathon: ActiveProfile.HACKATHON,
      placement: ActiveProfile.PLACEMENT,
      vacation: ActiveProfile.VACATION,
    };

    const enumValue = profileMap[activeProfile];

    if (!enumValue) {
      return NextResponse.json({ error: "Invalid active profile" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: actorUserId },
      data: { activeProfile: enumValue },
      select: { activeProfile: true }
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return handleApiError(err);
  }
}
