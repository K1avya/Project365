import type { TaskEventType } from "../domain/types";

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
