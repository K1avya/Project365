import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { POST as registerRoute } from "../src/app/api/auth/register/route.js";
import { OnboardingService } from "../src/services/onboarding.service.js";
import { handleApiError, UnauthorizedError } from "../src/lib/errors.js";

describe("Authentication Boundary & Idempotent Onboarding Gate", () => {
  const testEmail = `auth-test-${Date.now()}@project365.local`;
  const rawPassword = "StrongSecurePassword2026!";
  let createdUserId: string;

  afterAll(async () => {
    // Clean up created test user
    if (createdUserId) {
      await prisma.energyProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.lifeArea.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
  });

  describe("POST /api/auth/register", () => {
    it("successfully registers user with hashed password and bootstraps onboarding", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.10.1",
        },
        body: JSON.stringify({
          email: testEmail,
          password: rawPassword,
          name: "Auth Test Engineer",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.email).toBe(testEmail);
      createdUserId = json.id;

      // Verify password was hashed in database (never stored in plaintext)
      const dbUser = await prisma.user.findUnique({
        where: { id: createdUserId },
      });
      expect(dbUser?.passwordHash).not.toBeNull();
      expect(dbUser?.passwordHash).not.toBe(rawPassword);

      const isPasswordValid = await bcrypt.compare(rawPassword, dbUser!.passwordHash!);
      expect(isPasswordValid).toBe(true);

      // Verify onboarding was triggered and created exactly 3 default Life Areas
      const areas = await prisma.lifeArea.findMany({
        where: { userId: createdUserId },
      });
      expect(areas.length).toBe(3);

      const areaTypes = areas.map(a => a.type);
      expect(areaTypes).toContain("ACADEMIC");
      expect(areaTypes).toContain("STARTUP");
      expect(areaTypes).toContain("HEALTH");
    });

    it("rejects registration with short password (< 8 characters)", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.10.2",
        },
        body: JSON.stringify({
          email: "short-pass@test.com",
          password: "short",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("at least 8 characters");
    });

    it("rejects duplicate email registration with HTTP 409 Conflict", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.10.3",
        },
        body: JSON.stringify({
          email: testEmail,
          password: "AnotherPassword123!",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toContain("already exists");
    });
  });

  describe("Idempotent Onboarding Verification", () => {
    it("running onboarding bootstrap 5 times produces identical state with 0 duplicates", async () => {
      const onboardingService = new OnboardingService(prisma);

      // Call 5 times consecutively
      for (let i = 0; i < 5; i++) {
        await onboardingService.bootstrapNewUser(createdUserId);
      }

      // Assert exactly 3 Life Areas exist
      const areas = await prisma.lifeArea.findMany({
        where: { userId: createdUserId },
      });
      expect(areas.length).toBe(3);

      // Assert exactly 1 Energy Profile exists
      const energyProfile = await prisma.energyProfile.findUnique({
        where: { userId: createdUserId },
      });
      expect(energyProfile).not.toBeNull();
      expect(energyProfile?.peakEnergyStartMinute).toBe(360);
    });
  });

  describe("HTTP 401 Unauthorized Error Mapping via handleApiError", () => {
    it("returns HTTP 401 with informative payload on UnauthorizedError", async () => {
      const res = handleApiError(new UnauthorizedError("Authentication required. Please sign in."));
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe("Authentication required. Please sign in.");
    });
  });
});
