export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EnergyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type LifeAreaType = 'ACADEMIC' | 'STARTUP' | 'CAREER_CODING' | 'HEALTH' | 'PERSONAL';

export type AreaIntensity = 'INTENSIVE' | 'NORMAL' | 'MINIMAL' | 'PAUSED';

export type CommitmentType = 'COLLEGE' | 'COMMUTE' | 'FAMILY' | 'GYM_HEALTH' | 'ROUTINE_MEALS' | 'CUSTOM';

export type TaskStatus = 'BLOCKED' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'MISSED' | 'PAUSED' | 'CANCELLED';

export type TaskEventType =
  | 'CREATED'
  | 'SCHEDULED'
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED'
  | 'ARCHIVED';

/**
 * Task Template (Rule 2: MUST NOT have a status attribute)
 */
export interface Task {
  id: string;
  userId: string;
  areaId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  preferredMinute?: number | null; // 0..1439
  isDeepWork: boolean;
  recurrenceDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;          // Dependent task (blocked until prerequisite completes)
  dependsOnTaskId: string; // Prerequisite task
  createdAt: Date;
}

/**
 * Daily Realization of a Task (Carries execution status)
 */
export interface TaskInstance {
  id: string;
  userId: string;
  taskId: string;
  date: Date;              // Native Date
  title: string;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  isDeepWork: boolean;
  startMinute?: number | null;
  endMinute?: number | null;
  status: TaskStatus;
  actualMinutes: number;
  pausedMs: number;
  metrics?: Record<string, unknown> | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Immutable Event-Sourced Ledger Entry (Rule 1)
 */
export interface TaskEvent {
  id: string;
  taskInstanceId: string;
  eventType: TaskEventType;
  payload?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  type: CommitmentType;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  recurrenceDays: number[];
  isMandatory: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  areaId: string;
  title: string;
  description?: string | null;
  targetDate?: Date | null;
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
