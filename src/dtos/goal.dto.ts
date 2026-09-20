export interface CreateMilestoneItemDTO {
  title: string;
  description?: string | null;
  orderIndex?: number;
}

export interface CreateGoalWithMilestonesRequestDTO {
  areaId: string;
  title: string;
  description?: string | null;
  targetDate?: string | null; // "YYYY-MM-DD"
  milestones?: CreateMilestoneItemDTO[];
}

export interface MilestoneResponseDTO {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalResponseDTO {
  id: string;
  userId: string;
  areaId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  isCompleted: boolean;
  isArchived: boolean;
  milestones: MilestoneResponseDTO[];
  createdAt: string;
  updatedAt: string;
}