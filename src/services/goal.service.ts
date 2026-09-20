import type { PrismaClient } from "@prisma/client";
import type { CreateGoalWithMilestonesRequestDTO, GoalResponseDTO } from "../dtos/goal.dto";

export class GoalService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Atomically creates a Goal alongside its initial Milestones within a single database transaction.
   */
  async createGoalWithMilestones(
    userId: string,
    dto: CreateGoalWithMilestonesRequestDTO
  ): Promise<GoalResponseDTO> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error("Goal title cannot be empty.");
    }

    return this.prisma.$transaction(async tx => {
      const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;

      const goal = await tx.goal.create({
        data: {
          userId,
          areaId: dto.areaId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          targetDate,
          isCompleted: false,
          isArchived: false,
        },
      });

      const milestones = [];
      if (dto.milestones && dto.milestones.length > 0) {
        for (let i = 0; i < dto.milestones.length; i++) {
          const m = dto.milestones[i];
          const createdM = await tx.milestone.create({
            data: {
              goalId: goal.id,
              title: m.title.trim(),
              description: m.description?.trim() ?? null,
              orderIndex: m.orderIndex ?? i + 1,
              isCompleted: false,
              isArchived: false,
            },
          });
          milestones.push(createdM);
        }
      }

      return {
        id: goal.id,
        userId: goal.userId,
        areaId: goal.areaId,
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
        isCompleted: goal.isCompleted,
        isArchived: goal.isArchived,
        milestones: milestones.map(m => ({
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
    });
  }
}