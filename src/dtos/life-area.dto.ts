import type { LifeAreaType, AreaIntensity } from "../domain/types";

export interface CreateLifeAreaRequestDTO {
  type: LifeAreaType;
  name: string;
  intensity?: AreaIntensity;
  color?: string;
}

export interface UpdateLifeAreaRequestDTO {
  name?: string;
  intensity?: AreaIntensity;
  color?: string;
}

export interface LifeAreaResponseDTO {
  id: string;
  userId: string;
  type: LifeAreaType;
  name: string;
  intensity: AreaIntensity;
  color: string;
  createdAt: string;
  updatedAt: string;
}
