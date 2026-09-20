export interface CapacityRemainingResponseDto {
  remainingMinutes: number;
  remainingHours: number;
  plannedMinutes: number;
  commitmentMinutes: number;
  availableMinutes: number;
}

export interface DailyCapacityReportDto {
  date: string;
  status?: "AVAILABLE" | "HISTORICAL_DATA_UNAVAILABLE";
  grossHours?: number;
  committedHours?: number;
  discretionaryHours?: number;
  plannedHours?: number;
  overloadHours?: number;
  utilizationPercent?: number;
  isOverloaded?: boolean;
  commitmentsCount?: number;
  tasksCount?: number;
  warning?: string;
  message?: string;
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
