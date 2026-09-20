import type { PrismaClient } from "@prisma/client";
import { PrismaLifeAreaRepository } from "../repositories/life-area.repository";
import { NotFoundError } from "../lib/errors";
import type {
  CreateLifeAreaRequestDTO,
  UpdateLifeAreaRequestDTO,
  LifeAreaResponseDTO,
} from "../dtos/life-area.dto";
import type { AreaIntensity } from "../domain/types";

export class LifeAreaApplicationService {
  private repo: PrismaLifeAreaRepository;

  constructor(private prisma: PrismaClient) {
    this.repo = new PrismaLifeAreaRepository(prisma);
  }

  async listLifeAreas(actorUserId: string): Promise<LifeAreaResponseDTO[]> {
    const areas = await this.repo.findByUser(actorUserId);
    return areas.map(a => ({
      id: a.id,
      userId: a.userId,
      type: a.type,
      name: a.name,
      intensity: a.intensity,
      color: a.color,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  async getLifeAreaById(actorUserId: string, id: string): Promise<LifeAreaResponseDTO> {
    const area = await this.repo.findById(id);
    if (!area || area.userId !== actorUserId) {
      throw new NotFoundError(`Life Area "${id}" not found.`);
    }
    return {
      id: area.id,
      userId: area.userId,
      type: area.type,
      name: area.name,
      intensity: area.intensity,
      color: area.color,
      createdAt: area.createdAt.toISOString(),
      updatedAt: area.updatedAt.toISOString(),
    };
  }

  async createLifeArea(actorUserId: string, data: CreateLifeAreaRequestDTO): Promise<LifeAreaResponseDTO> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Life Area name cannot be empty.");
    }
    const created = await this.repo.create({
      userId: actorUserId,
      type: data.type,
      name: data.name.trim(),
      intensity: data.intensity ?? "NORMAL",
      color: data.color ?? "#06b6d4",
    });

    return {
      id: created.id,
      userId: created.userId,
      type: created.type,
      name: created.name,
      intensity: created.intensity,
      color: created.color,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateLifeArea(
    actorUserId: string,
    id: string,
    data: UpdateLifeAreaRequestDTO
  ): Promise<LifeAreaResponseDTO> {
    await this.getLifeAreaById(actorUserId, id); // ownership check

    const updated = await this.prisma.lifeArea.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.intensity ? { intensity: data.intensity } : {}),
        ...(data.color ? { color: data.color } : {}),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      name: updated.name,
      intensity: updated.intensity,
      color: updated.color,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updateIntensity(id: string, intensity: AreaIntensity) {
    return this.repo.updateIntensity(id, intensity);
  }

  /**
   * Business Rule: Cannot delete a Life Area if active goals exist under it.
   */
  async deleteLifeArea(actorUserIdOrId: string, maybeId?: string): Promise<{ success: boolean }> {
    const id = maybeId ?? actorUserIdOrId;
    const actorUserId = maybeId ? actorUserIdOrId : undefined;

    if (actorUserId) {
      await this.getLifeAreaById(actorUserId, id);
    }

    const activeGoalsCount = await this.prisma.goal.count({
      where: {
        areaId: id,
        isArchived: false,
      },
    });

    if (activeGoalsCount > 0) {
      throw new Error(
        `Cannot delete Life Area: ${activeGoalsCount} active goal(s) exist under this area. Archive or reassign goals first.`
      );
    }

    await this.prisma.lifeArea.delete({
      where: { id },
    });

    return { success: true };
  }
}