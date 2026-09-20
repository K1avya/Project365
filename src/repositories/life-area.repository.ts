import type { PrismaClient, LifeArea as PrismaLifeArea } from "@prisma/client";
import type { LifeAreaType, AreaIntensity } from "../domain/types";

export interface CreateLifeAreaInput {
  userId: string;
  type: LifeAreaType;
  name: string;
  intensity?: AreaIntensity;
  color?: string;
}

export interface ILifeAreaRepository {
  findById(id: string): Promise<PrismaLifeArea | null>;
  findByUser(userId: string): Promise<PrismaLifeArea[]>;
  findByUserAndType(userId: string, type: LifeAreaType): Promise<PrismaLifeArea | null>;
  create(data: CreateLifeAreaInput): Promise<PrismaLifeArea>;
  updateIntensity(id: string, intensity: AreaIntensity): Promise<PrismaLifeArea>;
  createDefaultAreas(userId: string): Promise<PrismaLifeArea[]>;
}

export class PrismaLifeAreaRepository implements ILifeAreaRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaLifeArea | null> {
    return this.prisma.lifeArea.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: string): Promise<PrismaLifeArea[]> {
    return this.prisma.lifeArea.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });
  }

  async findByUserAndType(userId: string, type: LifeAreaType): Promise<PrismaLifeArea | null> {
    return this.prisma.lifeArea.findUnique({
      where: {
        userId_type: { userId, type },
      },
    });
  }

  async create(data: CreateLifeAreaInput): Promise<PrismaLifeArea> {
    return this.prisma.lifeArea.create({
      data: {
        userId: data.userId,
        type: data.type,
        name: data.name,
        intensity: data.intensity ?? "NORMAL",
        color: data.color ?? "#06b6d4",
      },
    });
  }

  async updateIntensity(id: string, intensity: AreaIntensity): Promise<PrismaLifeArea> {
    return this.prisma.lifeArea.update({
      where: { id },
      data: { intensity },
    });
  }

  async createDefaultAreas(userId: string): Promise<PrismaLifeArea[]> {
    const defaults: Array<{ type: LifeAreaType; name: string; color: string }> = [
      { type: "ACADEMIC", name: "Academic & College", color: "#3b82f6" },
      { type: "STARTUP", name: "Startup & Innovation", color: "#8b5cf6" },
      { type: "CAREER_CODING", name: "Career & Coding (DSA/AI)", color: "#06b6d4" },
      { type: "HEALTH", name: "Health & Vitality", color: "#10b981" },
      { type: "PERSONAL", name: "Personal Growth & Ops", color: "#f59e0b" },
    ];

    const results: PrismaLifeArea[] = [];
    for (const d of defaults) {
      const area = await this.prisma.lifeArea.upsert({
        where: {
          userId_type: { userId, type: d.type },
        },
        update: {},
        create: {
          userId,
          type: d.type,
          name: d.name,
          color: d.color,
          intensity: "NORMAL",
        },
      });
      results.push(area);
    }
    return results;
  }
}