import type {
  ActiveProfile,
  Connectivity,
  ContextFit,
  ExecutionCandidateSource,
  ExecutionDevice,
  ExecutionEnvironment,
} from "../domain/execution/execution-decision-engine";
import type { EnergyLevel, Priority } from "../domain/types";

export interface ExecutionRecommendationQueryDTO {
  environment?: ExecutionEnvironment;
  device?: ExecutionDevice;
  availableMinutes?: number;
  energy?: EnergyLevel;
  connectivity?: Connectivity;
}

export interface ExecutionRecommendationItemDTO {
  id: string;
  title: string;
  source: ExecutionCandidateSource;
  score: number;
  contextFit: ContextFit;
  reasons: string[];
  durationMinutes: number;
  priority: Priority;
  energyRequired: EnergyLevel;
  taskInstanceId?: string;
}

export interface ExecutionRecommendationResponseDTO {
  activeProfile: ActiveProfile;
  context: {
    environment: ExecutionEnvironment;
    device: ExecutionDevice;
    availableMinutes: number;
    energy: EnergyLevel;
    connectivity: Connectivity;
    todayDateKey: string;
  };
  primary: ExecutionRecommendationItemDTO | null;
  alternatives: ExecutionRecommendationItemDTO[];
  telemetry: {
    candidateCount: number;
    executableCount: number;
  };
}
