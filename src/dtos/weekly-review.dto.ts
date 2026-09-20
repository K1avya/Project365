/**
 * Life OS Weekly Review & Sunday Reality Check DTO Contracts
 */

export interface TopBottleneckDto {
  taskId: string;
  title: string;
  reason: "HIGH_PAUSE_DURATION" | "MISSED_TASK" | "BLOCKED_DEPENDENCY";
  details: string;
}

export interface SubmitWeeklyReviewRequestDto {
  weekStartDate: string; // "YYYY-MM-DD"
  reflectionNotes?: string;
  safetyFactor?: number; // Defaults to 1.10
}

export interface WeeklyReviewReportDto {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  plannedHours: number;
  actualHours: number;
  executionRatePercent: number;
  planningAccuracyPercent: number;
  availableDiscretionaryHours: number;
  recommendedHoursNextWeek: number;
  safetyFactor: number;
  topBottlenecks: TopBottleneckDto[];
  backlogCreated: number;
  backlogCleared: number;
  reflectionNotes?: string | null;
  reviewedAt: string;
}
