import type { PrismaClient } from "@prisma/client";
import { PrismaMilestoneRepository } from "../repositories/milestone.repository.js";
import { NotFoundError } from "../lib/errors.js";
import type {
  CreateMilestoneRequestDTO,
  UpdateMilestoneRequestDTO,
  MilestoneResponseDTO,
} from "../dtos/milestone.dto.js";

export class MilestoneApplicationService {
  private repo: PrismaMilestoneRepository;

  constructor(private prisma: PrismaClient) {
    this.repo = new PrismaMilestoneRepository(prisma);
  }

  async listMilestones(actorUserId: string, goalId: string, includeArchived = false): Promise<MilestoneResponseDTO[]> {
    // Validate goal belongs to actor
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });
    if (!goal || goal.userId !== actorUserId) {
      throw new Error("Unauthorized or Goal not found.");
    }

    const milestones = await this.repo.findByGoalId(goalId, includeArchived);
    return milestones.map(m => ({
      id: m.id,
      goalId: m.goalId,
      title: m.title,
      description: m.description,
      orderIndex: m.orderIndex,
      isCompleted: m.isCompleted,
      isArchived: m.isArchived,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  async getMilestoneById(actorUserId: string, id: string): Promise<MilestoneResponseDTO> {
    const milestone = await this.repo.findById(id);
    if (!milestone) {
      throw new NotFoundError(`Milestone "${id}" not found.`);
    }

    const goal = await this.prisma.goal.findUnique({
      where: { id: milestone.goalId },
    });
    if (!goal || goal.userId !== actorUserId) {
      throw new NotFoundError(`Milestone "${id}" not found.`);
    }

    return {
      id: milestone.id,
      goalId: milestone.goalId,
      title: milestone.title,
      description: milestone.description,
      orderIndex: milestone.orderIndex,
      isCompleted: milestone.isCompleted,
      isArchived: milestone.isArchived,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
    };
  }

  async createMilestone(actorUserId: string, input: CreateMilestoneRequestDTO): Promise<MilestoneResponseDTO> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Milestone title cannot be empty.");
    }

    const goal = await this.prisma.goal.findUnique({
      where: { id: input.goalId },
    });
    if (!goal || goal.userId !== actorUserId) {
      throw new Error("Unauthorized or Goal not found.");
    }

    const created = await this.repo.create({
      goalId: input.goalId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      orderIndex: input.orderIndex ?? 0,
    });

    return {
      id: created.id,
      goalId: created.goalId,
      title: created.title,
      description: created.description,
      orderIndex: created.orderIndex,
      isCompleted: created.isCompleted,
      isArchived: created.isArchived,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateMilestone(
    actorUserId: string,
    id: string,
    input: UpdateMilestoneRequestDTO
  ): Promise<MilestoneResponseDTO> {
    await this.getMilestoneById(actorUserId, id); // ownership check

    const updated = await this.repo.update(id, input);
    return {
      id: updated.id,
      goalId: updated.goalId,
      title: updated.title,
      description: updated.description,
      orderIndex: updated.orderIndex,
      isCompleted: updated.isCompleted,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteMilestone(actorUserId: string, id: string): Promise<MilestoneResponseDTO> {
    await this.getMilestoneById(actorUserId, id); // ownership check
    const archived = await this.repo.archive(id);
    return {
      id: archived.id,
      goalId: archived.goalId,
      title: archived.title,
      description: archived.description,
      orderIndex: archived.orderIndex,
      isCompleted: archived.isCompleted,
      isArchived: archived.isArchived,
      createdAt: archived.createdAt.toISOString(),
      updatedAt: archived.updatedAt.toISOString(),
    };
  }
}