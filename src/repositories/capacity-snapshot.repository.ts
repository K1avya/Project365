import type { PrismaClient, CapacitySnapshot } from "@prisma/client";

export interface UpsertCapacitySnapshotInput {
  userId: string;
  date: Date;
  grossMinutes: number;
  commitmentMinutes: number;
  discretionaryMinutes: number;
  plannedMinutes: number;
  overloadMinutes: number;
}

export interface ICapacitySnapshotRepository {
  upsert(data: UpsertCapacitySnapshotInput): Promise<CapacitySnapshot>;
  findByUserAndDate(userId: string, date: Date): Promise<CapacitySnapshot | null>;
  findRange(userId: string, startDate: Date, endDate: Date): Promise<CapacitySnapshot[]>;
  getOverloadedDays(userId: string, startDate: Date, endDate: Date): Promise<CapacitySnapshot[]>;
}

export class PrismaCapacitySnapshotRepository implements ICapacitySnapshotRepository {
  constructor(private prisma: PrismaClient) {}

  async upsert(data: UpsertCapacitySnapshotInput): Promise<CapacitySnapshot> {
    return this.prisma.capacitySnapshot.upsert({
      where: {
        userId_date: {
          userId: data.userId,
          date: data.date,
        },
      },
      update: {
        grossMinutes: data.grossMinutes,
        commitmentMinutes: data.commitmentMinutes,
        discretionaryMinutes: data.discretionaryMinutes,
        plannedMinutes: data.plannedMinutes,
        overloadMinutes: data.overloadMinutes,
      },
      create: {
        userId: data.userId,
        date: data.date,
        grossMinutes: data.grossMinutes,
        commitmentMinutes: data.commitmentMinutes,
        discretionaryMinutes: data.discretionaryMinutes,
        plannedMinutes: data.plannedMinutes,
        overloadMinutes: data.overloadMinutes,
      },
    });
  }

  async findByUserAndDate(userId: string, date: Date): Promise<CapacitySnapshot | null> {
    return this.prisma.capacitySnapshot.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  }

  async findRange(userId: string, startDate: Date, endDate: Date): Promise<CapacitySnapshot[]> {
    return this.prisma.capacitySnapshot.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });
  }

  async getOverloadedDays(userId: string, startDate: Date, endDate: Date): Promise<CapacitySnapshot[]> {
    return this.prisma.capacitySnapshot.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        overloadMinutes: { gt: 0 },
      },
      orderBy: { date: "asc" },
    });
  }
}