import type {
  PrismaClient,
  WeeklyPlan as PrismaWeeklyPlan,
  WeeklyPlanRevision as PrismaWeeklyPlanRevision,
} from "@prisma/client";

export interface CreateWeeklyPlanInput {
  userId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  grossAvailableHours: number;
  committedHours: number;
  netAvailableHours: number;
  plannedHours: number;
  changeReason?: string;
  snapshotPayload?: Record<string, unknown>;
}

export interface AddRevisionInput {
  weeklyPlanId: string;
  grossAvailableHours: number;
  committedHours: number;
  netAvailableHours: number;
  plannedHours: number;
  actualHours?: number;
  isOverloaded?: boolean;
  overloadHours?: number;
  changeReason?: string;
  snapshotPayload?: Record<string, unknown>;
}

export interface IWeeklyPlanRepository {
  findByUserAndWeek(userId: string, weekStartDate: Date): Promise<PrismaWeeklyPlan | null>;
  createWithInitialRevision(data: CreateWeeklyPlanInput): Promise<PrismaWeeklyPlan>;
  addRevision(data: AddRevisionInput): Promise<PrismaWeeklyPlanRevision>;
  getRevisions(weeklyPlanId: string): Promise<PrismaWeeklyPlanRevision[]>;
}

export class PrismaWeeklyPlanRepository implements IWeeklyPlanRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserAndWeek(userId: string, weekStartDate: Date): Promise<PrismaWeeklyPlan | null> {
    return this.prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate,
        },
      },
      include: {
        revisions: {
          orderBy: { version: "asc" },
        },
      },
    });
  }

  async createWithInitialRevision(data: CreateWeeklyPlanInput): Promise<PrismaWeeklyPlan> {
    const isOverloaded = data.plannedHours > data.netAvailableHours;
    const overloadHours = Math.max(0, data.plannedHours - data.netAvailableHours);

    return this.prisma.$transaction(async tx => {
      const plan = await tx.weeklyPlan.create({
        data: {
          userId: data.userId,
          weekStartDate: data.weekStartDate,
          weekEndDate: data.weekEndDate,
          currentVersion: 1,
          status: "ACTIVE",
        },
      });

      await tx.weeklyPlanRevision.create({
        data: {
          weeklyPlanId: plan.id,
          version: 1,
          grossAvailableHours: data.grossAvailableHours,
          committedHours: data.committedHours,
          netAvailableHours: data.netAvailableHours,
          plannedHours: data.plannedHours,
          actualHours: 0,
          isOverloaded,
          overloadHours,
          changeReason: data.changeReason ?? "Baseline Sunday Plan",
          snapshotPayload: (data.snapshotPayload as any) ?? null,
        },
      });

      return plan;
    });
  }

  async addRevision(data: AddRevisionInput): Promise<PrismaWeeklyPlanRevision> {
    return this.prisma.$transaction(async tx => {
      const plan = await tx.weeklyPlan.findUniqueOrThrow({
        where: { id: data.weeklyPlanId },
      });

      const nextVersion = plan.currentVersion + 1;
      const isOverloaded = data.isOverloaded ?? data.plannedHours > data.netAvailableHours;
      const overloadHours = data.overloadHours ?? Math.max(0, data.plannedHours - data.netAvailableHours);

      const revision = await tx.weeklyPlanRevision.create({
        data: {
          weeklyPlanId: data.weeklyPlanId,
          version: nextVersion,
          grossAvailableHours: data.grossAvailableHours,
          committedHours: data.committedHours,
          netAvailableHours: data.netAvailableHours,
          plannedHours: data.plannedHours,
          actualHours: data.actualHours ?? 0,
          isOverloaded,
          overloadHours,
          changeReason: data.changeReason ?? `Plan Revision v${nextVersion}`,
          snapshotPayload: (data.snapshotPayload as any) ?? null,
        },
      });

      await tx.weeklyPlan.update({
        where: { id: data.weeklyPlanId },
        data: { currentVersion: nextVersion },
      });

      return revision;
    });
  }

  async getRevisions(weeklyPlanId: string): Promise<PrismaWeeklyPlanRevision[]> {
    return this.prisma.weeklyPlanRevision.findMany({
      where: { weeklyPlanId },
      orderBy: { version: "asc" },
    });
  }
}