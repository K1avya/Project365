import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { OnboardingService } from "../../../../services/onboarding.service";
import { enforceRateLimit } from "../../../../lib/rate-limiter";

const onboardingService = new OnboardingService(prisma);

export async function POST(req: Request) {
  try {
    // 1. Rate limiting: max 5 registration requests per 15 minutes
    const rateLimitError = enforceRateLimit(req, "/api/auth/register", {
      maxRequests: 5,
      windowSeconds: 15 * 60,
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    // 2. Input validation
    const body = await req.json().catch(() => ({}));
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters in length." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Existing user check (Google OAuth vs Credentials separation)
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.passwordHash === null) {
        return NextResponse.json(
          { error: "An account already exists using Google login. Please sign in with Google." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "User already exists with this email address." },
        { status: 409 }
      );
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. Create user record
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: typeof name === "string" && name.trim().length > 0 ? name.trim() : null,
        passwordHash,
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });

    // 6. Idempotently bootstrap initial onboarding defaults
    await onboardingService.bootstrapNewUser(user.id);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        message: "User registered successfully.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
