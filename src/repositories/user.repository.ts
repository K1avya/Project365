import type { PrismaClient, User as PrismaUser } from "@prisma/client";

export interface CreateUserInput {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  startDate?: Date;
  logicalDayCutoffHour?: number;
  dayStartHour?: number;
  dailySleepHours?: number;
  collegeLatitude?: number | null;
  collegeLongitude?: number | null;
  collegeRadiusMeters?: number;
}

export interface IUserRepository {
  findById(id: string): Promise<PrismaUser | null>;
  findByEmail(email: string): Promise<PrismaUser | null>;
  create(data: CreateUserInput): Promise<PrismaUser>;
  update(id: string, data: Partial<CreateUserInput>): Promise<PrismaUser>;
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { energyProfile: true, lifeAreas: true },
    });
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { energyProfile: true, lifeAreas: true },
    });
  }

  async create(data: CreateUserInput): Promise<PrismaUser> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        passwordHash: data.passwordHash ?? null,
        startDate: data.startDate ?? new Date(),
        logicalDayCutoffHour: data.logicalDayCutoffHour ?? 1,
        dayStartHour: data.dayStartHour ?? 6,
        dailySleepHours: data.dailySleepHours ?? 7.0,
        collegeLatitude: data.collegeLatitude ?? null,
        collegeLongitude: data.collegeLongitude ?? null,
        collegeRadiusMeters: data.collegeRadiusMeters ?? 250,
      },
    });
  }

  async update(id: string, data: Partial<CreateUserInput>): Promise<PrismaUser> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}