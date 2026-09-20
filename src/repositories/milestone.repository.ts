import type { PrismaClient, Milestone as PrismaMilestone } from "@prisma/client";

export interface CreateMilestoneInput {
  goalId: string;
  title: string;
  description?: string | null;
  orderIndex?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string | null;
  orderIndex?: number;
  isCompleted?: boolean;
  isArchived?: boolean;
}

export interface IMilestoneRepository {
  findById(id: string): Promise<PrismaMilestone | null>;
  findByGoalId(goalId: string, includeArchived?: boolean): Promise<PrismaMilestone[]>;
  create(data: CreateMilestoneInput): Promise<PrismaMilestone>;
  update(id: string, data: UpdateMilestoneInput): Promise<PrismaMilestone>;
  archive(id: string): Promise<PrismaMilestone>;
  restore(id: string): Promise<PrismaMilestone>;
  delete(id: string): Promise<boolean>;
}

export class PrismaMilestoneRepository implements IMilestoneRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaMilestone | null> {
    return this.prisma.milestone.findUnique({
      where: { id },
      include: { tasks: true },
    });
  }

  async findByGoalId(goalId: string, includeArchived = false): Promise<PrismaMilestone[]> {
    return this.prisma.milestone.findMany({
      where: {
        goalId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { tasks: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  async create(data: CreateMilestoneInput): Promise<PrismaMilestone> {
    return this.prisma.milestone.create({
      data: {
        goalId: data.goalId,
        title: data.title,
        description: data.description ?? null,
        orderIndex: data.orderIndex ?? 0,
        isCompleted: false,
        isArchived: false,
      },
    });
  }

  async update(id: string, data: UpdateMilestoneInput): Promise<PrismaMilestone> {
    return this.prisma.milestone.update({
      where: { id },
      data,
    });
  }

  async archive(id: string): Promise<PrismaMilestone> {
    return this.prisma.milestone.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async restore(id: string): Promise<PrismaMilestone> {
    return this.prisma.milestone.update({
      where: { id },
      data: { isArchived: false },
    });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.prisma.milestone.delete({
      where: { id },
    });
    return Boolean(deleted);
  }
}