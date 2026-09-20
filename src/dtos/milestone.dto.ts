export interface CreateMilestoneRequestDTO {
  goalId: string;
  title: string;
  description?: string | null;
  orderIndex?: number;
}

export interface UpdateMilestoneRequestDTO {
  title?: string;
  description?: string | null;
  orderIndex?: number;
  isCompleted?: boolean;
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
