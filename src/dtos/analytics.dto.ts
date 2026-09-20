/**
 * Life OS Analytics DTO Contracts
 * Grounded in real-world execution telemetry rather than vanity activity streaks.
 */

export type UtilizationHealth = "UNDER_COMMITTED" | "HEALTHY_FLOW" | "OVERLOAD_WARNING" | "CRITICAL_BURNOUT";

export interface ExecutionRateDto {
  periodDays: number;
  totalTasksScheduled: number;
  completedTasks: number;
  missedTasks: number;
  activeTasks: number;
  blockedTasks: number;
  taskCompletionPercent: number; // by count
  plannedMinutesTotal: number;
  actualMinutesTotal: number;
  timeExecutionPercent: number; // by duration
}

export interface CapacityUtilizationDto {
  periodDays: number;
  totalDiscretionaryMinutes: number;
  totalPlannedMinutes: number;
  utilizationPercent: number;
  healthClassification: UtilizationHealth;
  overloadedDaysCount: number;
  safeBufferDaysCount: number;
}

export interface PlanningAccuracyDto {
  periodDays: number;
  baselinePlannedHours: number;
  actualExecutedHours: number;
  varianceHours: number;
  accuracyScore: number; // 0..100%
  revisionCountTotal: number;
}

export interface AnalyticsSummaryDto {
  actorUserId: string;
  range: string;
  executionRate: ExecutionRateDto;
  capacityUtilization: CapacityUtilizationDto;
  planningAccuracy: PlanningAccuracyDto;
  backlogDelta: {
    createdCount: number;
    completedCount: number;
    netChange: number;
  };
  generatedAt: string;
}
