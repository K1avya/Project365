import { prisma } from "./prisma";
import { UnauthorizedError } from "./errors";


import { auth } from "../auth";

/**
 * Authentication Boundary:
 * Resolves the authenticated user ID for the current request.
 * Enforces PostgreSQL database session verification (Auth.js database strategy).
 */
export async function getCurrentUserId(request?: Request): Promise<string> {
  // 1. Check NextAuth Session
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // 2. Automated test environment bypass (preserves test suite isolation)
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    if (request) {
      const headerUserId = request.headers.get("x-user-id");
      if (headerUserId && headerUserId.trim().length > 0) {
        return headerUserId.trim();
      }
    }

    // Default test user fallback in test runner
    const testUser = await prisma.user.findFirst({
      where: { email: "student@project365.local" },
      select: { id: true },
    });
    if (testUser) {
      return testUser.id;
    }
  }

  // 3. Local dogfood auto-login bypass (if DOGFOOD_AUTO_LOGIN is set to true in .env)
  if (process.env.DOGFOOD_AUTO_LOGIN === "true") {
    const dogfoodUser = await prisma.user.findFirst({
      where: { email: process.env.DOGFOOD_EMAIL || "user@project365.local" },
      select: { id: true },
    });
    if (dogfoodUser) {
      return dogfoodUser.id;
    }
  }

  // 4. Unauthenticated access in production
  throw new UnauthorizedError("Authentication required. Please sign in.");
}
