import type { PrismaClient, Goal as PrismaGoal } from "@prisma/client";

export interface CreateGoalInput {
  userId: string;
  areaId: string;
  title: string;
  description?: string | null;
  targetDate?: Date | null;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  targetDate?: Date | null;
  isCompleted?: boolean;
  isArchived?: boolean;
}

export interface IGoalRepository {
  findById(id: string): Promise<PrismaGoal | null>;
  findByUserId(userId: string, includeArchived?: boolean): Promise<PrismaGoal[]>;
  findByAreaId(areaId: string, includeArchived?: boolean): Promise<PrismaGoal[]>;
  create(data: CreateGoalInput): Promise<PrismaGoal>;
  update(id: string, data: UpdateGoalInput): Promise<PrismaGoal>;
  archive(id: string): Promise<PrismaGoal>;
  restore(id: string): Promise<PrismaGoal>;
  delete(id: string): Promise<boolean>;
}

export class PrismaGoalRepository implements IGoalRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaGoal | null> {
    return this.prisma.goal.findUnique({
      where: { id },
      include: { milestones: true },
    });
  }

  async findByUserId(userId: string, includeArchived = false): Promise<PrismaGoal[]> {
    return this.prisma.goal.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { milestones: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByAreaId(areaId: string, includeArchived = false): Promise<PrismaGoal[]> {
    return this.prisma.goal.findMany({
      where: {
        areaId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { milestones: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateGoalInput): Promise<PrismaGoal> {
    return this.prisma.goal.create({
      data: {
        userId: data.userId,
        areaId: data.areaId,
        title: data.title,
        description: data.description ?? null,
        targetDate: data.targetDate ?? null,
        isCompleted: false,
        isArchived: false,
      },
    });
  }

  async update(id: string, data: UpdateGoalInput): Promise<PrismaGoal> {
    return this.prisma.goal.update({
      where: { id },
      data,
    });
  }

  async archive(id: string): Promise<PrismaGoal> {
    return this.prisma.goal.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async restore(id: string): Promise<PrismaGoal> {
    return this.prisma.goal.update({
      where: { id },
      data: { isArchived: false },
    });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.prisma.goal.delete({
      where: { id },
    });
    return Boolean(deleted);
  }
}