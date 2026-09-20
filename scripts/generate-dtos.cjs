const fs = require('fs');

const authContent = `import { prisma } from "./prisma.js";

/**
 * Authentication Boundary:
 * Extracts or resolves the actor's user ID for the current request context.
 * In production, this verifies JWT/session cookies. For local dev/MVP,
 * it inspects the 'x-user-id' header or falls back to the default seeded user.
 */
export async function getCurrentUserId(request?: Request): Promise<string> {
  if (request) {
    const headerUserId = request.headers.get("x-user-id");
    if (headerUserId && headerUserId.trim().length > 0) {
      return headerUserId.trim();
    }
  }

  // Fallback to default seeded user
  const user = await prisma.user.findFirst({
    where: { email: "student@project365.local" },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  // Upsert fallback
  const fallback = await prisma.user.upsert({
    where: { email: "student@project365.local" },
    update: {},
    create: {
      email: "student@project365.local",
      name: "Engineering Scholar",
      dayStartHour: 6,
      logicalDayCutoffHour: 1,
      dailySleepHours: 7.0,
    },
    select: { id: true },
  });

  return fallback.id;
}
`;

const capacityDtoContent = `export interface CapacityRemainingResponseDto {
  remainingMinutes: number;
  remainingHours: number;
  plannedMinutes: number;
  commitmentMinutes: number;
  availableMinutes: number;
}

export interface DailyCapacityReportDto {
  date: string;
  grossHours: number;
  committedHours: number;
  discretionaryHours: number;
  plannedHours: number;
  overloadHours: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  commitmentsCount: number;
  tasksCount: number;
  warning?: string;
}

export interface WeeklyCapacitySnapshotDto {
  date: string;
  grossMinutes: number;
  commitmentMinutes: number;
  discretionaryMinutes: number;
  plannedMinutes: number;
  overloadMinutes: number;
}

export interface WeeklyCapacityReportDto {
  weekStartDate: string;
  weekEndDate: string;
  daysCount: number;
  snapshots: WeeklyCapacitySnapshotDto[];
}
`;

const eventDtoContent = `import type { TaskEventType } from "../domain/types.js";

export interface RecordTaskEventRequestDTO {
  eventType: TaskEventType;
  payload?: Record<string, unknown> | null;
  timestamp?: string; // ISO
}

export interface TaskEventResponseDTO {
  id: string;
  taskInstanceId: string;
  eventType: TaskEventType;
  payload: Record<string, unknown> | null;
  createdAt: string; // ISO
}
`;

const taskDtoContent = `import type { Priority, EnergyLevel, TaskStatus } from "../domain/types.js";
import type { TaskEventResponseDTO } from "./event.dto.js";

export interface CreateTaskRequestDTO {
  areaId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  priority?: Priority;
  energyRequired?: EnergyLevel;
  durationMinutes: number;
  preferredMinute?: number | null;
  isDeepWork?: boolean;
  recurrenceDays?: number[];
  dependsOnTaskIds?: string[];
}

export interface UpdateTaskRequestDTO {
  title?: string;
  description?: string | null;
  priority?: Priority;
  energyRequired?: EnergyLevel;
  durationMinutes?: number;
  preferredMinute?: number | null;
  isDeepWork?: boolean;
  recurrenceDays?: number[];
  milestoneId?: string | null;
}

export interface TaskResponseDTO {
  id: string;
  userId: string;
  areaId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  preferredMinute: number | null;
  isDeepWork: boolean;
  recurrenceDays: number[];
  isArchived: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface UpdateTaskStatusRequestDTO {
  status: TaskStatus;
  actualMinutes?: number;
  pausedMs?: number;
  metrics?: Record<string, unknown> | null;
  expectedUpdatedAt?: string;
  expectedStatus?: TaskStatus;
}

export interface TaskInstanceResponseDTO {
  id: string;
  userId: string;
  taskId: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  isDeepWork: boolean;
  startMinute: number | null;
  endMinute: number | null;
  status: TaskStatus;
  actualMinutes: number;
  pausedMs: number;
  metrics: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  areaId?: string;
  areaName?: string;
  areaColor?: string;
  events?: TaskEventResponseDTO[];
  prerequisites?: Array<{ id: string; title: string; isCompleted: boolean }>;
}
`;

fs.writeFileSync('src/lib/auth.ts', authContent, 'utf8');
fs.writeFileSync('src/dtos/capacity.dto.ts', capacityDtoContent, 'utf8');
fs.writeFileSync('src/dtos/event.dto.ts', eventDtoContent, 'utf8');
fs.writeFileSync('src/dtos/task.dto.ts', taskDtoContent, 'utf8');
console.log('Clean DTOs and auth generated successfully');