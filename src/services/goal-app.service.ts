import type { PrismaClient } from "@prisma/client";
import { PrismaGoalRepository } from "../repositories/goal.repository.js";
import { PrismaMilestoneRepository } from "../repositories/milestone.repository.js";
import type { GoalResponseDTO, MilestoneResponseDTO } from "../dtos/goal.dto.js";
import { NotFoundError } from "../lib/errors.js";

export class GoalApplicationService {
  private goalRepo: PrismaGoalRepository;
  private milestoneRepo: PrismaMilestoneRepository;

  constructor(private prisma: PrismaClient) {
    this.goalRepo = new PrismaGoalRepository(prisma);
    this.milestoneRepo = new PrismaMilestoneRepository(prisma);
  }

  async listGoals(actorUserId: string, includeArchived = false): Promise<GoalResponseDTO[]> {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId: actorUserId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        milestones: {
          where: includeArchived ? {} : { isArchived: false },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return goals.map(g => this.mapToDTO(g));
  }

  async getGoalById(actorUserId: string, id: string): Promise<GoalResponseDTO> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!goal || goal.userId !== actorUserId) {
      throw new NotFoundError(`Goal "${id}" not found.`);
    }

    return this.mapToDTO(goal);
  }

  async createGoal(
    actorUserId: string,
    data: { areaId: string; title: string; description?: string | null; targetDate?: string | Date | null }
  ): Promise<GoalResponseDTO> {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Goal title cannot be empty.");
    }

    // Verify area belongs to actor
    const area = await this.prisma.lifeArea.findUnique({
      where: { id: data.areaId },
    });
    if (!area || area.userId !== actorUserId) {
      throw new Error("Unauthorized or Life Area not found.");
    }

    const targetDate = data.targetDate
      ? (typeof data.targetDate === "string" ? new Date(data.targetDate) : data.targetDate)
      : null;

    const created = await this.goalRepo.create({
      userId: actorUserId,
      areaId: data.areaId,
      title: data.title.trim(),
      description: data.description?.trim() ?? null,
      targetDate,
    });

    return this.getGoalById(actorUserId, created.id);
  }

  async updateGoal(
    actorUserId: string,
    id: string,
    data: { title?: string; description?: string | null; targetDate?: string | Date | null; isCompleted?: boolean }
  ): Promise<GoalResponseDTO> {
    await this.getGoalById(actorUserId, id); // ownership check

    const targetDate = data.targetDate !== undefined
      ? (data.targetDate ? (typeof data.targetDate === "string" ? new Date(data.targetDate) : data.targetDate) : null)
      : undefined;

    await this.goalRepo.update(id, {
      title: data.title?.trim(),
      description: data.description?.trim() ?? null,
      targetDate,
      isCompleted: data.isCompleted,
    });

    return this.getGoalById(actorUserId, id);
  }

  /**
   * Business Rule: Goals are archived (soft-deleted) by default to protect historical analytics.
   */
  async deleteGoal(actorUserId: string, id: string): Promise<GoalResponseDTO> {
    await this.getGoalById(actorUserId, id); // ownership check
    await this.goalRepo.archive(id);
    return this.getGoalById(actorUserId, id);
  }

  async restoreGoal(actorUserId: string, id: string): Promise<GoalResponseDTO> {
    await this.getGoalById(actorUserId, id); // ownership check
    await this.goalRepo.restore(id);
    return this.getGoalById(actorUserId, id);
  }

  private mapToDTO(goal: any): GoalResponseDTO {
    return {
      id: goal.id,
      userId: goal.userId,
      areaId: goal.areaId,
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
      isCompleted: goal.isCompleted,
      isArchived: goal.isArchived,
      milestones: (goal.milestones || []).map((m: any) => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
        isCompleted: m.isCompleted,
        isArchived: m.isArchived,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}