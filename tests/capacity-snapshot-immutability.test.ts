import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { CapacityApplicationService } from "../src/services/capacity-app.service.js";
import { TimezoneService } from "../src/domain/time/timezone-service.js";

describe("Historical Capacity Snapshot Immutability Gate (Required Change #1)", () => {
  let userId: string;
  let service: CapacityApplicationService;

  beforeAll(async () => {
    service = new CapacityApplicationService(prisma);

    // Setup isolated test user
    const user = await prisma.user.create({
      data: {
        email: `snapshot-immutability-${Date.now()}@project365.local`,
        name: "Snapshot Test User",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0, // 17h waking = 1020m
      },
    });
    userId = user.id;

    // Create a commitment: 6 hours (360m)
    await prisma.commitment.create({
      data: {
        userId,
        title: "Fixed Lab Session",
        type: "COLLEGE",
        startMinute: 540,
        endMinute: 900,
        durationMinutes: 360,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  });

  afterAll(async () => {
    await prisma.capacitySnapshot.deleteMany({ where: { userId } });
    await prisma.commitment.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns HISTORICAL_DATA_UNAVAILABLE when querying past date without stored snapshot", async () => {
    // 30 days in the past
    const pastDate = TimezoneService.parseCalendarDate("2026-08-01");
    const report = await service.getTodayCapacity(userId, pastDate);

    expect(report.status).toBe("HISTORICAL_DATA_UNAVAILABLE");
    expect(report.date).toBe("2026-08-01");
    expect(report.message).toContain("Historical capacity snapshot was not recorded");
  });

  it("returns stored snapshot directly when historical snapshot exists", async () => {
    const historicalDate = TimezoneService.parseCalendarDate("2026-08-15");

    // Pre-record an immutable historical snapshot (e.g. 5 hours committed, 3 hours planned)
    await prisma.capacitySnapshot.create({
      data: {
        userId,
        date: historicalDate,
        grossMinutes: 1020,
        commitmentMinutes: 300, // 5h
        discretionaryMinutes: 720, // 12h
        plannedMinutes: 180, // 3h
        overloadMinutes: 0,
      },
    });

    const report = await service.getTodayCapacity(userId, historicalDate);

    expect(report.status).toBe("AVAILABLE");
    expect(report.date).toBe("2026-08-15");
    expect(report.committedHours).toBe(5.0);
    expect(report.plannedHours).toBe(3.0);
    expect(report.discretionaryHours).toBe(12.0);
    expect(report.isOverloaded).toBe(false);
  });

  it("guarantees that mutating current commitments today does NOT alter historical snapshot values", async () => {
    const historicalDate = TimezoneService.parseCalendarDate("2026-08-15");

    // Add a massive new commitment today (e.g. 8 hours)
    const newCommitment = await prisma.commitment.create({
      data: {
        userId,
        title: "Intensive 8h Hackathon Shift",
        type: "CUSTOM",
        startMinute: 600,
        endMinute: 1080,
        durationMinutes: 480,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });

    // Query historical snapshot again
    const reportAfterMutation = await service.getTodayCapacity(userId, historicalDate);

    // Stored snapshot must remain COMPLETELY UNCHANGED (5.0h committed, NOT 5.0h + 8.0h)
    expect(reportAfterMutation.status).toBe("AVAILABLE");
    expect(reportAfterMutation.committedHours).toBe(5.0);
    expect(reportAfterMutation.plannedHours).toBe(3.0);

    // Clean up added commitment
    await prisma.commitment.delete({ where: { id: newCommitment.id } });
  });

  it("evaluates today dynamically and captures snapshot in database", async () => {
    const today = new Date();
    const todayStr = TimezoneService.toLogicalDateString(today, 1, "UTC");

    const report = await service.getTodayCapacity(userId, today);
    expect(report.status).toBe("AVAILABLE");
    expect(report.committedHours).toBe(6.0); // The 360m commitment
    expect(report.discretionaryHours).toBe(11.0); // 17h waking - 6h = 11h

    // Verify snapshot was recorded in database for today
    const storedSnapshot = await prisma.capacitySnapshot.findUnique({
      where: {
        userId_date: {
          userId,
          date: TimezoneService.parseCalendarDate(todayStr),
        },
      },
    });

    expect(storedSnapshot).not.toBeNull();
    expect(storedSnapshot!.commitmentMinutes).toBe(360);
  });
});
