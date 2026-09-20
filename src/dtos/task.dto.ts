import type { Priority, EnergyLevel, TaskStatus } from "../domain/types";
import type { TaskEventResponseDTO } from "./event.dto";

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
