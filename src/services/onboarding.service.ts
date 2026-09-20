import type { PrismaClient } from "@prisma/client";

export class OnboardingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Idempotent Onboarding Bootstrap:
   * Initializes default Life Areas, Energy Profile, and day boundaries.
   * Running this multiple times produces the exact same final state with zero duplicates.
   */
  async bootstrapNewUser(userId: string) {
    return this.prisma.$transaction(async tx => {
      // 1. Verify user exists
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`Cannot bootstrap onboarding: User "${userId}" does not exist.`);
      }

      // 2. Idempotently provision default Life Areas
      const defaultAreas = [
        { type: "ACADEMIC" as const, name: "Academic & Learning", color: "#3b82f6" },
        { type: "STARTUP" as const, name: "Startup & Projects", color: "#8b5cf6" },
        { type: "HEALTH" as const, name: "Health & Personal", color: "#10b981" },
      ];

      const createdAreas = [];
      for (const area of defaultAreas) {
        const record = await tx.lifeArea.upsert({
          where: {
            userId_type: {
              userId,
              type: area.type,
            },
          },
          update: {},
          create: {
            userId,
            type: area.type,
            name: area.name,
            color: area.color,
            intensity: "NORMAL",
          },
        });
        createdAreas.push(record);
      }

      // 3. Idempotently provision Energy Profile
      const energyProfile = await tx.energyProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          peakEnergyStartMinute: 360,   // 06:00 AM
          peakEnergyEndMinute: 540,     // 09:00 AM
          secondaryPeakStartMinute: 1260, // 09:00 PM
          secondaryPeakEndMinute: 1410,   // 11:30 PM
          troughStartMinute: 810,       // 01:30 PM
          troughEndMinute: 960,         // 04:00 PM
        },
      });

      return {
        userId,
        lifeAreas: createdAreas,
        energyProfile,
      };
    });
  }
}
